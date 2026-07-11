use std::process::Command;

use url::Url;

use super::ContextSignalSource;
use crate::app_detector::types::ContextSignals;

pub struct MacOsContextSource;

impl ContextSignalSource for MacOsContextSource {
    fn collect(&self) -> Option<ContextSignals> {
        let output = Command::new("/usr/bin/osascript")
            .args(["-e", FRONT_APP_SCRIPT])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }

        let value = String::from_utf8(output.stdout).ok()?;
        let mut fields = value.trim_end().split('\u{1f}');
        let app_name = fields.next()?.trim().to_string();
        let process_id = fields.next().and_then(|value| value.trim().parse().ok());
        let native_identity = fields
            .next()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);
        let window_title = fields
            .next()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);

        let browser_name = supported_browser_name(native_identity.as_deref(), &app_name);
        let browser_host = browser_name.and_then(read_browser_host);

        Some(ContextSignals {
            process_id,
            native_identity,
            process_alias: Some(app_name),
            window_title,
            browser_host,
            is_supported_browser: browser_name.is_some(),
        })
    }
}

const FRONT_APP_SCRIPT: &str = r#"
tell application "System Events"
    set frontProcess to first application process whose frontmost is true
    set appName to name of frontProcess
    set appPid to unix id of frontProcess
    try
        set bundleId to bundle identifier of frontProcess
    on error
        set bundleId to ""
    end try
    try
        set windowName to name of front window of frontProcess
    on error
        set windowName to ""
    end try
    return appName & ASCII character 31 & (appPid as text) & ASCII character 31 & bundleId & ASCII character 31 & windowName
end tell
"#;

fn supported_browser_name(identity: Option<&str>, app_name: &str) -> Option<&'static str> {
    let identity = identity.unwrap_or_default();
    match identity {
        "com.apple.Safari" => Some("Safari"),
        "com.google.Chrome" => Some("Google Chrome"),
        "com.microsoft.edgemac" => Some("Microsoft Edge"),
        "com.brave.Browser" => Some("Brave Browser"),
        "company.thebrowser.Browser" => Some("Arc"),
        _ => match app_name {
            "Safari" => Some("Safari"),
            "Google Chrome" => Some("Google Chrome"),
            "Microsoft Edge" => Some("Microsoft Edge"),
            "Brave Browser" => Some("Brave Browser"),
            "Arc" => Some("Arc"),
            _ => None,
        },
    }
}

fn read_browser_host(browser_name: &str) -> Option<String> {
    let script = if browser_name == "Safari" {
        r#"tell application "Safari" to get URL of current tab of front window"#.to_string()
    } else {
        format!("tell application \"{browser_name}\" to get URL of active tab of front window")
    };
    let output = Command::new("/usr/bin/osascript")
        .args(["-e", &script])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    let transient_url = String::from_utf8(output.stdout).ok()?;
    Url::parse(transient_url.trim())
        .ok()?
        .host_str()
        .map(|host| host.trim_end_matches('.').to_ascii_lowercase())
}
