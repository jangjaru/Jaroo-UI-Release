# E-book helper JS 0.2.5 — chat titles only −1pt

2026-11-24.

Actual chat name text is styled by E-book JS's `enforceOpticalSidebarText()`, which applies inline `font-size: ... !important`. The user reports that CSS v0.2.10 alone did not visually reduce chat title text.

The function now maintains two sizes: **chatSize="14.667px"** explicitly for text within `[data-thread-title]`, and `projectSize` read from the existing root `--eb-nav-optical-size` for project names. Only the chat size was deliberately changed; the existing project behavior and all other components are retained.

No public CSS update is needed. E-book CSS remains 0.2.10, E-book JS rises 0.2.4 → **0.2.5**. The script restores original inline properties on dispose.

Verification: JS syntax and source/distribution consistency; final live Chrome computed style pending.
