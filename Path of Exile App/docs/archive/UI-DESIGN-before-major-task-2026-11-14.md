# Ayu Aurora — current interface direction

## Character-only design pilot — current

The user rejected the initial cosmetic pilot and explicitly required DESIGN.md to be followed to a T. Character presentation is now structurally rewritten with the reference palette, type, spacing and components. Other tabs/shared shell remain unchanged. See [pilot details](ui-overhaul/CHARACTER-PILOT.md). This supersedes earlier preparation-only statements below. Await user review before extending the design across the app.


## Overhaul status

The user is preparing a complete, more final UI iteration. This document records the previous approved design baseline, not a newly selected direction. Start at [the overhaul workspace](ui-overhaul/README.md). Update this guidance as the new design becomes concrete; preserve working features, saves, offline behavior and fixed game-reference item-card styling.


The root README.md is the primary handoff. This document summarizes the current design rules; earlier theme experiments and screenshots are historical, not competing instructions.

## Preserve across new features

- Personal PoE workbench with existing Character, Crafting and Skill tree screens. No invented dashboard content or marketing copy.
- Ayu Aurora backgrounds `#0A0E14`, `#0F1419`, `#151B22`; text `#E6E1D9` / `#B3B1AD`; amber `#FFB454`, gold `#E6B450`, complementary blue `#59C2FF`, lime `#AAD94C`.
- Readable muted text uses `#939CA5`. `#6C7680` is decorative, not a small-text color.
- Shared tokens in `crafting-ui/styles/style.css`, with 12/16/20px radii, an 8px spacing scale, faint panel borders, restrained shadows and one diffused background-lighting treatment. Amber/gold dominates; blue remains secondary. Avoid purple/pink, neon bloom or strongly blue-tinted glass.
- Dark, mostly opaque glass panels with blur where supported. Opaque controls and floating node content. Keep functional control boundaries stronger than decorative panel borders.
- Primary amber actions, understated secondary actions, visible hover and focus states. Respect reduced motion, reduced transparency, increased contrast and forced colors.
- Geist/Inter preferred with local Segoe UI/system fallback. Preferred font files are not bundled yet. No remote font requests.
- Preserve tall body armour, helmet above, jewellery beside the torso and lower belt/gloves/boots, with vertical breathing room.
- Full-width tree; matching SVG/canvas symbol legend; hover details and click-to-pin controls. Preserve non-color selection cues and keyboard search.

## Accessibility and verification

Aim for normal text >=4.5:1 and essential control/state indicators >=3:1. Check actual composited backgrounds after lighting/transparency changes. Keep labels, keyboard focus, native select semantics and accessible state announcements. Verify desktop, narrow screens and zoom/reflow; ensure floating panels remain dismissible and usable.

Sampled Ayu Aurora pairs: primary text on elevated surface 13.32:1; secondary 8.09:1; readable muted 6.22:1; dark text on amber 10.97:1; control boundary on selected surface 3.66:1. These are targeted measurements, not a full WCAG audit.

CSS token references, brace balance and sampled color pairs were checked. Character was opened successfully after the theme change. Complete final-theme desktop/mobile, hover and keyboard QA remains outstanding; earlier usage-limit interruptions do not waive future verification.

Reference guidance: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html, https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html, and MDN documentation for backdrop-filter and prefers-reduced-transparency.

## Shared implementation

`styles/tokens.css` owns the palette, spacing/type scale, radii and focus ring. `shared/layout/cards.css` owns common item/gem structure; feature CSS retains their distinct reference palettes and densities. `shared/layout/navigation.js` owns screen selection. `shared/layout/library-layout.js` owns inspector visibility and focus restoration. Inline definition terms explicitly have no minimum control height; their focus outline is retained.
