# ChatGPT UI · Simple Flat Vivid v7.2.0
**Release date:** 2026-11-22

## Scope
User-provided `Jaroo_Company_Simple_Flat_Vivid_v7.2_Refined.zip` is the design/content source.

Changes:
- RUN/DONE badges and top indicators: restored vivid neon pulse/glow.
- ALL/ONLY view filter: removes external border and tightens width; keeps original filtering behavior.
- Branding: Kaushan Script handwritten brand (Segoe Script fallback).
- Organizational tags: saturated pill background and white label, with existing role colors preserved.
- LIFE CLOCK: three metric cards in all sidebar widths, numeric values right-aligned in Korean '시간'; optional descriptions truncate in extremely narrow sidebar.
- Digital 7-segment clock behavior preserved.

**Files updated**:
- `chatgpt/clock.user.js` v3.7.2
- `chatgpt/status.user.js` v6.5.2
- `chatgpt/theme.user.css` v7.2.0

**Files unchanged**:
- `chatgpt/mapper.user.js` v1.3.2
- `calendar/companion.user.js` v1.3.7
- `calendar/theme.user.css` v1.2.2

## Privacy and compatibility adjustments
The supplied Clock source embedded life dates and location directly. The public release does **not** contain them. Instead, it reads the pre-existing local-only profile from `window.__jarooPrivateProfileV1`. A missing or invalid profile hides life metrics and prevents location weather retrieval. No local profile or personal information is uploaded.

Existing Tampermonkey `@name` and `@namespace` identities are preserved, along with `@updateURL` and `@downloadURL`; Stylus UserCSS has stable name/namespace and `@updateURL`.

## Verification
- Supplied ZIP internal SHA256 manifest: 14/14 entries verified.
- JS syntax (Node.js check): pass.
- CSS parser (tinycss2, 209 rules inside domain scope): no errors.
- Local profile compatibility (valid, absent, malformed): pass.
- GitHub private source and public release readback: pass.
- **Real Chrome rendering and in-place v7.2 update: pending user verification**.

## Rollback
Earlier versions remain in GitHub commit history. In case of an issue, disable new scripts/styles, restore previous known-good versions, or ask the design team to republish an incremented rollback release. Do not publish any copy of the private profile.
