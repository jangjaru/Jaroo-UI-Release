# E-book Classic Paper v0.2.12 / JS v0.2.6 — Release Notes

2026-11-24. Targeted visual fixes on user's latest annotated composer image.

| Area | Before | After |
|---|---|---|
| Sidebar chat title | 14.667px | **15.333px (+0.5pt)** |
| Sidebar project title weight | 600 target / possibly inherited lighter inner text | **650, including nested rendered leaves** |
| Composer visual border | Not visibly apparent in Chrome | **2.5px charcoal #1F1E1A**; JS marks and styles the actual outer frame |
| Composer radius | 18px | **18px** |
| Shadow | None intended | Removed on actual frame |
| Body prose, table, user bubble, paper texture | Existing approved values | No change |

The CSS and E-book JS are both modified because earlier attempts proved that changing CSS alone did not affect some ChatGPT inner text nodes. E-book JS saves the original inline weight and border-related styles and restores them if the visual script is disabled.

Static source checks are not proof of correct appearance on signed-in ChatGPT; confirm real Chrome result after updating both components.
