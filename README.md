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

## E-book Cool E-Ink Graph Paper — 0.3.1 responsive release

E-book is an independent, opt-in theme. Disable Dracula / Flat Neon visual styles when using it. The dedicated E-book Clock and Status render the final design directly, without the legacy neon layer. Replace the previous Clock/Status entries (same script names and namespaces); do not enable duplicate copies. Existing local private profile remains local.

| E-book component | Version |
|---|---|
| [Stylus CSS](themes/ebook-ivory-mono/theme.user.css) | 0.3.3 |
| [Indicators JS](themes/ebook-ivory-mono/indicators.user.js) | 0.3.7 |
| [Clock JS](themes/ebook-ivory-mono/clock.user.js) | 3.11.33 |
| [Status JS](themes/ebook-ivory-mono/status.user.js) | 6.9.1 |

- [Release and installation details](themes/ebook-ivory-mono/README.md)
- Legacy shared Clock/Status and Calendar/Dracula files remain unchanged.
- Source/algorithm checks completed; signed-in Chrome / Korean IME visual acceptance remains pending.



