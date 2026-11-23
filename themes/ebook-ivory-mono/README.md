# Jaroo E-book Classic Paper · 0.2.9

**2026-11-24. Optical sidebar text correction based on user's F12 screenshots.**

**Important observed fact:** The actual deepest sidebar chat title and the reference paragraph in the conversation both show computed `font-size:14px`, yet the sidebar appears smaller. The previous CSS 19.33px target was not reaching the visible text leaf.

This version is a **visual adjustment**, not a claim that both areas have the same CSS pixel size. We use an initial 16px optical target for **both sidebar project names and chat names**, leaving the main message body at 14px. The target may be tuned after direct screen comparison.

| Component | Version | Download |
|---|---|---|
| Stylus E-book CSS | **0.2.9** | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css) |
| Tampermonkey E-book visual helper JS | **0.2.4** | [indicators.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js) |

### What actually changed
- CSS selects `[data-thread-title="true"]` and all nested text spans **without relying on anchor or sidebar IDs**; selected project label spans are matched too.
- Helper JS applies reversible inline `font-size:16px!important` to the real visible leaf nodes, in case CSS cascade specificity would otherwise leave them at 14px.
- The script saves the previous inline style declaration and restores it if the theme is switched off.
- No changes to title text, React state, click handlers, messages, Clock/Status/Mapper, backdrop, color, paper texture, inputs, or model selection.

### Update
1. Export Stylus/Tampermonkey current settings to backup.
2. Update **both** E-book CSS to 0.2.9 and E-book helper JS to 0.2.4 (this time JS is necessary).
3. Keep other visual themes OFF, Clock/Status/Mapper ON.
4. Reload with `Ctrl+Shift+R`.

For diagnostic readback in Chrome console:
```js
window.__jarooEbookIvoryMonoV1?.diagnostics?.()
```
Check `opticalLeaves` (greater than zero when chat/project leaves were found) and `opticalTarget` (16px). Then select the innermost visible sidebar chat span in Elements → Computed → font-size. It should be 16px if the current theme is loaded. Evaluate the **visual size against the reference sentence**; final acceptance requires the user's actual Chrome screen.

### Rollback
Disable only E-book CSS and E-book helper JS, or reinstall earlier commits from E-book theme history. Core Clock/Status/Mapper stays enabled; do not delete local profile data.
