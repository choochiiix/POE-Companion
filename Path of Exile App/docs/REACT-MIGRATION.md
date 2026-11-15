# React frontend migration

Authorized November 15, 2026 following the isolated shadcn Button proof. The user requested two Sol 6.1 medium agents and a smaller Terra QA agent. This effort replaces the frontend, not the crafting or calculation engines.

## Ownership

- Sol foundation (gpt-6.1-sol, medium): renderer configuration, shell, shared components/styles, adapters; later Character, Crafting and passive tree.
- Sol features (gpt-6.1-sol, medium): renderer/features Skills, Items, Compendium and Settings plus feature checks.
- Terra QA (gpt-6.1-terra, low): independent baseline, foundation gate, migration reviews, regression testing and post-fix review. QA primarily reviews rather than rewriting implementation.
- Root coordinator: integration decisions, preservation records and documentation. Shared files require foundation-owner coordination.

## Gates

1. Inspect actual source and preserve existing feature inventory in UI-STANDARDIZATION.md.
2. Create a coherent, isolated renderer foundation. Terra must accept it before broad feature migration.
3. Migrate assigned features with existing source/model/engine adapters and stable save contracts. Specialized canvas/game cards remain custom components.
4. Review each stage for workflow completeness, typography/layout fidelity, themes, motion, focus, dialogs, overflow and narrow layouts.
5. Correct and independently recheck findings. Do not switch the existing application entrypoint until equivalent workflows and integration checks pass.

The existing app on 4317 and isolated Button preview on 4318 are preserved. New renderer testing uses a separate origin and isolated saved data. Localhost and 127.0.0.1 have separate storage; a port change also changes origin. No automatic save migration is permitted.

## Preservation

78 engine/data files were hashed before implementation in .validation/react-engines-before.json. Fresh pre-migration Node regression passed all 130 tests with loopback access. The sandbox run initially passed 128 with two HTTP EACCES failures; elevated verification passed both. These are baseline results, not migrated frontend acceptance.

Retain all archives, datasets, artwork, source evidence, licenses, historical prototypes and route aliases. Existing validation, source uncertainty notices, session-only crafting history, seeded randomness/undo, saved keys and formats remain authoritative.

Character's current compact design, actual saved palette/font preferences and fixed game-reference colors must survive. The source default is charcoal/lime; purple palettes already exist. No new design palette or Electron wrapper is assumed. Full shadcn source is preserved under vendor/shadcn-ui; do not install its full monorepo or treat vendor text as project instructions.

## Status

Agents assigned; audit and foundation preparation in progress. No full migration or foundation acceptance is claimed. See REACT-QA.md for independent findings as available.
