<p align="center">
  <strong>English</strong> | <a href="README_zh.md">中文</a> | <a href="README_ja.md">日本語</a> | <a href="README_ko.md">한국어</a> | <a href="README_es.md">Español</a> | <a href="README_fr.md">Français</a> | <a href="README_de.md">Deutsch</a> | <a href="README_pt.md">Português</a> | <a href="README_ru.md">Русский</a> | <a href="README_ar.md">العربية</a> | <a href="README_hi.md">हिन्दी</a> | <a href="README_it.md">Italiano</a> | <a href="README_tr.md">Türkçe</a> | <a href="README_vi.md">Tiếng Việt</a> | <a href="README_th.md">ภาษาไทย</a> | <a href="README_id.md">Bahasa Indonesia</a> | <a href="README_pl.md">Polski</a> | <a href="README_nl.md">Nederlands</a>
</p>

<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="OpenTypeless Logo" />
</p>

<h1 align="center">OpenTypeless</h1>

<p align="center">
  Open-source AI voice input for desktop. Speak naturally, get polished text in any app.
</p>

<p align="center">
  Whether you're writing emails, coding, chatting, or taking notes — just press a hotkey,<br/>
  speak your mind, and OpenTypeless transcribes and polishes your words with AI,<br/>
  then types them directly into whatever app you're using.
</p>

<p align="center">
  <a href="https://github.com/tover0314-w/opentypeless/actions/workflows/ci.yml"><img src="https://github.com/tover0314-w/opentypeless/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/tover0314-w/opentypeless/releases"><img src="https://img.shields.io/github/v/release/tover0314-w/opentypeless?color=2ABBA7" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/tover0314-w/opentypeless" alt="License" /></a>
  <a href="https://github.com/tover0314-w/opentypeless/stargazers"><img src="https://img.shields.io/github/stars/tover0314-w/opentypeless?style=social" alt="Stars" /></a>
  <a href="https://discord.gg/V6rRpJ4RGD"><img src="https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<p align="center">
  <img src="docs/images/voice-flow-demo.gif" width="720" alt="OpenTypeless Demo" />
</p>

<details>
<summary>More screenshots</summary>

<p align="center">
  <img src="docs/images/app-main-light.png" width="720" alt="OpenTypeless Main Window" />
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

- 🎙️ Global hotkey recording — hold-to-record or toggle mode
- 💊 Floating capsule widget that stays on top
- 🗣️ 6+ STT providers: Deepgram, AssemblyAI, Whisper, Groq, GLM-ASR, SiliconFlow
- 🤖 Text polishing via multiple LLMs: OpenAI, DeepSeek, Claude, Gemini, Ollama, and more
- ⚡ Streaming output — text appears as the LLM generates it
- ⌨️ Keyboard simulation or clipboard output
- 📝 Highlight text before recording to give the LLM context
- 🌐 Translation mode: speak in one language, output in another (20+ languages)
- 📖 Custom dictionary for domain-specific terms
- 🔍 Per-app detection to adapt formatting
- 📜 Local history with full-text search
- 🌗 Dark / light / system theme
- 🚀 Auto-start on login

> [!TIP]
> **Recommended Configuration for Best Experience**
>
> | | Provider | Model |
> |---|---|---|
> | 🗣️ STT | Groq | `whisper-large-v3-turbo` |
> | 🤖 AI Polish | Google | `gemini-2.5-flash` |
>
> This combo delivers fast, accurate transcription with high-quality text polishing — and both offer generous free tiers.

## Download

Download the latest version for your platform:

**[Download from Releases](https://github.com/tover0314-w/opentypeless/releases)**

| Platform | File |
|----------|------|
| Windows | `.msi` installer |
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Linux | `.AppImage` / `.deb` |

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

[Learn more about Pro](https://www.opentypeless.com)

### BYOK (Bring Your Own Key) vs Cloud

| | BYOK Mode | Cloud (Pro) Mode |
|---|---|---|
| STT | Your own API key (Deepgram, AssemblyAI, etc.) | Managed quota (10h/month) |
| LLM | Your own API key (OpenAI, DeepSeek, etc.) | Managed quota (~5M tokens/month) |
| Cloud dependency | None — all requests go directly to your provider | Requires connection to www.opentypeless.com |
| Cost | Pay your provider directly | $4.99/month subscription |

All core features — recording, transcription, AI polish, keyboard/clipboard output, dictionary, history — work entirely offline from OpenTypeless servers in BYOK mode.

### Self-Hosting / No Cloud

To run OpenTypeless without any cloud dependency:

1. Choose any non-Cloud STT and LLM provider in Settings
2. Enter your own API keys
3. That's it — no account or internet connection to www.opentypeless.com is needed

If you want to point the optional cloud features at your own backend, set these environment variables before building:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://www.opentypeless.com` | Frontend cloud API base URL |
| `API_BASE_URL` | `https://www.opentypeless.com` | Rust backend cloud API base URL |

```bash
# Example: build with a custom backend
VITE_API_BASE_URL=https://my-server.example.com API_BASE_URL=https://my-server.example.com npm run tauri build
```

## Architecture

**Data Flow Pipeline:**

```
Microphone → Audio Capture → STT Provider → Raw Transcript → LLM Polish → Keyboard/Clipboard Output
```

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
- [ ] Improved multi-language STT accuracy and dialect support
- [ ] Voice commands (e.g. "delete last sentence")
- [ ] Customizable hotkey combinations
- [ ] Improved onboarding experience
- [ ] Mobile companion app

## FAQ

**Is my audio sent to the cloud?**
In BYOK mode, audio goes directly to your chosen STT provider (e.g., Groq, Deepgram). Nothing passes through OpenTypeless servers. In Cloud (Pro) mode, audio is sent to our managed proxy for transcription.

**Can I use it offline?**
With a local STT provider (Whisper via Ollama) and a local LLM (Ollama), the app works entirely offline. No internet connection needed.

**Which languages are supported?**
STT supports 99+ languages depending on the provider. AI polish and translation support 20+ target languages.

**Is the app free?**
Yes. The app is fully functional with your own API keys (BYOK). The Cloud Pro subscription ($4.99/month) is optional.

## Community

- 💬 [Discord](https://discord.gg/V6rRpJ4RGD) — Chat, get help, share feedback
- 🗣️ [GitHub Discussions](https://github.com/tover0314-w/opentypeless/discussions) — Feature proposals, Q&A
- 🐛 [Issue Tracker](https://github.com/tover0314-w/opentypeless/issues) — Bug reports and feature requests
- 📖 [Contributing Guide](CONTRIBUTING.md) — Development setup and guidelines
- 🔒 [Security Policy](SECURITY.md) — Report vulnerabilities responsibly
- 🧭 [Vision](VISION.md) — Project principles and roadmap direction

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
