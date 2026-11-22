# Jaroo's Company · UI Auto-Update Release

**Public distribution repository.** Only sanitized scripts and styles are published here. Local personal profile data is NOT included.

**[한국어 설치 가이드](docs/INSTALLATION_KO.md)**

| Site | Component | Version |
|---|---|---|
| ChatGPT | Clock userscript | 3.7.0 |
| ChatGPT | Status userscript | 6.3.17 |
| ChatGPT | Organization Mapper userscript | 1.3.1 |
| ChatGPT | Stylus UserCSS | 6.8.6 |
| Google Calendar | Companion userscript | 1.3.7 |
| Google Calendar | Stylus UserCSS | 1.2.1 |

Each userscript has Tampermonkey `@updateURL`/`@downloadURL`. Each UserCSS has Stylus `@updateURL`.

Security rules: keep personal dates/location/credentials in a **separate, local-only profile**. Do not upload this private profile here. Source management is kept in a separate private GitHub repository.

SHA256 hashes of published files: [SHA256.json](SHA256.json).

**Important:** Source uploaded + repository readback verified (2026-11-22). Anonymous HTTP fetch and real Chrome extension install/update tests are still pending. The older installed scripts are not automatically migrated to this distribution.
