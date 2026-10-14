---
name: osd-chart-toolbar
description: Preserve the v3.7 chart-first workspace when changing OSD Research Lab controls.
---

# Chart-first workspace

The default desktop workspace has two rows: replay and candle visibility, then four line-category switches with Chart settings. Next is the only filled primary action. Hide/Show candles must remain immediately beside Next. Category colours are slate blue for PDH/PDL, violet for all fractal levels, ochre for pivots, and teal for Fibonacci. Colour identifies category, not direction.

Never re-add the removed forward-value tile dashboard, separate category legend, duplicate candle or fractal switches. Remove old control factories and their handlers when replacing a component. Keep existing data, observation and pricing engines unchanged.

Chart settings is a native-button-controlled inline disclosure, closed on initial load. It contains the only current/history subsettings, live values and conditional history depths. More contains rewind, voice, SVG export and chart help. Menu and settings must support Escape and keyboard focus. Space/Enter on a control must not advance replay.

Master layer visibility preserves granular preferences; never reset their current/history/depth values on an OFF/ON cycle. Hiding H1 candles preserves scale and indicator geometry. D1 is independent. SVG export preserves layer visibility.

Use tidy-build.mjs and tidy-audit.mjs. The build is checksum-pinned to the public v3.6.3 application and assets. It outputs the full app and standalone ZIP; do not replace it with a demo. Audit real controls at 320-1920px, 200% zoom, replay, reload, category toggles and export. Compare chart geometry with the pinned prior release. Failed assertions fail the build. Inspect screenshots before delivery and recheck the stable production address after promotion.
