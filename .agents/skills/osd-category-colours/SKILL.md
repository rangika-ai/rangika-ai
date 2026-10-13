---
name: osd-category-colours
description: Preserve OSD Research Lab's one-colour-per-category invariant for chart indicators, labels, histories and exports.
---

# OSD category colour invariant

Use with the existing osd-ui-consistency skill. Colour identifies an indicator category, never high/low or support/resistance direction.

PDH and PDL must share slate blue. HF LOW and LF HIGH must share muted violet. Daily pivot P and every resistance/support level must share ochre. All upper/lower Fibonacci projections and histories must share teal. Keep four category colours distinct. Use the palette in category-colours.js as the source of truth.

State is shown by line weight, opacity and animation: current solid/prominent; history same hue, thin and faded; developing fractal same hue, dashed and blinking. Never remove a provisional dash during repeat synchronization. Never recolour risk/MAE/stop lines by globally replacing a shared hex colour. Use explicit category metadata on renderer elements, matching label text, label borders, readouts, legends and touch markers; leave paper backgrounds neutral.

A new colour change must preserve every SVG price coordinate and historical endpoint, current replay position, all calculations, Hide/Show Candles operation and saved preferences. Verify both directions with nonempty fixtures, all pivot sets, every history, and actual exported SVG attributes. Test the palette and accessible text contrast separately from intentionally faded history. Repeat sync and replay to catch styling regressions. Test the existing nine responsive widths and 200% enlargement. Inspect actual screenshots; DOM presence alone is not a visual audit.

Run the existing engine/browser suites and category-colours-audit.mjs on the final app. Do not run the obsolete v3.6.2 tests that require separate high/low colours. After deployment verify the actual served HTML checksum and rerun interaction/category checks on the stable URL.
