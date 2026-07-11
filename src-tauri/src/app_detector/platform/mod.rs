use std::sync::Arc;

use super::types::ContextSignals;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

pub(crate) trait ContextSignalSource: Send + Sync + 'static {
    fn collect(&self) -> Option<ContextSignals>;
}

pub(crate) fn default_source() -> Arc<dyn ContextSignalSource> {
    #[cfg(target_os = "macos")]
    {
        Arc::new(macos::MacOsContextSource)
    }
    #[cfg(target_os = "windows")]
    {
        Arc::new(windows::WindowsContextSource)
    }
    #[cfg(target_os = "linux")]
    {
        Arc::new(linux::LinuxContextSource)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Arc::new(UnsupportedContextSource)
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
struct UnsupportedContextSource;

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
impl ContextSignalSource for UnsupportedContextSource {
    fn collect(&self) -> Option<ContextSignals> {
        None
    }
}
