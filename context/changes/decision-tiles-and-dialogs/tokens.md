# Decision tiles and dialogs: measured contrast

Measured 2026-11-17 on the final `.dark` values with the same method as `context/changes/futuristic-dashboard-ui/tokens.md` (OKLCH converted to sRGB, WCAG 2.x relative luminance; translucent borders composited over the surface they sit on). Targets: text 4.5:1 or better, border and ring 3:1 or better.

Tiles use `card` (surface), `foreground` (title), `muted-foreground` (dashed New decision tile), `border`, and for the current tile `accent`, `accent-foreground` and `shadow-glow`. Dialogs use `card`, `foreground`, `border` and `shadow-glow`, over a `background` backdrop at 80% opacity with a blur. No new token or value was introduced.

| Pair | Ratio | Target | Result |
| --- | --- | --- | --- |
| foreground on card (dialog text, tile title) | 16.49 | 4.5 | pass |
| muted-foreground on card (New decision tile, hints) | 8.04 | 4.5 | pass |
| accent-foreground on accent (current tile, hover) | 12.45 | 4.5 | pass |
| tile border (46%) on card | 3.23 | 3 | pass |
| dialog border (46%) on card | 3.23 | 3 | pass |
| dialog border (46%) against the dimmed page (backdrop 80% of `background` over `card`) | 3.43 | 3 | pass |
| ring on card (focused tile or button) | 11.13 | 3 | pass |
| ring on the dimmed page | 11.83 | 3 | pass |

Adjustment made: none, `src/styles/global.css` only gained the page scroll lock (`html:has(dialog:modal)`), no colour.

Notes:

- The dashed border of the New decision tile uses the same `border` token as the other tiles (3.23:1); dashed only changes the shape.
- A `focus-visible` ring on a tile is `focus-visible:ring-3 focus-visible:ring-ring/50`, the same ring the buttons use (the repo scan rejects the `ring-[3px]` form).
