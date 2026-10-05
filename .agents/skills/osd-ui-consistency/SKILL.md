---
name: osd-ui-consistency
description: Match new and repaired OSD Research Lab controls to the existing interface. Use for UI additions, typography fixes, toolbar layout, responsive behaviour, toggle states, and visual regression review.
---

# OSD Research Lab UI consistency

Scope: the Research Lab source and its osd-fractal-levels-preview branch. Preserve the existing application, data, causal calculations, and research workflow. Do not redesign unrelated apps or promote a preview without authorization.

## Start from the actual component

Inspect the neighbouring control's HTML and computed styles, not just its class name. Reuse its complete component structure, visual hierarchy, spacing, typography, colors, border, radius, shadow, and state classes. Read the responsive rules for its parent before adding a sibling.

For the forward-value controls the shared structure is:

```html
<button class="fib-control-box" type="button" data-sound="toggle" aria-pressed="false">
  <span class="control-label">Control name</span>
  <b class="control-value">Off</b>
</button>
```

Update only `.control-value` when the state changes. Never assign `button.textContent` to a structured control; that destroys the typography component. Use `active` for its enabled state. Keep the button's accessible name stable and express state with `aria-pressed`.

## Layout and interaction

Adding a control changes the number of grid items. Define all tracks or named areas, including the help button. Avoid implicit rows, squeezing a select into a help-sized column, overlaps, or horizontal scrolling. Keep Current Fib and Fractal Levels adjacent. At narrow widths allow an intentional second row without shrinking labels or touch targets. Use the existing design tokens, not new per-control visual overrides.

Use native buttons with Enter/Space activation. A focused toggle must not also activate the replay's Space shortcut. Keep visible keyboard focus; suppress pointer-only focus rings with `:focus:not(:focus-visible)` rather than removing outlines globally. Preserve reduced-motion support and saved toggle preferences.

## Verify before delivering

Check the real app at 320, 390, 430, 700, 768, 1024, 1280, 1440, and 1920 CSS pixels and at enlarged zoom. Compare label/value font family, size, weight, line-height, padding, height, borders, colors, and alignment against the neighbouring control. Check on/off, hover, pointer focus, keyboard focus, Tab, Enter, Space, repeated replay renders, and reload persistence. Capture screenshots and inspect them. Assert controls do not overlap or overflow their own container; document-width checks alone are insufficient.

Run the existing 24 deterministic engine tests and browser workflow checks as well as `ui-controls-audit.mjs`. Failed checks must fail the build. Do not describe a deployment as visually verified merely because it built successfully.

Reference: Vercel Web Interface Guidelines, https://vercel.com/design/guidelines and https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines. Apply the interaction and accessibility guidance while preserving OSD's existing visual language.
