# OSD Research Lab v3.7.0

Two-row chart workspace replaces the duplicated forward-value tile dashboard and legends. Previous, Next and Hide/Show candles remain immediately available. Four category switches both control visibility and identify colours. Chart settings groups live values and history options; irrelevant depth fields disappear. More preserves rewind, voice and chart SVG export. The release badge moves to the footer.

Data, causal fractal and historical engines, D1 context and observation workflow remain based on the full v3.6.3 application. Category visibility preserves saved current/history preferences.

Build: npm install && npm run build. Test the served public/index.html with npm test. Live audit: OSD_AUDIT_URL=https://researchlab-nu.vercel.app/ node tidy-audit.mjs.

The builder verifies its v3.6.3 source and every preserved asset against SHA256. The output ZIP includes the pinned source for future repeatable builds. No private account tokens are bundled.
