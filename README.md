# Jaroo's Company · UI Auto-Update Release

**Public distribution repository.** Only sanitized scripts and styles are published here. Local personal profile data is NOT included.

**[한국어 설치 가이드](docs/INSTALLATION_KO.md)**

| Site | Component | Version |
|---|---|---|
| ChatGPT | Clock userscript | 3.7.2 |
| ChatGPT | Status userscript | 6.5.2 |
| ChatGPT | Organization Mapper userscript | 1.3.2 |
| ChatGPT | Stylus UserCSS | 7.2.0 |
| Google Calendar | Companion userscript | 1.3.7 |
| Google Calendar | Stylus UserCSS | 1.2.2 |

Each userscript has Tampermonkey `@updateURL`/`@downloadURL`. Each UserCSS has Stylus `@updateURL`.

Security rules: keep personal dates/location/credentials in a **separate, local-only profile**. Do not upload this private profile here. Source management is kept in a separate private GitHub repository.

SHA256 hashes of published files: [SHA256.json](SHA256.json).

**Current release (2026-11-22):** ChatGPT Simple Flat Vivid v7.2.0. See [release notes](docs/RELEASE_v7.2.0_KO.md). GitHub readback, JS syntax, CSS syntax and local profile tests passed; live Chrome v7.2 rendering and update installation still require confirmation. Previous Calendar Stylus manual update test was successful; previous Tampermonkey Mapper version 1.3.2 was verified installed.
