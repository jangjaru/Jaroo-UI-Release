# Jaroo E-book · Cool E-Ink Graph Paper

**2026-11-24 · Stylus CSS v0.2.31 / Tampermonkey JS v0.2.22**

This update modifies the existing Classic Paper theme; it is **not** a separate mockup or a second overlay.

## What's changed
- Cool graphite e-paper palette: main `#EFF1F2`, sidebar `#E7EAEB`, panels `#F5F6F6`, body ink `#292D30`, accent `#303438`.
- Subtle 22px square notebook grid, preserving the existing embedded paper-grain image.
- '새 채팅' and 'Dot' labels now match project labels: 16px / weight 650.
- Current selected conversation heading: 16px → 24px and soft lime marker `#D8EA8B`, only on the active breadcrumb.
- **Sent** user prompts: 15px → 15.667px (+0.5pt), weight 650 → 520, charcoal ink. Editable composer remains 16px.
- E-book Clock skin follows the cooler neutrals while preserving segmented digits, Life Clock and existing animations.

## Install / update in place
- [Stylus CSS v0.2.31](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)
- [Tampermonkey JS v0.2.22](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

Update the **existing** two extension entries rather than installing duplicates. In Stylus and Tampermonkey, run the built-in **Check for updates**, then reload ChatGPT with `Ctrl + Shift + R`.

Do not enable the older Dracula / Flat Neon visual themes simultaneously. Leave Clock v3.10.2, Status v6.8.2 and Mapper v1.3.6 enabled as before; the update does not edit those scripts.

## Validation and rollback
Use the ChatGPT page console:
```js
window.__jarooEbookIvoryMonoV1?.diagnostics?.()
```
Expected: JS `version: '0.2.22'`, `sentPromptTarget: '15.667px'`; a selected chat should produce `headerMarkers: 1` when its title is visible. CSS version is `0.2.31`.

To roll back, use the extensions' version history or the previous Git commit of the two E-book files. This release is code-published and statically checked, but **the user's signed-in Chrome rendering and updates have not been verified in this chat**.

Existing private scripts, personal profiles, credentials, RUN/DONE controls, click handlers and Chrome browser chrome remain untouched.
