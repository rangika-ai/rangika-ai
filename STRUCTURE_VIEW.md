# Structure-only view — 3.6.0

The full original Research Lab is retained. No production promotion is part of this change.

Set Candles Off, Fractal Levels On and Fractal History On to study H1 structure without price bars. Candles controls H1 price rectangles and close ticks only; D1 context remains independent. Indicators, axes, replay and measurements do not change when hiding candles.

Historical HF LOW levels use the low of each confirmed high-fractal origin candle; LF HIGH levels use the high of each confirmed low-fractal origin candle. Lighter segments end at the next same-side confirmation, never at an unconfirmed candidate. Failed candidates are not archived. Rewinding reopens segments as appropriate and removes future confirmations.

The history and candle preferences persist locally. Fractal Levels is the master visibility control; disabling it preserves the history preference. New controls reuse the two-line fib-control-box component, keyboard focus and native Enter/Space activation without triggering replay.

The build runs the original 24 fractal engine tests, 24 new history engine tests, the original browser/UI regression suite and the additional structure-view suite. Any failing assertion blocks deployment. Results: audit-summary.json, engine-audit.json, structure-engine-audit.json, browser-audit.json and structure-browser-audit.json.
