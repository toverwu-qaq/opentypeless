# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenTypeless, please report it responsibly.

**Do not open a public issue.**

Instead, email the maintainers at: **security@opentypeless.com** (or open a private security advisory on GitHub).

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days for critical issues.

## Scope

This policy covers the OpenTypeless desktop application and its build/release infrastructure. Third-party STT/LLM provider APIs are out of scope — report those to the respective providers.

## Security Design

- API keys are stored locally via `tauri-plugin-store` (not transmitted to OpenTypeless servers)
- All STT/LLM requests go directly to the configured provider (BYOK mode)
- Cloud proxy mode requires authentication via session token
- SQL queries use parameterized statements
- CSP is enabled in the Tauri webview
