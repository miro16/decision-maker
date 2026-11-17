# Tie-breaker wheel: measured contrast

Measured 2026-11-17 on the final `.dark` values, with the same method as `context/changes/futuristic-dashboard-ui/tokens.md` (OKLCH converted to sRGB, WCAG 2.x relative luminance). Targets: text 4.5:1 or better, non-text parts 3:1 or better.

The wheel uses `chart-1` to `chart-4` as slice fills (`chart-5` is the error red and is skipped), `background` for the slice labels, `card` for the slice dividers, and `foreground` with a `background` outline for the pointer.

| Pair | Ratio | Target | Result |
| --- | --- | --- | --- |
| label (`background`) on `chart-1` | 11.98 | 4.5 | pass |
| label (`background`) on `chart-2` | 6.98 | 4.5 | pass |
| label (`background`) on `chart-3` | 10.63 | 4.5 | pass |
| label (`background`) on `chart-4` | 10.55 | 4.5 | pass |
| pointer (`foreground`) on `card` | 16.49 | 3 | pass |
| pointer outline (`background`) on `chart-1` to `chart-4` (lowest) | 6.98 | 3 | pass |
| slice divider (`card`) on `chart-1` / `2` / `3` / `4` | 11.13 / 6.48 / 9.88 / 9.80 | 3 | pass |
| slice edge (`chart-1` to `chart-4`) on `card` (lowest) | 6.48 | 3 | pass |

Adjustment made: none. Every pair passes with the existing values, so `src/styles/global.css` is unchanged.

Notes:

- The pointer tip overlaps the rim, where `foreground` against the fill alone is only 1.48:1 to 2.54:1. The pointer therefore carries a `background` outline, which measures 6.98:1 or better against every fill, and the outline is what separates it from the slice.
- Adjacent slices never share a fill (`sliceFill` in `TieBreakerWheel.tsx` avoids the wrap-around match), and a `card` divider separates them anyway.
- Above 12 candidates a name no longer fits a slice, so the slice shows its number (same `background` on fill pairs, 6.98:1 or better) and the list beside the wheel is numbered to match.
- Labels turn with the wheel, so a label can be upside-down when its slice is in the upper half. The names are also in the visible list, in each slice `<title>`, and in the result block, so no information is only on the wheel.
