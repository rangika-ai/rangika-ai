# OSD Research Lab 3.7.1

Add causal shading between HF LOW and LF HIGH. The band starts after both boundaries are known. Developing bands use the latest candidate on either side, while retaining the confirmed pair; failed candidates never become archived bands. Historical zones are optional (off by default) and require Historical levels. Bounds use the numeric minimum/maximum even when high/low structure crosses. Zero-height zones are not drawn. Shading is behind existing chart marks, clipped to the unchanged price scale.

Fractal lines use softer violet #94749f. Current width 1.65 / opacity 0.82; candidate width 1.5; historical width 1 / opacity 0.28. Text stays darker for readability. Other categories retain their colours.

The actual Next button moves to a fixed bottom-right dock when its original toolbar slot leaves the viewport while the chart workspace is in view. No duplicate button or second replay handler is introduced. It returns when the toolbar re-enters view; it is hidden during modal interaction or text entry, and placed above mobile controls/toasts. End-of-data disabled state and native keyboard activation are preserved.

Build: node zones-build.mjs. Audits: node zones-audit.mjs; set OSD_AUDIT_URL for live verification. The test suite reuses the 48 prior engine assertions, adds 16 causal-zone assertions, and exercises 80 browser checks at nine widths, including split view, single-step keyboard navigation, exported SVG and 200% enlargement. Automated tests are scoped checks, not a guarantee for every browser/dataset.

Source is pinned to the verified 3.7.0 SHA256 and retained in the downloadable ZIP for reproducible rebuilds. Data assets are verified against the existing manifest. Only the Research Lab project may build from this branch; production is promoted after review.
