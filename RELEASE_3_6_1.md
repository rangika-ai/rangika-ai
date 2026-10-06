# OSD Research Lab 3.6.1 — visible chart controls

The primary Hide candles / Show candles action is immediately beside Next in the sticky replay toolbar. A header shortcut brings this control into view. Fractal levels and Fractal history are in the same toolbar. Existing secondary controls are synchronized and preserved.

The action hides H1 bars and close ticks, not the indicators, scale or research calculations. D1 remains independent. Historical HF LOW and LF HIGH segments retain the causal same-type replacement logic.

Build with `node final-build.mjs`. The build runs both existing causal engines, the original browser regression suite, structure-view regressions, and the visible-control audit against the final artifact. Any failing check blocks publication.

After promotion, run `OSD_AUDIT_URL=https://researchlab-nu.vercel.app/ node final-audit.mjs` to repeat actual pointer, keyboard, responsive, persistence and file-integrity checks on the production URL from a fresh browser context.

The Probability Lab and the main Git branch are not modified. Only the Research Lab deployment is promoted. The original production deployment is retained as a rollback point.
