# Current UI design rules

Use the [current handoff](HANDOFF.md), [UI standard](UI-STANDARDIZATION.md) and [renderer guide](../renderer/README.md) for current implementation and tuning. Earlier Character pilot requirements and screenshots remain in [design history](ui-overhaul/README.md).

- All routes share the selected fixed Aurora backdrop and sidebar. Emerald is the default; Violet and Rose Gold supply matching accents, focus and selection. Theme/font preferences remain independent and apply to workspace text and inset surfaces where supported.
- Character places the wide Equipment workspace beside a narrower statistics rail, with resistance and skill context below. The grid stacks below 1050px. Keep the compact composition, portraits and Overview/Comparison states.
- Shared panels use LiquidGlassLayer from the shared UI directory. Settings uses a near-opaque outer dialog with no backdrop filter and lightweight tinted preference cards. Edit generator-owned glass rules in the Aurora generator, regenerate and rebuild before visual checks.
- Keep controls compact, motion restrained, and keyboard focus visible. Respect OS and app reduced motion. Preserve SpringSelect keyboard/search behavior, disclosure motion, Plan Switch behavior, dialog focus restoration and nested Escape handling.
- Item rarity, equipped cards, gems, portraits and tree symbols retain their game-specific colors, typography and artwork. Keep complete property, requirement, modifier and source evidence available.
- Gear edits are drafts until saved; dismissing a draft never saves it. Preserve class/level/campaign context synchronization, seeded crafting and RNG restoration on undo, save validation and session-memory storage fallback.

Check desktop and narrow layouts, all three Auroras, dialogs, open dropdowns, contrast and local-only requests in isolated storage. Rebuild tracked renderer output for renderer changes. Record new results separately from [historical QA](REACT-QA.md); a targeted check does not establish full mechanics or release acceptance.
