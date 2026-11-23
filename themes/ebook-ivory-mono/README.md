# Jaroo E-book Classic Paper CSS v0.2.8

**2026-11-24 · actual DOM selector correction**

The user's Chrome F12 capture showed the real visible chat-name span is **14px** (font-weight 450, letter spacing -0.49px), even though v0.2.7 CSS intended **19.33px**. The DOM includes:
`[data-sidebar-cycle-item] a[href*="/c/"] [data-thread-title] ... span[dir="auto"] > span`

The previous selector targeted the outer anchor / title container; nested spans still carried their own 14px. This release targets the nested `span` and `div` text nodes directly with the existing `--eb-chat-title-size` variable.

- Expected inner chat-name size: **19.33px**.
- Project title remains **15.33px**; other sidebar text remains **16.67px**.
- No right-side body, composer, font, color, texture, Clock, Status or Mapper changes.
- **Stylus E-book CSS only** updated to **0.2.8**. E-book Tampermonkey JS remains **0.2.3**.

Install/update: [Stylus E-book CSS v0.2.8](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css), then `Ctrl+Shift+R`.

After installation, select the innermost visible chat-title span again in F12 → Computed → `font-size`. Expected: approximately **19.33px**. This has been source-validated, not yet measured in signed-in Chrome after installation.
