# Five-palette validation

Validated October 17, 2026. Implementation commit: `b4b2a52`.

## Automated checks

- TypeScript typecheck passed.
- 28 Vitest checks passed, including BB settings save/reload, invalid values, migration from settings without a palette, preview/Undo/Apply, renderer output, readable contrast, and preserving the breathing clock and ripples during color changes.
- 18 native Claude plugin tests passed. The added lifecycle case verifies all five palettes on Desktop SVG and terminal Raster surfaces, preview isolation from the live banner, Undo/Close, Apply, retained selection, and merging concurrent timing changes.
- BB and Claude builds passed. Generated Claude code matched the source.
- Strict Claude plugin and marketplace validation passed.
- `git diff --check` passed.

## Visual checks

The production wave renderer was inspected for all five palettes on light and dark surfaces. The production BB settings component was exercised in a source preview, including 392px and 252px widths, keyboard radio navigation, visible focus, Apply, and reduced motion. The narrow palette selector wraps to three options plus two; measured scroll width equals client width. The source preview reported no browser warnings or errors.

The installed BB plugin was rebuilt from the stable repository and reloaded. Live checks in the active thread confirmed five named options; Sage affected the draft preview before Apply while the banner stayed Lavender. Apply closed the popup and recolored the live banner. Sage remained selected after a plugin reload. Enablement and the user's 6/7/8 timing remained unchanged. Lavender was restored afterward, and settings were closed. No browser warnings/errors or plugin handler errors were observed.

Installed BB bundle hash: `63b17523c241368d`.

## Scope and limits

Live BB verification used the user's current dark appearance. Light appearance and narrow layouts were checked in the source preview. Contrast tests cover six representative surfaces, not arbitrary custom host themes. Native Claude plugin tests exercised both rendering surfaces and callbacks; a separate live Claude Desktop window was not visually verified for this change. The installed Claude plugin reads from the updated local `claude/` directory; already-running sessions need a restart.

These checks were completed before publication. The five palettes are included in the v0.1.1 release; the immutable v0.1.0 artifact retains its original Lavender-only wave.
