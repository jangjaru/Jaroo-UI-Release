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
