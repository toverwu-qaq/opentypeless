use anyhow::Result;
use async_trait::async_trait;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};

use super::{OutputMode, TextOutput};

/// Delay after simulating Shift+Enter to let the target app process the newline.
const NEWLINE_DELAY_MS: u64 = 20;
/// Maximum characters per enigo.text() call to avoid input buffer overflow.
const TYPE_CHUNK_SIZE: usize = 200;
/// Delay between typing chunks.
const TYPE_CHUNK_DELAY_MS: u64 = 5;

pub struct KeyboardOutput;

impl KeyboardOutput {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl TextOutput for KeyboardOutput {
    async fn type_text(&self, text: &str) -> Result<()> {
        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|e| anyhow::anyhow!("Failed to create Enigo: {:?}", e))?;

        let lines: Vec<&str> = text.split('\n').collect();
        for (i, line) in lines.iter().enumerate() {
            if !line.is_empty() {
                for chunk in line.chars().collect::<Vec<_>>().chunks(TYPE_CHUNK_SIZE) {
                    let s: String = chunk.iter().collect();
                    enigo
                        .text(&s)
                        .map_err(|e| anyhow::anyhow!("Failed to type text: {:?}", e))?;
                    tokio::time::sleep(std::time::Duration::from_millis(TYPE_CHUNK_DELAY_MS)).await;
                }
            }
            if i < lines.len() - 1 {
                enigo.key(Key::Shift, Direction::Press)
                    .map_err(|e| anyhow::anyhow!("Key error: {:?}", e))?;
                enigo.key(Key::Return, Direction::Click)
                    .map_err(|e| anyhow::anyhow!("Key error: {:?}", e))?;
                enigo.key(Key::Shift, Direction::Release)
                    .map_err(|e| anyhow::anyhow!("Key error: {:?}", e))?;
            }
        }

        Ok(())
    }

    fn mode(&self) -> OutputMode {
        OutputMode::Keyboard
    }
}
