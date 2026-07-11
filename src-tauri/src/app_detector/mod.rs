use serde::{Deserialize, Serialize};

pub mod profiles;
pub mod registry;
pub mod types;

use crate::llm::AppType;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppContext {
    pub app_name: String,
    pub window_title: String,
    pub app_type: AppType,
}

impl Default for AppContext {
    fn default() -> Self {
        Self {
            app_name: String::new(),
            window_title: String::new(),
            app_type: AppType::General,
        }
    }
}

pub fn detect_current_app() -> AppContext {
    #[cfg(target_os = "windows")]
    {
        windows_detect()
    }
    #[cfg(target_os = "macos")]
    {
        macos_detect()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        AppContext::default()
    }
}

#[cfg(target_os = "macos")]
fn macos_detect() -> AppContext {
    use std::process::Command;

    let app_name = Command::new("osascript")
        .args([
            "-e",
            r#"tell application "System Events" to get name of first application process whose frontmost is true"#,
        ])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let window_title = Command::new("osascript")
        .args([
            "-e",
            r#"tell application "System Events"
            set frontApp to first application process whose frontmost is true
            try
                get name of front window of frontApp
            on error
                return ""
            end try
        end tell"#,
        ])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let app_type = classify_app(&app_name);
    AppContext {
        app_name,
        window_title,
        app_type,
    }
}

#[cfg(target_os = "windows")]
fn windows_detect() -> AppContext {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    unsafe {
        let hwnd = windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow();
        if hwnd.is_null() {
            return AppContext::default();
        }

        // Get window title
        let mut title_buf = [0u16; 512];
        let len = windows_sys::Win32::UI::WindowsAndMessaging::GetWindowTextW(
            hwnd,
            title_buf.as_mut_ptr(),
            title_buf.len() as i32,
        );
        let window_title = if len > 0 {
            OsString::from_wide(&title_buf[..len as usize])
                .to_string_lossy()
                .to_string()
        } else {
            String::new()
        };

        // Get process name
        let mut pid = 0u32;
        windows_sys::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId(hwnd, &mut pid);

        let app_name = get_process_name(pid).unwrap_or_default();
        let app_type = classify_app(&app_name);

        AppContext {
            app_name,
            window_title,
            app_type,
        }
    }
}

#[cfg(target_os = "windows")]
unsafe fn get_process_name(pid: u32) -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    if pid == 0 {
        return None;
    }

    let handle = windows_sys::Win32::System::Threading::OpenProcess(
        windows_sys::Win32::System::Threading::PROCESS_QUERY_LIMITED_INFORMATION,
        0,
        pid,
    );
    if handle.is_null() {
        return None;
    }

    let mut buf = [0u16; 260];
    let mut size = buf.len() as u32;
    let ok = windows_sys::Win32::System::Threading::QueryFullProcessImageNameW(
        handle,
        0,
        buf.as_mut_ptr(),
        &mut size,
    );
    let _ = windows_sys::Win32::Foundation::CloseHandle(handle);

    if ok != 0 && size > 0 {
        let path = OsString::from_wide(&buf[..size as usize])
            .to_string_lossy()
            .to_string();
        path.rsplit('\\').next().map(|s| s.to_string())
    } else {
        None
    }
}

#[allow(dead_code)]
fn classify_app(app_name: &str) -> AppType {
    let name = app_name.to_lowercase();
    if ["outlook", "gmail", "thunderbird", "mail"]
        .iter()
        .any(|k| name.contains(k))
    {
        AppType::Email
    } else if ["slack", "discord", "wechat", "telegram", "teams"]
        .iter()
        .any(|k| name.contains(k))
    {
        AppType::Chat
    } else if ["code", "intellij", "vim", "nvim", "cursor"]
        .iter()
        .any(|k| name.contains(k))
    {
        AppType::Code
    } else if ["word", "docs", "notion", "obsidian", "typora"]
        .iter()
        .any(|k| name.contains(k))
    {
        AppType::Document
    } else {
        AppType::General
    }
}

#[cfg(test)]
mod context_types_tests {
    use super::types::{ContextFamily, ContextProfile, ContextSource};

    #[test]
    fn context_types_serialize_without_raw_signals() {
        assert_eq!(
            serde_json::to_value(ContextFamily::DeveloperCollaboration).unwrap(),
            "developer_collaboration"
        );

        let profile = ContextProfile {
            id: "dev.github".to_string(),
            family: ContextFamily::DeveloperCollaboration,
            app_label: "GitHub".to_string(),
            icon_key: "github".to_string(),
            override_id: Some("github".to_string()),
            source: ContextSource::BrowserDomain,
            confidence: 1.0,
        };
        let serialized = serde_json::to_string(&profile).unwrap();
        for forbidden in [
            "window_title",
            "browser_host",
            "process_id",
            "native_identity",
            "url",
        ] {
            assert!(!serialized.contains(forbidden));
        }
    }
}

#[cfg(test)]
mod app_registry_tests {
    use super::registry::AppRegistry;
    use super::types::{ContextFamily, ContextSignals};

    fn browser(host: &str) -> ContextSignals {
        ContextSignals {
            browser_host: Some(host.to_string()),
            is_supported_browser: true,
            ..ContextSignals::default()
        }
    }

    fn native(identity: &str) -> ContextSignals {
        ContextSignals {
            native_identity: Some(identity.to_string()),
            ..ContextSignals::default()
        }
    }

    #[test]
    fn app_registry_uses_exact_and_boundary_safe_matching() {
        let registry = AppRegistry::builtin().unwrap();
        assert_eq!(
            registry.classify(&browser("mail.google.com")).id,
            "email.gmail"
        );
        assert_eq!(
            registry.classify(&browser("acme.slack.com")).id,
            "chat.slack"
        );
        assert_eq!(
            registry.classify(&browser("evillinear.app")).id,
            "general.browser"
        );
        assert_eq!(
            registry.classify(&native("com.tinyspeck.slackmacgap")).id,
            "chat.slack"
        );
    }

    #[test]
    fn app_registry_rejects_browser_hosts_without_a_supported_adapter() {
        let registry = AppRegistry::builtin().unwrap();
        let signals = ContextSignals {
            browser_host: Some("mail.google.com".to_string()),
            is_supported_browser: false,
            ..ContextSignals::default()
        };
        assert_eq!(registry.classify(&signals).id, "general.native");
    }

    #[test]
    fn app_registry_covers_every_required_family() {
        let registry = AppRegistry::builtin().unwrap();
        for family in [
            ContextFamily::Email,
            ContextFamily::WorkChat,
            ContextFamily::PersonalChat,
            ContextFamily::Document,
            ContextFamily::ProjectManagement,
            ContextFamily::DeveloperCollaboration,
            ContextFamily::PromptOrCode,
            ContextFamily::Support,
            ContextFamily::Social,
        ] {
            assert!(registry
                .profiles()
                .iter()
                .any(|profile| profile.family == family));
        }
        assert!(registry.profiles().len() >= 70);
    }
}
