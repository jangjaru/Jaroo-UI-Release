# Jaroo's Company · UI Auto-Update Release

**Public distribution repository.** Only sanitized scripts and styles are published here. Local personal profile data is NOT included.

**[한국어 설치 가이드](docs/INSTALLATION_KO.md)**

| Site | Component | Version |
|---|---|---|
| ChatGPT | Clock userscript | 3.7.3 |
| ChatGPT | Status userscript | 6.5.3 |
| ChatGPT | Organization Mapper userscript | 1.3.2 |
| ChatGPT | Stylus UserCSS | 7.3.0 |
| Google Calendar | Companion userscript | 1.3.7 |
| Google Calendar | Stylus UserCSS | 1.2.2 |

Each userscript has Tampermonkey `@updateURL`/`@downloadURL`. Each UserCSS has Stylus `@updateURL`.

Security rules: keep personal dates/location/credentials in a **separate, local-only profile**. Do not upload this private profile here. Source management is kept in a separate private GitHub repository.

SHA256 hashes of published files: [SHA256.json](SHA256.json).

**Current test release (2026-11-22):** ChatGPT Vivid Neon Readability v7.3.0. [Release notes](docs/RELEASE_v7.3.0_KO.md). Previous release: [Flat Vivid v7.2.0](docs/RELEASE_v7.2.0_KO.md). User screenshots identified v7.2 readability and toggle regressions. v7.3 restores the pre-v7 high-contrast palette, adds minimal-width date/weather, two-line brand, and a clickable ALL/ONLY control. Script parse, simulated widths and simulated UI click tests passed; actual Chrome/ChatGPT DOM verification is pending.
