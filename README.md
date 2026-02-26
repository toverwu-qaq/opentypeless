<p align="center">
  <strong>English</strong> | <a href="README_zh.md">中文</a> | <a href="README_ja.md">日本語</a> | <a href="README_ko.md">한국어</a> | <a href="README_es.md">Español</a> | <a href="README_fr.md">Français</a> | <a href="README_de.md">Deutsch</a> | <a href="README_pt.md">Português</a>
</p>

<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="OpenTypeless Logo" />
</p>

<h1 align="center">OpenTypeless</h1>

<p align="center">
  Open-source AI voice input for desktop. Speak naturally, get polished text in any app.
</p>

<p align="center">
  <a href="https://github.com/tover0314-w/opentypeless/actions"><img src="https://github.com/tover0314-w/opentypeless/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/tover0314-w/opentypeless/releases"><img src="https://img.shields.io/github/v/release/tover0314-w/opentypeless?color=2ABBA7" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/tover0314-w/opentypeless" alt="License" /></a>
  <a href="https://github.com/tover0314-w/opentypeless/stargazers"><img src="https://img.shields.io/github/stars/tover0314-w/opentypeless?style=social" alt="Stars" /></a>
</p>

<p align="center">
  <img src="docs/images/voice-flow-demo.gif" width="720" alt="OpenTypeless Demo" />
</p>

<details>
<summary>More screenshots</summary>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/app-main-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="docs/images/app-main-light.png" />
    <img src="docs/images/app-main-light.png" width="720" alt="OpenTypeless Main Window" />
  </picture>
</p>

| Settings | History |
|---|---|
| <img src="docs/images/app-settings.png" width="360" /> | <img src="docs/images/app-history.png" width="360" /> |

</details>

---

## Why OpenTypeless?

| | OpenTypeless | macOS Dictation | Windows Voice Typing | Whisper Desktop |
|---|---|---|---|---|
| AI text polishing | ✅ Multiple LLMs | ❌ | ❌ | ❌ |
| STT provider choice | ✅ 6+ providers | ❌ Apple only | ❌ Microsoft only | ❌ Whisper only |
| Works in any app | ✅ | ✅ | ✅ | ❌ Copy-paste |
| Translation mode | ✅ | ❌ | ❌ | ❌ |
| Open source | ✅ MIT | ❌ | ❌ | ✅ |
| Cross-platform | ✅ Win/Mac/Linux | ❌ Mac only | ❌ Windows only | ✅ |
| Custom dictionary | ✅ | ❌ | ❌ | ❌ |
| Self-hostable | ✅ BYOK | ❌ | ❌ | ✅ |

## Features

🎙️ Global hotkey (hold-to-record or toggle) · 💊 Floating capsule widget · 🗣️ 6+ STT providers (Deepgram, AssemblyAI, Whisper, Groq, GLM-ASR, SiliconFlow) · 🤖 Multi-LLM polish (OpenAI, DeepSeek, Claude, Gemini, Ollama…) · ⚡ Real-time streaming output · ⌨️ Keyboard or clipboard output · 📝 Selected text context · 🌐 Translation mode · 📖 Custom dictionary · 🔍 Per-app detection · 📜 Local history with search · 🌗 Dark / light / system theme · 🚀 Auto-start on login

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable toolchain)
- Platform-specific dependencies for Tauri: see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Configuration

All settings are accessible from the in-app Settings panel:

- **Speech Recognition** — choose STT provider and enter your API key
- **AI Polish** — choose LLM provider, model, and API key
- **General** — hotkey, output mode, theme, auto-start
- **Dictionary** — add custom terms for better transcription accuracy
- **Scenes** — prompt templates for different use cases

API keys are stored locally via `tauri-plugin-store`. No keys are sent to OpenTypeless servers — all STT/LLM requests go directly to the provider you configure.

### Cloud (Pro) Option

OpenTypeless also offers an optional Pro subscription that provides managed STT and LLM quota so you don't need your own API keys. This is entirely optional — the app is fully functional with your own keys.

### BYOK (Bring Your Own Key) vs Cloud

| | BYOK Mode | Cloud (Pro) Mode |
|---|---|---|
| STT | Your own API key (Deepgram, AssemblyAI, etc.) | Managed quota (10h/month) |
| LLM | Your own API key (OpenAI, DeepSeek, etc.) | Managed quota (~500k tokens/month) |
| Cloud dependency | None — all requests go directly to your provider | Requires connection to talkmore.ai |
| Cost | Pay your provider directly | $4.99/month subscription |

All core features — recording, transcription, AI polish, keyboard/clipboard output, dictionary, history — work entirely offline from OpenTypeless servers in BYOK mode.

### Self-Hosting / No Cloud

To run OpenTypeless without any cloud dependency:

1. Choose any non-Cloud STT and LLM provider in Settings
2. Enter your own API keys
3. That's it — no account or internet connection to talkmore.ai is needed

If you want to point the optional cloud features at your own backend, set these environment variables before building:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://talkmore.ai` | Frontend cloud API base URL |
| `API_BASE_URL` | `https://talkmore.ai` | Rust backend cloud API base URL |

```bash
# Example: build with a custom backend
VITE_API_BASE_URL=https://my-server.example.com API_BASE_URL=https://my-server.example.com npm run tauri build
```

## Architecture

```
src/                  # React frontend (TypeScript)
├── components/       # UI components (Settings, History, Capsule, etc.)
├── hooks/            # React hooks (recording, theme, Tauri events)
├── lib/              # Utilities (API client, router, constants)
└── stores/           # Zustand state management

src-tauri/src/        # Rust backend
├── audio/            # Audio capture via cpal
├── stt/              # STT providers (Deepgram, AssemblyAI, Whisper-compat, Cloud)
├── llm/              # LLM providers (OpenAI-compat, Cloud)
├── output/           # Text output (keyboard simulation, clipboard paste)
├── storage/          # Config (tauri-plugin-store) + history/dictionary (SQLite)
├── app_detector/     # Detect active application for context
├── pipeline.rs       # Recording → STT → LLM → Output orchestration
└── lib.rs            # Tauri app setup, commands, hotkey handling
```

## Roadmap

- [ ] Plugin system for custom STT/LLM integrations
- [ ] More languages (French, Japanese, Korean, Spanish…)
- [ ] Voice commands (e.g. "delete last sentence")
- [ ] Customizable hotkey combinations
- [ ] Improved onboarding experience
- [ ] Mobile companion app

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

Looking for a place to start? Check out issues labeled [`good first issue`](https://github.com/tover0314-w/opentypeless/labels/good%20first%20issue).

## Star History

<a href="https://star-history.com/#tover0314-w/opentypeless&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=tover0314-w/opentypeless&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=tover0314-w/opentypeless&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=tover0314-w/opentypeless&type=Date" />
  </picture>
</a>

## Built with Claude Code

This entire project was built in a single day using [Claude Code](https://claude.com/claude-code) — from architecture design to full implementation, including the Tauri backend, React frontend, CI/CD pipeline, and this README.

## License

[MIT](LICENSE)
