# UI overhaul workspace

## Character-only design pilot — current

The user rejected the initial cosmetic pilot and explicitly required DESIGN.md to be followed to a T. Character presentation is now structurally rewritten with the reference palette, type, spacing and components. Other screens retain their previous design; the shared sidebar matches the pilot only while Character is visible. See [pilot details](CHARACTER-PILOT.md). This supersedes earlier preparation-only statements below. Await user review before extending the design across the app.


Status: Character pilot implemented, refined and wrapped up. The next major task is unspecified; start with ../HANDOFF.md and ../NEXT-TASK.md. Whole-app rollout has not been requested.

The user requested a complete UI overhaul intended as a more final iteration. This is its starting point. The current app is the functional baseline. Previous design guidance records the last approved iteration; update it deliberately as the new direction is defined.

## Directory ownership

| Work | Location |
| --- | --- |
| Overhaul brief, decisions and release checks | `docs/ui-overhaul/` |
| New reviewable visual experiments | `prototypes/ui-overhaul/` |
| Production screens, feature models and styles | `crafting-ui/features/<feature>/` |
| Reusable controls and DOM helpers | `crafting-ui/shared/ui/` |
| Shell, navigation, cards and inspectors | `crafting-ui/shared/layout/` |
| Design tokens and global styles | `crafting-ui/styles/` |
| Pure mechanics | Existing engine directories |
| Data, artwork, archives and licenses | Existing locations, preserved |

Keep one production UI in this root. Add shared components when real consumers need them. Update explicit server routes and dependent imports together when moving production files. Preserve historical prototypes rather than treating them as current designs.

## Sequence

1. Define visual direction, navigation, hierarchy and shared states; record decisions here and build previews in the prototype folder.
2. Establish shared tokens, shell, typography and controls before redesigning screens.
3. Integrate complete screens using existing models, engine APIs and persistence. Consult the inventory before changing Character structure.
4. Verify cross-screen actions, accessibility, narrow layouts and saves. Retire superseded presentation code after its replacement works.
5. Update UI-DESIGN.md, feature docs, previews and handoff to describe the finished implementation.

No new palette, typography, navigation, framework or component library is selected. Preparation does not imply a dependency migration. The existing approved Character layout remains the running baseline until replaced through the overhaul. Game item cards retain fixed reference colors/fonts unless the user changes that requirement.

Read [inventory](INVENTORY.md) and [release checklist](RELEASE-CHECKLIST.md). Root README.md remains the master handoff.
