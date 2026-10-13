# OSD Research Lab 3.6.3 — One colour per category

The complete Research Lab is preserved. This release changes the presentation of four indicator categories, not prices, research calculations, replay causality or historical endpoints.

| Category | Shared colour | Included levels |
|---|---|---|
| Previous day | Slate blue `#335f83` | PDH and PDL |
| Fractal structure | Muted violet `#79518a` | HF LOW and LF HIGH, both originating fractal symbols |
| Daily pivots | Ochre `#89631d` | P, R1, S1, R2, S2 |
| Fibonacci | Teal `#0b7371` | Upper/lower projections and all history |

Current indicator lines are solid. Historical segments retain the same category colour at 42% opacity with 1.05px line width. Developing fractals retain their dashed, synchronized blink after +1 and confirmation/invalidation after +2. Labels distinguish individual levels. Price bars, trade/risk overlays, coordinates and calculations remain unchanged. The Hide/Show Candles button stays beside Next.

The previous two-colour fractal module is removed from the final artifact. Category tags explicitly identify rendering elements so palette changes cannot inadvertently recolour a stop or MAE line that formerly reused a colour.

Run `node category-build.mjs` for the full clean build (OSD_REFERENCE_BUILD_URL required by the original-source build). This builds and checks the original app before applying the category release, then reruns all regression suites and the new category checks against the final artifact. Build failures block release. A complete downloadable ZIP is produced.

For post-deployment verification use `OSD_AUDIT_URL=<live-url> node .category-final-audit.mjs` and `OSD_CATEGORY_AUDIT_URL=<live-url> node category-colours-audit.mjs`. Both verify the actual served HTML checksum against the final build, rather than relying solely on a release manifest.
