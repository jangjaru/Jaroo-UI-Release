# E-book v0.2.8 · nested chat text selector fix

**Issue confirmed by user's Chrome DevTools screenshot (2026-11-24):**
- Target inner displayed span: computed `font-size:14px`.
- Previously configured v0.2.7 title CSS: `14px + 4pt = 19.33px`.
- CSS font-family and letter-spacing were active, but the font-size did not reach the innermost text span.
- The current DOM contains `data-sidebar-cycle-item`, `a[href*="/c/"]`, `[data-thread-title]`, nested marquee spans, and `span[dir=auto] > span`.

**Change:** v0.2.8 adds strongly scoped rules for nested text-bearing spans; no other visual settings or JS changed.

**Acceptance:** Verify the actual selected innermost element reports `19.33px` in Chrome Computed. No claim of live pass until screenshot validation.
