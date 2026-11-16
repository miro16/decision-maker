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
  --border: oklch(0.82 0.12 205 / 22%);
  --input: oklch(0.82 0.12 205 / 26%);
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
  --sidebar-border: oklch(0.82 0.12 205 / 22%);
  --sidebar-ring: oklch(0.82 0.14 205);
}

@theme inline {
  --shadow-glow: 0 0 0 1px var(--border), 0 0 24px -4px var(--glow);
}
```

`bg-cosmic` is now `linear-gradient(to bottom, var(--background), var(--card), var(--background))`, so it follows the theme.

Contrast measurements are added in Phase 3 (`## Measured contrast`); values above are the Phase 1 starting values.
