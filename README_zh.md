<p align="center">
  <a href="README.md">English</a> | <strong>中文</strong> | <a href="README_ja.md">日本語</a> | <a href="README_ko.md">한국어</a> | <a href="README_es.md">Español</a> | <a href="README_fr.md">Français</a> | <a href="README_de.md">Deutsch</a> | <a href="README_pt.md">Português</a>
</p>

<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="OpenTypeless Logo" />
</p>

<h1 align="center">OpenTypeless</h1>

<p align="center">
  开源桌面端 AI 语音输入工具。自然说话，在任意应用中获得润色后的文本。
</p>

<p align="center">
  <a href="https://github.com/tover0314-w/opentypeless/actions/workflows/ci.yml"><img src="https://github.com/tover0314-w/opentypeless/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/tover0314-w/opentypeless/releases"><img src="https://img.shields.io/github/v/release/tover0314-w/opentypeless?color=2ABBA7" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/tover0314-w/opentypeless" alt="License" /></a>
  <a href="https://github.com/tover0314-w/opentypeless/stargazers"><img src="https://img.shields.io/github/stars/tover0314-w/opentypeless?style=social" alt="Stars" /></a>
  <a href="https://discord.gg/V6rRpJ4RGD"><img src="https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<p align="center">
  <img src="docs/images/voice-flow-demo.gif" width="720" alt="OpenTypeless 演示" />
</p>

<details>
<summary>更多截图</summary>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/app-main-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="docs/images/app-main-light.png" />
    <img src="docs/images/app-main-light.png" width="720" alt="OpenTypeless 主窗口" />
  </picture>
</p>

| 设置 | 历史记录 |
|---|---|
| <img src="docs/images/app-settings.png" width="360" /> | <img src="docs/images/app-history.png" width="360" /> |

</details>

---

## 为什么选择 OpenTypeless？

| | OpenTypeless | macOS 听写 | Windows 语音输入 | Whisper Desktop |
|---|---|---|---|---|
| AI 文本润色 | ✅ 多种 LLM | ❌ | ❌ | ❌ |
| STT 服务商选择 | ✅ 6+ 服务商 | ❌ 仅 Apple | ❌ 仅 Microsoft | ❌ 仅 Whisper |
| 适用于任意应用 | ✅ | ✅ | ✅ | ❌ 需复制粘贴 |
| 翻译模式 | ✅ | ❌ | ❌ | ❌ |
| 开源 | ✅ MIT | ❌ | ❌ | ✅ |
| 跨平台 | ✅ Win/Mac/Linux | ❌ 仅 Mac | ❌ 仅 Windows | ✅ |
| 自定义词典 | ✅ | ❌ | ❌ | ❌ |
| 可自托管 | ✅ BYOK | ❌ | ❌ | ✅ |

## 功能特性

- 🎙️ 全局热键录音，支持按住和切换两种模式
- 💊 浮动胶囊悬浮窗，随时可见录音状态
- 🗣️ 接入 6+ 语音识别服务商：Deepgram、AssemblyAI、Whisper、Groq、GLM-ASR、SiliconFlow
- 🤖 多种大模型润色文本：OpenAI、DeepSeek、Claude、Gemini、Ollama 等
- ⚡ 流式输出，边生成边打字
- ⌨️ 支持键盘模拟和剪贴板两种输出方式
- 📝 选中文本后录音，可作为上下文传给大模型
- 🌐 翻译模式：说中文，输出英文（或其他 20+ 语言）
- 📖 自定义词典，提升专业术语识别率
- 🔍 自动识别当前应用，适配不同场景
- 📜 本地历史记录，支持全文搜索
- 🌗 深色 / 浅色 / 跟随系统主题
- 🚀 开机自启

> [!TIP]
> **推荐配置（开箱即用最佳体验）**
>
> | | 服务商 | 模型 |
> |---|---|---|
> | 🗣️ 语音识别 | Groq | `whisper-large-v3-turbo` |
> | 🤖 AI 润色 | Google | `gemini-2.5-flash` |
>
> 这套组合转录速度快、准确率高，文本润色质量出色，而且两者都提供慷慨的免费额度。

## 前置要求

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/)（stable 工具链）
- Tauri 平台依赖：参见 [Tauri 前置要求](https://v2.tauri.app/start/prerequisites/)

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建生产版本
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`。

## 配置

所有设置均可在应用内的设置面板中访问：

- **语音识别** — 选择 STT 服务商并输入 API 密钥
- **AI 润色** — 选择 LLM 服务商、模型和 API 密钥
- **通用** — 热键、输出模式、主题、开机自启
- **词典** — 添加自定义术语以提高转录准确度
- **场景** — 不同使用场景的提示词模板

API 密钥通过 `tauri-plugin-store` 存储在本地。密钥不会发送到 OpenTypeless 服务器 — 所有 STT/LLM 请求直接发送到你配置的服务商。

### Cloud（Pro）选项

OpenTypeless 还提供可选的 Pro 订阅，提供托管的 STT 和 LLM 配额，无需自备 API 密钥。这完全是可选的 — 使用自己的密钥即可完整使用所有功能。

### BYOK（自备密钥）vs Cloud

| | BYOK 模式 | Cloud（Pro）模式 |
|---|---|---|
| STT | 自己的 API 密钥（Deepgram、AssemblyAI 等） | 托管配额（10小时/月） |
| LLM | 自己的 API 密钥（OpenAI、DeepSeek 等） | 托管配额（约500万 tokens/月） |
| 云依赖 | 无 — 所有请求直接发送到你的服务商 | 需要连接 www.opentypeless.com |
| 费用 | 直接向服务商付费 | $4.99/月订阅 |

所有核心功能 — 录音、转录、AI 润色、键盘/剪贴板输出、词典、历史记录 — 在 BYOK 模式下完全不依赖 OpenTypeless 服务器。

### 自托管 / 无云依赖

无需任何云依赖即可运行 OpenTypeless：

1. 在设置中选择任意非 Cloud 的 STT 和 LLM 服务商
2. 输入你自己的 API 密钥
3. 完成 — 无需账户或连接 www.opentypeless.com

如果你想将可选的云功能指向自己的后端，在构建前设置以下环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://www.www.opentypeless.com` | 前端云 API 基础 URL |
| `API_BASE_URL` | `https://www.www.opentypeless.com` | Rust 后端云 API 基础 URL |

```bash
# 示例：使用自定义后端构建
VITE_API_BASE_URL=https://my-server.example.com API_BASE_URL=https://my-server.example.com npm run tauri build
```

## 架构

```
src/                  # React 前端（TypeScript）
├── components/       # UI 组件（Settings、History、Capsule 等）
├── hooks/            # React hooks（录音、主题、Tauri 事件）
├── lib/              # 工具库（API 客户端、路由、常量）
└── stores/           # Zustand 状态管理

src-tauri/src/        # Rust 后端
├── audio/            # 音频采集（cpal）
├── stt/              # STT 服务商（Deepgram、AssemblyAI、Whisper 兼容、Cloud）
├── llm/              # LLM 服务商（OpenAI 兼容、Cloud）
├── output/           # 文本输出（键盘模拟、剪贴板粘贴）
├── storage/          # 配置（tauri-plugin-store）+ 历史/词典（SQLite）
├── app_detector/     # 检测当前活动应用
├── pipeline.rs       # 录音 → STT → LLM → 输出 编排
└── lib.rs            # Tauri 应用设置、命令、热键处理
```

## 路线图

- [ ] 插件系统，支持自定义 STT/LLM 集成
- [ ] 更多语言支持（法语、日语、韩语、西班牙语…）
- [ ] 语音命令（如"删除上一句"）
- [ ] 可自定义热键组合
- [ ] 改进新手引导体验
- [ ] 移动端伴侣应用

## 社区

- 💬 [Discord](https://discord.gg/V6rRpJ4RGD) — 交流、获取帮助、分享反馈
- 🗣️ [GitHub Discussions](https://github.com/tover0314-w/opentypeless/discussions) — 功能提案、问答
- 🐛 [Issue Tracker](https://github.com/tover0314-w/opentypeless/issues) — Bug 报告和功能请求
- 📖 [贡献指南](CONTRIBUTING.md) — 开发环境搭建和贡献规范
- 🔒 [安全策略](SECURITY.md) — 负责任地报告漏洞
- 🧭 [愿景](VISION.md) — 项目原则和路线图方向

## 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发设置和指南。

寻找入手点？查看标记为 [`good first issue`](https://github.com/tover0314-w/opentypeless/labels/good%20first%20issue) 的 issue。

## Star History

<a href="https://star-history.com/#tover0314-w/opentypeless&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=tover0314-w/opentypeless&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=tover0314-w/opentypeless&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=tover0314-w/opentypeless&type=Date" />
  </picture>
</a>

## 借助 Claude Code 一天完成开发

整个项目在一天之内借助 [Claude Code](https://claude.com/claude-code) 完成开发 — 从架构设计到完整实现，包括 Tauri 后端、React 前端、CI/CD 流水线以及本 README。

## 许可证

[MIT](LICENSE)
