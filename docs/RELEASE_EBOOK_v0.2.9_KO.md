# E-book 0.2.9/JS 0.2.4 · Actual leaf correction

- F12 proof: sidebar real text span and right message paragraph both compute to 14px, despite visual size mismatch.
- Old 19.33px variable did not reach final rendered leaf even after stronger CSS selectors in 0.2.8.
- Set both actual project/chat title leaves to 16px optical trial, by exact CSS selectors and **reversible inline JS style**.
- Use the latest uploaded DOM `span[data-thread-title="true"]` and `[data-sidebar-cycle-item]` as references, and the known project row selectors.
- JS honors React's data; only inline typography is changed and cleaned on dispose.
- Fonts, color, paper texture, original Clock/Status/Mapper and other themes are untouched.
- Verify `diagnostics().opticalLeaves` and the real innermost Computed font-size; logged-in Chrome after-update visual acceptance pending.
