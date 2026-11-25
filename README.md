# Jaroo's Company · UI Auto-Update Release

**2026-11-23 · Dracula Neon Sidebar Text Weight v8.3.4**

The user wants **only the left sidebar project names and chat-list names** about 30% heavier than v8.3.3. This version adjusts the existing color-coded chat title and project capsule `font-weight` declarations without touching conversation messages or JS.

| Component | Version | Change |
|---|---|---|
| ChatGPT CSS | **8.3.4** | sidebar project/chat titles +30% weight |
| Clock JS | 3.10.2 | unchanged |
| Status JS | 6.8.2 | unchanged |
| Mapper JS | 1.3.7 | shared hidden-tab optimization |
| Calendar Companion | 1.3.8 | runtime optimization |
| Calendar CSS | 1.2.2 | unchanged |

Typical numeric changes: chat normal 320→420, selected 420→550, standard/CEO projects 430→560, strategy projects 380→490. Other role-specific and archived names keep their relative treatment with a similar 1.3 multiplier.

- [Korean update guide](docs/INSTALLATION_KO.md)
- [Release notes](docs/RELEASE_v8.3.4_SIDEBAR_WEIGHT_KO.md)
- [SHA256 manifest](SHA256.json)

Colors, font sizes, layout, icons, animations, message body (including variable Pretendard v8.3.3), Life Clock, RUN/DONE behavior and private local profile are not modified. Final signed-in Chrome visual verification is pending.

## Flat Neon Pixel v0.1.0 — optional design overlay

The reversible flat saturated Monokai/pixel-edge layer is available as [CSS](chatgpt/flat-neon-pixel.user.css) and [JS](chatgpt/flat-neon-pixel.user.js). Install each once, leaving Dracula 8.3.4 and Clock/Status/Mapper enabled; these existing files are unchanged. See [Korean installation and rollback instructions](docs/INSTALL_FLAT_NEON_PIXEL_v0.1.0_KO.md). Signed-in Chrome visual acceptance remains pending.

## E-book Cool E-Ink Graph Paper — 2026-11-25 performance pass 2

E-book is an independent, opt-in theme. Disable Dracula / Flat Neon visual styles when using it. The dedicated E-book Clock and Status render the final design directly, without the legacy neon layer. Replace the previous Clock/Status entries (same script names and namespaces); do not enable duplicate copies. Existing local private profile remains local.

| E-book component | Version |
|---|---|
| [Stylus CSS](themes/ebook-ivory-mono/theme.user.css) | 0.3.7 |
| [Indicators JS](themes/ebook-ivory-mono/indicators.user.js) | 0.3.22 |
| [Clock JS](themes/ebook-ivory-mono/clock.user.js) | 3.11.55 |
| [Status JS](themes/ebook-ivory-mono/status.user.js) | 6.9.18 |

- [Release and installation details](themes/ebook-ivory-mono/README.md)
- Legacy shared Clock/Status and Dracula CSS remain unchanged; the shared Mapper is now v1.3.7.
- Source/algorithm checks completed; signed-in Chrome / Korean IME visual acceptance remains pending.




## Google Calendar Dracula Gold — final runtime optimization (2026-11-25)

- [Stylus CSS v1.2.2](calendar/theme.user.css) unchanged: scoped selectors, existing colors/priority/date/focus/forced-color rules, no animation or remote imports. CSS compatibility token remains 1.2.
- [Companion JS v1.3.8](calendar/companion.user.js): date formatter and bounded label cache; single-pass agenda/statistics; short-circuit DOM mutation relevance, avoid repeated date invalidation and pending-panel signatures; remove unused marker set and native paint signature. Native More popup verification is unchanged in scope and conditions; cache shared candidate/overlay evaluations during one read phase and stop verification after two eligible rows. Suspend recovery and delayed popup scan timers while hidden; refresh and rearm on return. No new permissions, network requests, event writes, persistent personal data, or design changes.
- Validation: old/new JS parsing; 4500 timezone dates, 400 model results, 500 agenda batches, 400 statistics batches, 500 mutation batches and visibility lifecycle mock. Mutation relevance checks in the deterministic synthetic batches: 24750 -> 1760; not a measured browser speedup. Shadow CSS unchanged; signed-in Chrome / native popup and visual/CPU/memory acceptance pending. Full live DOM regression was not run.
- Rollback baseline: [88ef58878b65](https://github.com/jangjaru/Jaroo-UI-Release/commit/88ef58878b6562cd8e2f98bed1a08210464fdc45). Existing update/install URLs unchanged. ChatGPT files unchanged in this release.
