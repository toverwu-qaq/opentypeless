/// Shared STT provider configuration constants.
///
/// Eliminates the triple duplication of endpoint/model/extra_fields across:
/// - `stt::create_provider`
/// - `lib::test_stt_connection`
/// - `lib::bench_stt_connection`

/// Configuration for a Whisper-compatible STT provider.
pub struct SttProviderConfig {
    pub endpoint: &'static str,
    pub model: &'static str,
    pub extra_fields: &'static [(&'static str, &'static str)],
}

/// Returns the endpoint, model name, and any extra form fields for a given
/// Whisper-compatible STT provider.
pub fn get_whisper_config(provider: &str) -> Option<SttProviderConfig> {
    match provider {
        "glm-asr" => Some(SttProviderConfig {
            endpoint: "https://open.bigmodel.cn/api/paas/v4/audio/transcriptions",
            model: "glm-asr-2512",
            extra_fields: &[("stream", "false")],
        }),
        "openai-whisper" => Some(SttProviderConfig {
            endpoint: "https://api.openai.com/v1/audio/transcriptions",
            model: "whisper-1",
            extra_fields: &[],
        }),
        "groq-whisper" => Some(SttProviderConfig {
            endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
            model: "whisper-large-v3-turbo",
            extra_fields: &[],
        }),
        "siliconflow" => Some(SttProviderConfig {
            endpoint: "https://api.siliconflow.cn/v1/audio/transcriptions",
            model: "FunAudioLLM/SenseVoiceSmall",
            extra_fields: &[],
        }),
        _ => None,
    }
}
