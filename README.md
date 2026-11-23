# Jaroo's Company · UI Auto-Update Release

**2026-11-23 · Dracula Neon Typography Light 2 · v8.3.2**

The user found the preceding 8.3.1 typography still too bold. This release lightens current font-weight values to approximately **70% of the current values** across ChatGPT, the project/sidebar chat names, assistant body and text emphasis, Life Clock, RUN/DONE status controls and native font utilities.

| Component | Version | Change |
|---|---|---|
| ChatGPT Dracula CSS | **8.3.2** | native body/heading/strong/project/chat typography lighter |
| Sidebar Life Clock | **3.10.2** | Shadow DOM text weights lighter |
| Status & Command Center | **6.8.2** | RUN/DONE/ALL widget text lighter |
| Organization Mapper | 1.3.6 | unchanged |
| Calendar Companion | 1.3.7 | unchanged |
| Calendar CSS | 1.2.2 | unchanged |

For explicit numeric weights: `new = max(320, round(old * 0.70 / 10) * 10)`. Examples: 750→530, 680→480, 610→430, 600→420, 540→380, 470→330, 410→320. Some natural weight values reach the 320 floor to protect readability. This is a font-weight adjustment, not a guaranteed perceived darkness ratio.

- [설치 및 업데이트 가이드](docs/INSTALLATION_KO.md)
- [변경내역](docs/RELEASE_v8.3.2_TYPOGRAPHY_LIGHT_KO.md)
- [파일 SHA256](SHA256.json)

No intentional changes were made to layout, font sizes, palette, borders, glows, animations, status logic or Life Clock calculations. Local profile data is never published. Final signed-in Chrome display and extension update tests remain pending.
