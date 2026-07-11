use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, SyncSender, TrySendError};
use std::sync::{Arc, Mutex, RwLock};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use super::platform::{default_source, ContextSignalSource};
use super::registry::AppRegistry;
use super::types::{
    ContextProfile, ContextSnapshot, ContextSource, RecordingContext, TargetAppGuard,
};

const DEFAULT_STALE_AFTER: Duration = Duration::from_secs(2);
const DEFAULT_REFRESH_INTERVAL: Duration = Duration::from_secs(1);

#[derive(Clone, Copy, Debug)]
enum RefreshSignal {
    Normal,
    FocusChanged,
    Shutdown,
}

#[derive(Clone, Debug)]
struct CachedContext {
    snapshot: ContextSnapshot,
    target_guard: TargetAppGuard,
}

struct DetectorRuntime {
    shutdown: Arc<AtomicBool>,
    refresh_tx: SyncSender<RefreshSignal>,
    worker: Mutex<Option<JoinHandle<()>>>,
}

impl DetectorRuntime {
    fn stop(&self) {
        if self.shutdown.swap(true, Ordering::SeqCst) {
            return;
        }
        let _ = self.refresh_tx.try_send(RefreshSignal::Shutdown);
        if let Some(worker) = self
            .worker
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .take()
        {
            let _ = worker.join();
        }
    }
}

impl Drop for DetectorRuntime {
    fn drop(&mut self) {
        self.stop();
    }
}

#[derive(Clone)]
pub struct ContextDetectorHandle {
    cached: Arc<RwLock<CachedContext>>,
    refresh_tx: SyncSender<RefreshSignal>,
    _runtime: Arc<DetectorRuntime>,
    source: Arc<dyn ContextSignalSource>,
    stale_after: Duration,
}

impl ContextDetectorHandle {
    pub fn start_default() -> Result<Self, String> {
        let registry = AppRegistry::builtin()?;
        Ok(Self::start_with_source(
            default_source(),
            registry,
            DEFAULT_REFRESH_INTERVAL,
            DEFAULT_STALE_AFTER,
        ))
    }

    pub(crate) fn start_with_source(
        source: Arc<dyn ContextSignalSource>,
        registry: AppRegistry,
        refresh_interval: Duration,
        stale_after: Duration,
    ) -> Self {
        let cached = Arc::new(RwLock::new(CachedContext {
            snapshot: ContextSnapshot {
                profile: ContextProfile::general_native(),
                captured_at: Instant::now(),
            },
            target_guard: TargetAppGuard::default(),
        }));
        let (refresh_tx, refresh_rx) = mpsc::sync_channel(1);
        let shutdown = Arc::new(AtomicBool::new(false));

        let worker_cached = cached.clone();
        let worker_shutdown = shutdown.clone();
        let worker_source = source.clone();
        let worker = std::thread::Builder::new()
            .name("opentypeless-context-detector".to_string())
            .spawn(move || {
                run_detector(
                    worker_source,
                    registry,
                    worker_cached,
                    refresh_rx,
                    worker_shutdown,
                    refresh_interval,
                );
            })
            .expect("failed to start context detector thread");

        let runtime = Arc::new(DetectorRuntime {
            shutdown,
            refresh_tx: refresh_tx.clone(),
            worker: Mutex::new(Some(worker)),
        });

        Self {
            cached,
            refresh_tx,
            _runtime: runtime,
            source,
            stale_after,
        }
    }

    pub fn snapshot_for_recording(&self) -> RecordingContext {
        self.snapshot_for_recording_enabled(true)
    }

    pub fn snapshot_for_recording_enabled(&self, enabled: bool) -> RecordingContext {
        let cached = self
            .cached
            .read()
            .unwrap_or_else(|error| error.into_inner());
        let stale = cached.snapshot.captured_at.elapsed() > self.stale_after;
        let profile = if enabled && !stale {
            cached.snapshot.profile.clone()
        } else {
            fallback_for_profile(&cached.snapshot.profile)
        };
        let target_guard = cached.target_guard.clone();
        drop(cached);

        if stale {
            self.request_refresh();
        }
        RecordingContext {
            profile,
            target_guard,
        }
    }

    pub fn latest_profile(&self) -> ContextProfile {
        self.cached
            .read()
            .unwrap_or_else(|error| error.into_inner())
            .snapshot
            .profile
            .clone()
    }

    pub fn target_still_matches(&self, expected: &TargetAppGuard) -> bool {
        if expected.is_empty() {
            return true;
        }
        let cached = self
            .cached
            .read()
            .unwrap_or_else(|error| error.into_inner());
        cached.snapshot.captured_at.elapsed() <= self.stale_after
            && expected.matches(&cached.target_guard)
    }

    pub fn target_still_matches_now(&self, expected: &TargetAppGuard) -> bool {
        if expected.is_empty() {
            return true;
        }
        self.source
            .collect()
            .map(|signals| expected.matches(&TargetAppGuard::from(&signals)))
            .unwrap_or(false)
    }

    pub fn restore_target_application(&self, expected: &TargetAppGuard) -> bool {
        if expected.is_empty() {
            return false;
        }
        if self.target_still_matches_now(expected) {
            return true;
        }
        if !super::platform::restore_target_application(expected) {
            return false;
        }
        for _ in 0..5 {
            std::thread::sleep(Duration::from_millis(40));
            if self.target_still_matches_now(expected) {
                self.notify_focus_changed();
                return true;
            }
        }
        false
    }

    pub fn notify_focus_changed(&self) {
        let _ = self.refresh_tx.try_send(RefreshSignal::FocusChanged);
    }

    pub fn request_refresh(&self) {
        match self.refresh_tx.try_send(RefreshSignal::Normal) {
            Ok(()) | Err(TrySendError::Full(_)) | Err(TrySendError::Disconnected(_)) => {}
        }
    }

    #[cfg(test)]
    fn replace_cached_for_test(
        &self,
        profile: ContextProfile,
        captured_at: Instant,
        target_guard: TargetAppGuard,
    ) {
        *self
            .cached
            .write()
            .unwrap_or_else(|error| error.into_inner()) = CachedContext {
            snapshot: ContextSnapshot {
                profile,
                captured_at,
            },
            target_guard,
        };
    }

    #[cfg(test)]
    fn shutdown_for_test(&self) {
        self._runtime.stop();
    }
}

fn fallback_for_profile(profile: &ContextProfile) -> ContextProfile {
    if profile.source == ContextSource::BrowserDomain || profile.id == "general.browser" {
        ContextProfile::general_browser()
    } else {
        ContextProfile::general_native()
    }
}

fn run_detector(
    source: Arc<dyn ContextSignalSource>,
    registry: AppRegistry,
    cached: Arc<RwLock<CachedContext>>,
    refresh_rx: Receiver<RefreshSignal>,
    shutdown: Arc<AtomicBool>,
    refresh_interval: Duration,
) {
    refresh_context(source.as_ref(), &registry, &cached);
    let mut last_refresh = Instant::now();

    while !shutdown.load(Ordering::SeqCst) {
        let signal = match refresh_rx.recv_timeout(refresh_interval) {
            Ok(signal) => signal,
            Err(mpsc::RecvTimeoutError::Timeout) => RefreshSignal::Normal,
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        };
        match signal {
            RefreshSignal::Shutdown => break,
            RefreshSignal::FocusChanged => {
                refresh_context(source.as_ref(), &registry, &cached);
                last_refresh = Instant::now();
            }
            RefreshSignal::Normal if last_refresh.elapsed() >= refresh_interval => {
                refresh_context(source.as_ref(), &registry, &cached);
                last_refresh = Instant::now();
            }
            RefreshSignal::Normal => {}
        }
    }
}

fn refresh_context(
    source: &dyn ContextSignalSource,
    registry: &AppRegistry,
    cached: &RwLock<CachedContext>,
) {
    let (profile, target_guard) = match source.collect() {
        Some(signals) => {
            let profile = registry.classify(&signals);
            let target_guard = TargetAppGuard::from(&signals);
            (profile, target_guard)
        }
        None => (ContextProfile::general_native(), TargetAppGuard::default()),
    };

    *cached.write().unwrap_or_else(|error| error.into_inner()) = CachedContext {
        snapshot: ContextSnapshot {
            profile,
            captured_at: Instant::now(),
        },
        target_guard,
    };
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::*;
    use crate::app_detector::types::{ContextSignals, ContextSource};

    struct FakeSource {
        signals: Mutex<Option<ContextSignals>>,
        calls: AtomicUsize,
    }

    impl FakeSource {
        fn new(signals: Option<ContextSignals>) -> Self {
            Self {
                signals: Mutex::new(signals),
                calls: AtomicUsize::new(0),
            }
        }

        fn set(&self, signals: Option<ContextSignals>) {
            *self
                .signals
                .lock()
                .unwrap_or_else(|error| error.into_inner()) = signals;
        }
    }

    impl ContextSignalSource for FakeSource {
        fn collect(&self) -> Option<ContextSignals> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            self.signals
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .clone()
        }
    }

    fn gmail_signals() -> ContextSignals {
        ContextSignals {
            process_id: Some(42),
            native_identity: Some("com.google.Chrome".to_string()),
            process_alias: Some("Google Chrome".to_string()),
            browser_host: Some("mail.google.com".to_string()),
            is_supported_browser: true,
            ..ContextSignals::default()
        }
    }

    fn wait_for_profile(handle: &ContextDetectorHandle, id: &str) {
        let deadline = Instant::now() + Duration::from_secs(1);
        while Instant::now() < deadline {
            if handle.latest_profile().id == id {
                return;
            }
            std::thread::sleep(Duration::from_millis(2));
        }
        panic!("profile {id} was not published");
    }

    fn detector(source: Arc<FakeSource>) -> ContextDetectorHandle {
        ContextDetectorHandle::start_with_source(
            source,
            AppRegistry::builtin().unwrap(),
            Duration::from_millis(50),
            Duration::from_millis(100),
        )
    }

    #[test]
    fn context_snapshot_cache_publishes_focus_refresh_without_blocking_readers() {
        let source = Arc::new(FakeSource::new(Some(gmail_signals())));
        let handle = detector(source.clone());
        wait_for_profile(&handle, "email.gmail");

        source.set(Some(ContextSignals {
            native_identity: Some("com.tinyspeck.slackmacgap".to_string()),
            process_alias: Some("Slack".to_string()),
            process_id: Some(77),
            ..ContextSignals::default()
        }));
        handle.notify_focus_changed();
        wait_for_profile(&handle, "chat.slack");
        let captured = handle.snapshot_for_recording();
        assert_eq!(captured.profile.id, "chat.slack");
        assert_eq!(captured.target_guard.process_id, Some(77));
    }

    #[test]
    fn context_snapshot_cache_stale_snapshot_falls_back_and_schedules_refresh() {
        let source = Arc::new(FakeSource::new(Some(gmail_signals())));
        let handle = detector(source);
        wait_for_profile(&handle, "email.gmail");
        let mut gmail = handle.latest_profile();
        gmail.source = ContextSource::BrowserDomain;
        handle.replace_cached_for_test(
            gmail,
            Instant::now() - Duration::from_secs(3),
            TargetAppGuard {
                process_id: Some(42),
                native_identity: Some("com.google.Chrome".to_string()),
            },
        );

        let captured = handle.snapshot_for_recording();
        assert_eq!(captured.profile.id, "general.browser");
        assert_eq!(captured.target_guard.process_id, Some(42));
    }

    #[test]
    fn context_snapshot_cache_refresh_failure_is_safe_general() {
        let source = Arc::new(FakeSource::new(None));
        let handle = detector(source);
        wait_for_profile(&handle, "general.native");
        assert_eq!(handle.snapshot_for_recording().profile.id, "general.native");
    }

    #[test]
    fn context_snapshot_cache_handles_concurrent_readers() {
        let source = Arc::new(FakeSource::new(Some(gmail_signals())));
        let handle = detector(source);
        wait_for_profile(&handle, "email.gmail");
        let readers = (0..8)
            .map(|_| {
                let handle = handle.clone();
                std::thread::spawn(move || {
                    for _ in 0..1_000 {
                        assert_eq!(handle.snapshot_for_recording().profile.id, "email.gmail");
                    }
                })
            })
            .collect::<Vec<_>>();
        for reader in readers {
            reader.join().unwrap();
        }
    }

    #[test]
    fn context_snapshot_cache_shutdown_is_idempotent() {
        let source = Arc::new(FakeSource::new(Some(gmail_signals())));
        let handle = detector(source);
        handle.shutdown_for_test();
        handle.shutdown_for_test();
    }

    #[test]
    fn recording_start_context_budget_is_below_five_milliseconds_p95() {
        let source = Arc::new(FakeSource::new(Some(gmail_signals())));
        let handle = detector(source);
        wait_for_profile(&handle, "email.gmail");
        let mut samples = Vec::with_capacity(10_000);
        for _ in 0..10_000 {
            let started = Instant::now();
            let captured = handle.snapshot_for_recording();
            samples.push(started.elapsed());
            assert_eq!(captured.profile.id, "email.gmail");
        }
        samples.sort_unstable();
        let p95 = samples[9_499];
        println!("recording_start_context_budget p95={p95:?}");
        assert!(p95 < Duration::from_millis(5));
    }
}
