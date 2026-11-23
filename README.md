# Jaroo's Company · UI Auto-Update Release

**2026-11-23 · Dracula Neon · Typography Comfort 1**

This release retains the existing Dracula Neon visual system and functionality, while reducing overly heavy bold text across ChatGPT by approximately 30% of the excess font weight above 400. Font sizes, colors, glows, backgrounds, layouts, hover behavior and application state logic are preserved.

| Component | New version | Status |
|---|---|---|
| ChatGPT Clock | **3.10.1** | Life Clock labels/headings softened |
| ChatGPT Status | **6.8.1** | RUN/DONE/filter text softened |
| ChatGPT Mapper | 1.3.6 | unchanged |
| ChatGPT Dracula Neon CSS | **8.3.1** | Sidebar, projects, headings, response and native bold controls softened |
| Calendar Companion | 1.3.7 | unchanged |
| Calendar CSS | 1.2.2 | unchanged |

Examples of the proportional adjustment: 900 → 750, 850 → 720, 800 → 680, 700 → 610, 600 → 540. Normal body weight 400 and values below 400 remain unchanged. These are CSS font-weight units, not a guaranteed 30% reduction in perceived visual darkness.

- [한국어 설치 및 업데이트 가이드](docs/INSTALLATION_KO.md)
- [Typography Comfort release notes](docs/RELEASE_v8.3.1_TYPOGRAPHY_KO.md)
- [SHA-256 checksums](SHA256.json)

Private source is maintained at `jangjaru/Jaroo-UI-Updates`; personal Life Clock data remains in the user-specific local profile and is never published. This is a source-level rollout; final signed-in Chrome visual validation remains pending.
