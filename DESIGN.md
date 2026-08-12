# Design system — Pakahim Shift Manager

Goal: this should read as a real, designed 2026 product — calm, high-contrast-where-it-
matters, generous whitespace, soft depth instead of hard borders — not a wireframe with
Tailwind defaults. RTL Hebrew is the only layout direction; every spacing utility is a
logical property (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`), never `ml-*`/`mr-*`/`left-*`/`right-*`.

## Tokens (`app/globals.css`)

Neutral scale is the actual surface system (not raw black/white overlays); primary stays
the rail-blue navy already chosen (it's correct — Israel Railways livery); one accent
(indigo→sky) is used sparingly for emphasis (active status, primary glow), not as a
second brand color.

- `--surface` / `--surface-raised` / `--surface-sunken` — page bg, card bg, inset bg
- `--border` (low-opacity neutral, not literal black)
- `--foreground` / `--muted` — text
- `--primary-*` — existing rail-blue 50–900 scale, unchanged
- `--accent-from` / `--accent-to` — indigo→sky gradient stops, used on the brand mark and
  the single "next up" highlight, never on body text
- Status colors: `--success`, `--warning`, `--danger`, `--info` — each with a `-bg` (soft
  tint) and `-fg` (readable text-on-tint) pair, for status pills
- Full dark-mode redefinition of every token above via `prefers-color-scheme: dark` (not
  just background/foreground like today) — cards, borders, muted text all need to keep
  contrast in dark mode, not just invert two variables

Radius scale: `--radius-md: 0.75rem` (inputs, small controls), `--radius-lg: 1.25rem`
(cards), `--radius-xl: 1.75rem` (page-level containers, brand hero). Everything rounder
than today's flat `rounded-xl`-everywhere.

Elevation: two shadow tokens, `--shadow-sm` (resting card) and `--shadow-md` (raised/hover),
both soft and colored toward `--primary-900` at low alpha rather than pure black — that's
what makes cards feel "soft" instead of "bordered."

## Component primitives (`app/_components/ui/`)

Small, composable, no client-side JS unless the primitive needs it (Button can be a
plain element; interactivity lives in the pages that already use `'use client'`).

- `Card` — surface, radius-lg, shadow-sm, border in `--border`; `Card.Header`/`Card.Title` optional slots
- `Button` — variants `primary | secondary | ghost | danger`, sizes `md | lg`; primary uses
  the accent gradient on hover/focus, not flat fill, for the "AI product" feel
- `Badge` / `StatusPill` — maps shift/incident status → color pair from the status tokens
- `Input`, `Textarea`, `Select`, `Label` — consistent focus ring (`--primary-500`, 2px,
  offset), consistent `--radius-md`, consistent muted placeholder color
- `EmptyState` — icon + one line, replaces the bare "no incidents" text scattered today
- `PageHeader` — sticky, translucent (`backdrop-blur`), holds `Brand` + page title + back/logout

## Page-level layout

- Mobile-first single column, `max-w-lg`/`max-w-2xl` containers, generous `p-6`/`gap-6`
- Sticky translucent header (`backdrop-blur-md`, `bg-[var(--surface)]/80`) so scrolling
  content passes under it like a real app, not a static page
- "My shift" card is the visual anchor on the worker dashboard — larger, accent-gradient
  edge, everything else (team status, report incident) is secondary weight
- Status uses color + icon, never color alone (accessibility, and Hebrew screen readers)

## Icons

`lucide-react`, 18–20px inline / 24px section headers, always paired with text for
anything actionable (no icon-only buttons except a documented handful: back, close).

## Motion

`transition-colors duration-150` on all interactive elements as the floor; cards get
`transition-shadow` + a 1px `translate-y` lift on hover (desktop only, irrelevant on
touch but harmless); no motion library needed — this is restraint, not a feature.
