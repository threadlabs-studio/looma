# Design Upgrade — Knit Parity

**Goal:** Looma components should look as polished as Knit components did before migration. This doc tracks the gap and upgrade work.

**Last updated:** 2026-03-07

---

## Token Additions (Done)

| Token | Knit equivalent | Purpose |
|-------|-----------------|---------|
| `--ui-shadow-xs` … `--ui-shadow-xl` | `--shadow-xs` … `--shadow-xl` | Elevation scale for buttons, menus, toasts |
| `--ui-radius-3`, `--ui-radius-4` | `--radius-lg`, `--radius-xl` | Larger radii for panels, menus |
| `--ui-font-size-xs`, `--ui-font-size-xl`, `--ui-font-size-2xl` | `--text-xs` … `--text-2xl` | Typography scale |
| `--ui-font-normal` … `--ui-font-bold` | `--font-normal` … `--font-bold` | Font weights |
| `--ui-surface-subtle` | `--color-bg-tertiary` | Deeper hover states |
| `--ui-space-7`, `--ui-space-8` | `--space-10`, `--space-12` | Spacing scale |

---

## Component Polish (Done)

- **Button:** radius-2, font-medium, solid variant gets shadow-xs → shadow-sm on hover
- **Input:** radius-2, hover border-strong, focus ring (accent-soft glow) + border-focus
- **Menu:** shadow-lg, radius-3, min-width 12rem, menu-item font-medium, hover surface-subtle
- **Tooltip:** radius-2, surface-elevated, shadow-md, larger padding
- **Toast:** radius-3, surface-elevated, shadow-lg, more padding
- **Dialog:** Already had shadow-dialog (xl), radius-dialog

---

## Completed (Knit Parity)

1. **Semantic colors** — danger, success, warning, info (tokens + theme overrides)
2. **Badge variants** — solid/soft variants for accent, danger, success, warning, info
3. **Popover** — shadow-lg, radius-3, surface-elevated, matches menu
4. **Tabs** — Underline/indicator styling, active state, vertical orientation
5. **Checkbox/Switch** — Accent color when checked, focus-visible ring
6. **Default font** — Inter-first stack in `--ui-font-family-sans`
7. **Button variant** — `destructive` uses danger tokens
8. **Storybook stories** — Form showcase (validation), Dialog showcase (actions), Menu showcase (icons)

---

## Reference: Knit Token Scale

From `knit/web/app/assets/styles/tokens.css`:

- **Shadows:** xs, sm, md, lg, xl
- **Radius:** xs (2px), sm (4px), md (8px), lg (12px), xl (16px), 2xl (20px)
- **Spacing:** px through 24 (0.125rem … 6rem)
- **Text:** xs (12px) through 4xl (36px)
- **Font weights:** 400, 500, 600, 700
- **Semantic:** danger, success, warning, info + subtle variants
