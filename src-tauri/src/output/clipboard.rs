use anyhow::Result;
use async_trait::async_trait;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};

use super::{OutputMode, TextOutput};

/// Delay after writing to clipboard before simulating paste.
const CLIPBOARD_SETTLE_MS: u64 = 20;
/// Delay after paste before restoring the original clipboard content.
const PASTE_RESTORE_DELAY_MS: u64 = 50;

pub struct ClipboardOutput;

impl ClipboardOutput {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl TextOutput for ClipboardOutput {
    async fn type_text(&self, text: &str) -> Result<()> {
        // Use arboard for clipboard operations (cross-platform)
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| anyhow::anyhow!("Failed to access clipboard: {}", e))?;

        // Backup current clipboard
        let backup = clipboard.get_text().ok();

        // Write text to clipboard
        clipboard
            .set_text(text)
            .map_err(|e| anyhow::anyhow!("Failed to set clipboard: {}", e))?;

        tokio::time::sleep(std::time::Duration::from_millis(CLIPBOARD_SETTLE_MS)).await;

        // Simulate Ctrl+V (Windows/Linux) or Cmd+V (macOS)
        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|e| anyhow::anyhow!("Failed to create Enigo: {:?}", e))?;

        #[cfg(target_os = "macos")]
        let modifier = Key::Meta;
        #[cfg(not(target_os = "macos"))]
        let modifier = Key::Control;

        enigo.key(modifier, Direction::Press)
            .map_err(|e| anyhow::anyhow!("Key press error: {:?}", e))?;
        enigo.key(Key::Unicode('v'), Direction::Click)
            .map_err(|e| anyhow::anyhow!("Key click error: {:?}", e))?;
        enigo.key(modifier, Direction::Release)
            .map_err(|e| anyhow::anyhow!("Key release error: {:?}", e))?;

        tokio::time::sleep(std::time::Duration::from_millis(PASTE_RESTORE_DELAY_MS)).await;

        // Restore clipboard
        if let Some(backup_text) = backup {
            let _ = clipboard.set_text(&backup_text);
        }

        Ok(())
    }

    fn mode(&self) -> OutputMode {
        OutputMode::Clipboard
    }
}
