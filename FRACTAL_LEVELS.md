# OSD Research Lab — opposite-edge fractal levels

This preview preserves Rangika's complete deployed Research Lab, its H1 and D1 datasets, and existing research workflows. It adds an isolated causal fractal-level module rather than replacing the app with a demonstration dashboard.

## Rules

A strict high-fractal candidate requires the candidate high to exceed both preceding highs and the first following high. Its horizontal level is the **LOW** of the candidate candle. A strict low-fractal candidate is the mirror image, and its horizontal level is the **HIGH** of that candle.

After the first following candle closes, the candidate symbol and level pulse together. The second following candle either confirms the structure (solid level) or invalidates it (candidate removed). Equal extremes invalidate this strict five-bar implementation.

The latest confirmed high-fractal and low-fractal levels are independent. An older confirmed level remains while a replacement candidate develops. Only a new same-side confirmation replaces it. Rewind recalculates the appropriate historical state without reading future candles.

The Fractal levels button controls the new lines without changing the original fractal symbols. Reduced-motion browser preferences are respected.

## Verification

`npm test` runs 24 deterministic engine tests, including guarded access that throws on a future-record read. The build additionally tests original application loading, real-data candidate confirmation and invalidation, pixel alignment, synchronized animation, native replay navigation, visibility controls, original MFE/MAE entry timing, workflow controls, and mobile overflow in Chromium.

Build outputs include `engine-audit.json`, `browser-audit.json`, `build-report.json`, and a self-contained downloadable application archive. These reports describe checks actually executed; they are not a claim that every possible trading/data scenario has been verified.

## Deployment safety

All changes are on `osd-fractal-levels-preview`. The production branch is unchanged. The Vercel ignore command restricts this preview build to the Research Lab project, not the Probability Lab. Temporary source access is encrypted, branch-scoped, and used only while building; it is not included in the finished HTML.
