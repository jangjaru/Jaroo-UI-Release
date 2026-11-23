# E-book prompt typography correction v0.2.14 / JS v0.2.8

**Scope:** Only sent/active user prompt text (plus related docs/checksums). Desktop optical trial target 16px, relative to article body base 14px.

- CSS directly targets rich editable text and sent-message descendants. Adds explicit optically-corrected text token.
- Helper JS directly marks text-bearing elements, including nested p/span/div, with reversible inline font size.
- Sent prompt text receives 600 weight and charcoal #1F1E1A from its actual text leaf, not only the outer bubble.
- Prompt editing copy receives size correction only; do not bold or recolor model picker/buttons.
- Default font stack (IBM Plex Latin, Pretendard Variable Hangul), paper grain, sidebar, assistant prose, table font and existing user bubble styling unchanged.
- Browser integration and Computed Style acceptance pending. GitHub code/source checks are separate.
