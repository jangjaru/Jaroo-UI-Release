# Jaroo's Company · UI Auto-Update Release

**2026-11-23 · Dracula Neon Sidebar Text Weight v8.3.4**

The user wants **only the left sidebar project names and chat-list names** about 30% heavier than v8.3.3. This version adjusts the existing color-coded chat title and project capsule `font-weight` declarations without touching conversation messages or JS.

| Component | Version | Change |
|---|---|---|
| ChatGPT CSS | **8.3.4** | sidebar project/chat titles +30% weight |
| Clock JS | 3.10.2 | unchanged |
| Status JS | 6.8.2 | unchanged |
| Mapper JS | 1.3.6 | unchanged |
| Calendar Companion | 1.3.7 | unchanged |
| Calendar CSS | 1.2.2 | unchanged |

Typical numeric changes: chat normal 320→420, selected 420→550, standard/CEO projects 430→560, strategy projects 380→490. Other role-specific and archived names keep their relative treatment with a similar 1.3 multiplier.

- [Korean update guide](docs/INSTALLATION_KO.md)
- [Release notes](docs/RELEASE_v8.3.4_SIDEBAR_WEIGHT_KO.md)
- [SHA256 manifest](SHA256.json)

Colors, font sizes, layout, icons, animations, message body (including variable Pretendard v8.3.3), Life Clock, RUN/DONE behavior and private local profile are not modified. Final signed-in Chrome visual verification is pending.

## Flat Neon Pixel v0.1.0 — optional design overlay

The reversible flat saturated Monokai/pixel-edge layer is available as [CSS](chatgpt/flat-neon-pixel.user.css) and [JS](chatgpt/flat-neon-pixel.user.js). Install each once, leaving Dracula 8.3.4 and Clock/Status/Mapper enabled; these existing files are unchanged. See [Korean installation and rollback instructions](docs/INSTALL_FLAT_NEON_PIXEL_v0.1.0_KO.md). Signed-in Chrome visual acceptance remains pending.

## E-book Cool E-Ink Graph Paper v0.3.0-beta.1 (development branch)

An updated, opt-in **E-book Editorial Notebook** with cool graphite paper, 22px square grid, fine grain, lime active-chat marker, and lighter sent user prompts has been published in [`themes/ebook-ivory-mono/`](themes/ebook-ivory-mono/README.md). It does not replace Dracula/Flat Neon; disable the old visual styles when using E-book. Clock, Status and Mapper are optional compatibility components; E-book can run without them.

- [Stylus CSS installer](themes/ebook-ivory-mono/theme.user.css)
- [Tampermonkey JS installer](themes/ebook-ivory-mono/indicators.user.js)
- [Korean setup, font and rollback guidance](themes/ebook-ivory-mono/README.md)

**2026-11-24 개발 변경:** 독립 E-book 리팩터링 테스트본. [한글 설치 및 검증 안내](themes/ebook-ivory-mono/README.md). main 정식 버전은 유지.
