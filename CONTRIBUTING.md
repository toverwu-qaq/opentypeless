# Contributing to OpenTypeless

Thanks for your interest in contributing!

## Development Setup

1. Install prerequisites: Node.js 20+, Rust stable toolchain, and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
2. Clone the repo and run `npm install`
3. Start development: `npm run tauri dev`

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Ensure the build passes: `npm run build` and `cargo clippy`
5. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, etc.
6. Open a pull request against `main`

## Code Style

- TypeScript: strict mode, no `any` types
- Rust: `cargo fmt` and `cargo clippy` must pass
- Frontend: Tailwind CSS for styling, Zustand for state

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- OS and app version

## Feature Requests

Open an issue describing the use case and proposed solution.
