# Jaroo's Company · UI Auto-Update Release

**2026-11-23 · Dracula Neon · Conversation Typography Fix v8.3.3**

Previous 8.3.2 settings reduced CSS numeric font weight throughout the system, but the user reported that actual ChatGPT conversation text still looked heavy while sidebar text did change. This release addresses the conversation itself without further reducing the sidebar.

| Component | Version | Change |
|---|---|---|
| ChatGPT Dracula Neon CSS | **8.3.3** | message text style and Pretendard Variable font-face targeting |
| Sidebar Life Clock JS | 3.10.2 | unchanged |
| Status & Command Center JS | 6.8.2 | unchanged |
| Organization Mapper JS | 1.3.6 | unchanged |
| Google Calendar Companion | 1.3.7 | unchanged |
| Google Calendar CSS | 1.2.2 | unchanged |

The CSS adds scoped targeting for nested ChatGPT message text, including HTML p/li/strong, DIL TextBase spans, conversation table cells and headings. The intended font weights are regular 320, emphasized 430. The styles load Pretendard Variable from a locally installed copy when available, with a webfont fallback, instead of relying on a possibly static Pretendard face.

**No intended change:** sidebar/project names, Life Clock visuals, RUN/DONE logic, colors, font sizes, spacing or layout.

- [설치 안내](docs/INSTALLATION_KO.md)
- [v8.3.3 변경 내역](docs/RELEASE_v8.3.3_CONVERSATION_FONT_KO.md)
- [SHA256.json](SHA256.json)

This is a testable source release, not a completed visual acceptance. Actual signed-in Chrome computed font and rendered screen must be inspected to establish whether the issue is resolved. Any remaining discrepancy may be caused by native DOM selector changes or blocked/absent variable font files.
