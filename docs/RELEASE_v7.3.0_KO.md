# ChatGPT UI · Vivid Neon Readability v7.3.0
**Date:** 2026-11-22 · **Status:** public test release; actual logged-in ChatGPT UI verification pending.

## Why this version exists
The user supplied three Chrome screenshots (narrow, medium, wide) after v7.2 was installed. Their critique identified dull colors, unreadable Life Clock labels, logo clipping, disappearing date/weather, project-name font shrink and non-clicking ALL radio toggle.

## Precise changes
- **CSS 7.3.0:** restores the previous approved v6.8.6 vivid palette, project capsule colors and normal font size at all sidebar widths. No unrelated Calendar or Mapper changes.
- **Clock 3.7.3:** restores breathing and rotating neon brand rim, stronger script-font brand glow; stacked two-line Jaroo's / Company at narrow widths, not artificially squeezed to one line.
- **Clock 3.7.3:** 3 Life Clock metrics preserved across narrow/compact/regular/wide layouts, minimum numeric typography raised, colored labels readable, gray secondary explanations removed on narrow/compact only.
- **Clock 3.7.3:** date and weather remain visible in narrow mode, placed on a row ABOVE the HH:MM segmented clock instead of hidden.
- **Status 6.5.3:** fixes ALL/ONLY button disabled by a too-strict immediate-sibling check for native ChatGPT navigation. Scans following siblings for a validated multi-entry branch; has a safe fallback that hides visual chat rows but preserves native React nodes, new-chat action and project folders.
- **Status 6.5.3:** larger, higher-contrast ALL/ONLY hit area. Original RUN/DONE counters, state logic and glow behavior remain unchanged.
- Existing local private profile is still used; no birth date or weather coordinates are embedded into the public Clock script.

## Files updated
| File | Version |
|---|---|
| `chatgpt/clock.user.js` | 3.7.3 |
| `chatgpt/status.user.js` | 6.5.3 |
| `chatgpt/theme.user.css` | 7.3.0 |

Unchanged: Mapper 1.3.2, Calendar Companion 1.3.7, Calendar UserCSS 1.2.2.

## Verified
- JS files parsed with Node.js without syntax errors.
- CSS parsed successfully.
- Isolated Chromium render at 180px, 260px and 395px sidebar widths: all three Life Clock values visible without overflowing; narrow brand wraps and date/weather remain visible.
- Complete Status userscript executed in isolated Chromium DOM: ALL button active and switches to ONLY with native menu found **and** fallback branch case.
- GitHub private source and public release contents read back identical to generated files.
- Public SHA256 manifest updated to match the generated payload.
- Privacy pattern checks found no known private profile values in the three release files.

## Not yet verified
- Exact logged-in production ChatGPT DOM behavior.
- Real Tampermonkey/Stylus installation and render after updating to v7.3.
- Exact typeface rendering in the user's system: isolated Chromium does not have Pretendard/Kaushan Script installed.

## Rollback
The GitHub commit history retains the v7.2 sources. To restore through automatic updates, a new incremental version is required (version numbers must increase); do not downgrade metadata in-place. Alternatively, disable the new scripts and temporarily restore the saved previous known-good local backup. Never publish the LOCAL Profile.
