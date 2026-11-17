Source: design choice of change `futuristic-dashboard-ui`, 2026-11-17 (dark neon: navy-black base, cyan primary, violet secondary, subtle glow). Lives in `src/styles/global.css`: `.dark` block, the `--glow` role in `:root` and `.dark`, and `--shadow-glow` in `@theme inline`. Dark is the default through `class="dark"` on `<html>` in `src/layouts/Layout.astro`. `:root` light values are unchanged from `context/changes/dashboard-ui-contract/tokens.md`, except for the added `--glow`.

```css
:root {
  --glow: oklch(0.708 0 0 / 20%);
}

.dark {
  --background: oklch(0.14 0.03 265);
  --foreground: oklch(0.96 0.01 250);
  --card: oklch(0.19 0.04 265);
  --card-foreground: oklch(0.96 0.01 250);
  --popover: oklch(0.19 0.04 265);
  --popover-foreground: oklch(0.96 0.01 250);
  --primary: oklch(0.82 0.14 205);
  --primary-foreground: oklch(0.15 0.03 265);
  --secondary: oklch(0.26 0.06 290);
  --secondary-foreground: oklch(0.93 0.04 295);
  --muted: oklch(0.23 0.035 265);
  --muted-foreground: oklch(0.74 0.03 255);
  --accent: oklch(0.3 0.1 295);
  --accent-foreground: oklch(0.96 0.03 295);
  --destructive: oklch(0.72 0.19 22);
  --border: oklch(0.82 0.12 205 / 46%);
  --input: oklch(0.82 0.12 205 / 46%);
  --ring: oklch(0.82 0.14 205);
  --glow: oklch(0.82 0.14 205 / 35%);
  --chart-1: oklch(0.82 0.14 205);
  --chart-2: oklch(0.7 0.18 295);
  --chart-3: oklch(0.78 0.16 160);
  --chart-4: oklch(0.8 0.16 85);
  --chart-5: oklch(0.72 0.19 22);
  --sidebar: oklch(0.17 0.035 265);
  --sidebar-foreground: oklch(0.96 0.01 250);
  --sidebar-primary: oklch(0.82 0.14 205);
  --sidebar-primary-foreground: oklch(0.15 0.03 265);
  --sidebar-accent: oklch(0.3 0.1 295);
  --sidebar-accent-foreground: oklch(0.96 0.03 295);
  --sidebar-border: oklch(0.82 0.12 205 / 46%);
  --sidebar-ring: oklch(0.82 0.14 205);
}

@theme inline {
  --shadow-glow: 0 0 0 1px var(--border), 0 0 24px -4px var(--glow);
}
```

`bg-cosmic` is now `linear-gradient(to bottom, var(--background), var(--card), var(--background))`, so it follows the theme.

Values above are final: Phase 3 measured them (`## Measured contrast`) and raised `--border`, `--input` and `--sidebar-border` to 46% alpha.


## Measured contrast

Measured 2026-11-17 on the final `.dark` values (OKLCH converted to sRGB, WCAG 2.x relative luminance; translucent borders composited over the surface they sit on). Targets: text 4.5:1 or better, ring and border 3:1 or better.

| Pair | Ratio | Target | Result |
| --- | --- | --- | --- |
| foreground on background | 17.76 | 4.5 | pass |
| foreground on card | 16.49 | 4.5 | pass |
| muted-foreground on background | 8.65 | 4.5 | pass |
| muted-foreground on card | 8.04 | 4.5 | pass |
| primary-foreground on primary | 11.84 | 4.5 | pass |
| destructive text on card (`Alert` destructive; replaces the carried 3.97:1 light-mode figure for the dark default) | 6.62 | 4.5 | pass |
| destructive text on background | 7.13 | 4.5 | pass |
| secondary-foreground on secondary (`Badge`) | 12.71 | 4.5 | pass |
| accent-foreground on accent (current list item) | 12.45 | 4.5 | pass |
| ring on background | 11.98 | 3 | pass |
| ring on card | 11.13 | 3 | pass |
| border (46%) on background | 3.20 | 3 | pass |
| border (46%) on card | 3.23 | 3 | pass |
| input (46%) on card | 3.23 | 3 | pass |

Adjustment made: `--border`, `--input` and `--sidebar-border` started at 22% to 26% alpha and measured 1.57:1 to 1.84:1. They were raised to 46%, the lowest round value that clears 3:1 on both surfaces. The light-mode `:root` destructive pair is not measured here because light mode is not reachable (dark is the default and there is no toggle).
