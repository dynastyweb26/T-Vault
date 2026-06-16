# T-Vault UI Design System

Design rules for all screens and components. Use CSS custom properties and `tv-*` utility classes — never hardcode hex colors in components.

## Colors

All colors must use theme tokens from `app/globals.css`:

| Token | Usage |
|-------|--------|
| `--color-bg` | Page background |
| `--color-surface` / `--color-surface-elevated` | Cards, panels |
| `--color-input-bg` | Input fields |
| `--color-panel-solid` | Solid bottom sheets, modals |
| `--color-shell-border` | Borders, dividers |
| `--color-text-primary` | Headings, body |
| `--color-text-secondary` | Labels, subtitles |
| `--color-text-muted` | Captions, hints |
| `--color-accent` | Gold brand, links, CTAs |
| `--color-on-accent` | Text/icons on gold buttons |
| `--color-success-*` / `--color-danger-*` / `--color-warning-*` | Status |

Do not use `#050505`, `#E9E1D7`, `#99907E`, `text-white`, `bg-black`, or `border-white/5` in components.

## Typography

| Class | Use for |
|-------|---------|
| `tv-page-title` | Screen titles (28px bold) |
| `tv-section-header` | Section headings (20px semibold) |
| `tv-card-title` | Card headings (18px bold) |
| `tv-body` | Body copy (17px) |
| `tv-label` | Form labels (12px uppercase mono) |
| `tv-caption` | Meta text (11px uppercase mono) |
| `tv-key-number` | Hero numbers (32px mono) |
| `tv-tabular` | Currency, dates, counts |

## Tap targets

Minimum interactive size: **44px** (`h-11`, `size-11`, or `min-h-11 min-w-11`).

- Primary buttons: `TvButton` (`h-14`)
- Secondary/outline: `tv-outline-btn` / `tv-accent-outline-btn` (`h-11`)
- Icon-only actions: wrap in `tv-icon-btn` (`min 44×44px`)
- Bottom nav tabs: `min-h-11` with adequate padding

## Spacing

- Page horizontal padding: `px-5`
- Card radius: `rounded-2xl`
- Section gaps: `gap-3` or `gap-4`
- Card padding: `p-4` or `p-5`
- Bottom nav clearance: `pb-32` on main content

## Components

| Pattern | Class / component |
|---------|-------------------|
| Primary CTA | `TvButton` variant `primary` |
| Secondary CTA | `TvButton` variant `secondary` |
| Gold outline CTA | `TvButton` or `tv-glow-gold-outline-btn` |
| Outline action | `tv-outline-btn` |
| Accent outline | `tv-accent-outline-btn` |
| Cards | `tv-glass-card` |
| Inputs | `TvInput`, `TvTextarea`, `TvDateInput`, `TvMilesInput` |
| Sheets | `BottomSheet` |
| Chips | `tv-chip` + `tv-chip-active` / `tv-chip-inactive` |

## States

| State | Pattern |
|-------|---------|
| Loading | `tv-skeleton` or `RouteGuardLoading` |
| Empty | `tv-empty-state` + icon + `tv-card-title` + `tv-body` |
| Error | `tv-error-state` with danger text |
| Warning | `bg-[var(--color-warning-bg)]` + `text-[var(--color-warning-text)]` |

## Navigation

- App shell: `VaultHeader` + `BottomNav` + optional `AppHeader`
- Auth routes: no bottom nav; use `tv-auth-page` layout
- Center nav "+" opens new job sheet (`h-11` minimum)

## Theme

- `ThemeProvider` toggles `.dark` / `.light` on `<html>`
- All surfaces must work in both themes via CSS variables
- Do not hardcode `className="dark"` on `<html>` in layout

## Auth screens

Use `tv-auth-page`, `AuthBrandHeader`, `tv-page-title`, `tv-caption`, and `TvButton` for all auth flows.
