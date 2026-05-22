/// Shared STT provider configuration constants.
///
/// Eliminates the triple duplication of endpoint/model/extra_fields across:
/// - `stt::create_provider`
/// - `lib::test_stt_connection`
/// - `lib::bench_stt_connection`
///
/// Configuration for a Whisper-compatible STT provider.
#[allow(clippy::doc_lazy_continuation)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_glm_asr_config() {
        let cfg = get_whisper_config("glm-asr").unwrap();
        assert!(cfg.endpoint.contains("bigmodel.cn"));
        assert_eq!(cfg.model, "glm-asr-2512");
        assert!(cfg.extra_fields.contains(&("stream", "false")));
    }

    #[test]
    fn test_openai_whisper_config() {
        let cfg = get_whisper_config("openai-whisper").unwrap();
        assert!(cfg.endpoint.contains("api.openai.com"));
        assert_eq!(cfg.model, "whisper-1");
        assert!(cfg.extra_fields.is_empty());
    }

    #[test]
    fn test_groq_whisper_config() {
        let cfg = get_whisper_config("groq-whisper").unwrap();
        assert!(cfg.endpoint.contains("api.groq.com"));
        assert_eq!(cfg.model, "whisper-large-v3-turbo");
        assert!(cfg.extra_fields.is_empty());
    }

    #[test]
    fn test_siliconflow_config() {
        let cfg = get_whisper_config("siliconflow").unwrap();
        assert!(cfg.endpoint.contains("siliconflow"));
        assert_eq!(cfg.model, "FunAudioLLM/SenseVoiceSmall");
        assert!(cfg.extra_fields.is_empty());
    }

    #[test]
    fn test_unknown_provider_returns_none() {
        assert!(get_whisper_config("unknown").is_none());
    }

    #[test]
    fn test_deepgram_not_in_whisper_config() {
        assert!(get_whisper_config("deepgram").is_none());
    }

    #[test]
    fn test_assemblyai_not_in_whisper_config() {
        assert!(get_whisper_config("assemblyai").is_none());
    }

    #[test]
    fn test_cloud_not_in_whisper_config() {
        assert!(get_whisper_config("cloud").is_none());
    }
}
