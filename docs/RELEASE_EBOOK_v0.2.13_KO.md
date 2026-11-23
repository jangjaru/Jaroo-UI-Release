# E-book 0.2.13 / helper 0.2.7 · Finishing layer

Requested on 2026-11-24.
- Previous JS + CSS applied multiple concentric borders to composer. New helper identifies the **innermost rounded ancestor with a native border or shadow** and applies the single accent outline there, while muting bordered outer composer ancestors. Markers and inline styles are reversible.
- Sent user bubble text gets a dedicated high-priority text rule: **standard prose font-size token (14px desktop), 600 weight, charcoal accent** on the bubble and nested text-bearing nodes; icons and buttons are excluded.
- Existing sidebar approved optical sizes, message bubble 28px radius, assistant table typography, Classic Paper grain, status controls remain untouched.
- Source validation does not equal live Chrome visual acceptance.
