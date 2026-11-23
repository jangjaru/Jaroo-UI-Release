# E-book CSS 0.2.11 · Table Typography and Message Bubble Radius

Date: 2026-11-24.

**Only changes:**
- Standard assistant response tables get `font-size:calc(var(--eb-ui-size) + 1.5pt)` on cells and nested rendered DIL/HTML text. Desktop at base 14px = **16px**.
- User message bubble border-radius changed from **14px to 28px** to match the soft rounding of the black JS update bar on short messages.
- Existing bubble 2.5px border, transparent fill, fonts, colors, layout and paper texture unchanged.
- Approved sidebar sizes remain unchanged; E-book JS v0.2.5, Clock, Status, Mapper and other themes are untouched.

CSS code/source reviewed; signed-in Chrome visual verification pending.
