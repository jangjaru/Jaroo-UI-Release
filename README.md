# Jaroo's Company · UI Auto-Update Release

**Public distribution repository.** Only sanitized scripts and styles are published here. Local personal profile data is NOT included.

**[한국어 설치 가이드](docs/INSTALLATION_KO.md)**

| Site | Component | Version |
|---|---|---|
| ChatGPT | Clock userscript | 3.8.1 |
| ChatGPT | Status userscript | 6.7.0 |
| ChatGPT | Organization Mapper userscript | 1.3.2 |
| ChatGPT | Stylus UserCSS | 8.0.1 |
| Google Calendar | Companion userscript | 1.3.7 |
| Google Calendar | Stylus UserCSS | 1.2.2 |

Each userscript has Tampermonkey `@updateURL`/`@downloadURL`. Each UserCSS has Stylus `@updateURL`.

Security rules: keep personal dates/location/credentials in a **separate, local-only profile**. Do not upload this private profile here. Source management is kept in a separate private GitHub repository.

SHA256 hashes of published files: [SHA256.json](SHA256.json).

**Current test release (2026-11-23 KST)** — ChatGPT Neo-Brutalist v1.0. The ChatGPT theme, Clock and Status share the new visual design. In the sidebar and status lists, color highlights the chat title itself. The existing browser entries can update in place. Review the [release notes](docs/RELEASE_v8.0.1_KO.md) and [Chrome update guide](docs/INSTALLATION_KO.md). Final acceptance is pending verification in a signed-in Chrome profile.

Previous release: [Vivid Neon Readability v7.3.0](docs/RELEASE_v7.3.0_KO.md).
