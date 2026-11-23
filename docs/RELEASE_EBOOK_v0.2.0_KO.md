# E-book Editorial Notebook v0.2.0 — Release Notes

**Date:** 2026-11-23

**Design intent:** Editorial warm-paper reading UI with denser Pretendard Variable typography and muted structural lines, preserving independent theme files and core ChatGPT features.

| Area | Before (v0.1.1) | v0.2.0 |
|---|---|---|
| Body/chat font | IBM Plex Mono/Monoplex KR | Pretendard Variable |
| Code/metadata | IBM Plex Mono everywhere | IBM Plex Mono only for metadata/code |
| Sidebar/body size | 13.5px | 14px shared |
| Project indicator | Gray circular pseudo element | Removed; native folder icon retained |
| Project type | Normal/light | 600, -0.03em |
| Chat name | Wide-spaced mono | 450, -0.035em |
| Main canvas | Solid ivory | 28px ultra-faint gray grid |
| Prompt focus | Potentially bright native ring | Subtle beige gray outline and rounded memo card |
| Composer lists | Native indent | 1.75em list gutter |
| Dot unread count | Native filled badge | Black outline only when exact Dot count is identified |

The JS decorates role prefix symbols without altering the source chat title; it also styles visible Clock metadata and attempts a conservative Dot numeric badge marker. The clock's original segmented digits and existing Status behavior are not changed.

**Verification:** JS parses and private CSS braces balance, but actual logged-in Chrome font-family/render, CSS cascade order and responsive behavior require user's acceptance.
