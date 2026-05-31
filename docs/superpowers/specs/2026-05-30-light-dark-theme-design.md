# Light/Dark Theme + League-Emblem Legibility

**Date:** 2026-05-30
**Status:** Approved design — ready for implementation plan

## Problem

1. **Build is broken.** `lucide-react` is imported (`FixtureCard`, `SavedScenarios`) but was
   never installed into `node_modules`, so the Next.js build fails with
   `Module not found: Can't resolve 'lucide-react'`.
2. **The app is dark-only.** `globals.css` and `layout.tsx` hardcode a dark palette
   (`#0b0f17`, `color-scheme: dark`, `<html class="dark">`), and ~20 components use literal
   `zinc-*`/hex colors. There is no way to use the app in light mode.
3. **League/tournament emblems disappear in dark mode.** Competition emblems come from
   `https://crests.football-data.org/{CODE}.png` and are a *mix*: pure-black line art
   (Champions League starball + black wordmark), dark-colored marks (Premier League purple
   lion), colored-with-dark-text (La Liga), and some already on a baked-in white box
   (Serie A). The dark/black ones are effectively invisible on the `#0b0f17` background.
   (Team crests are **not** part of this problem and are left untouched.)

## Goals

- Fix the build (`lucide-react` resolves).
- Add a real light theme covering the full app, with a manual toggle that defaults to the OS
  preference and persists the user's override. No flash of the wrong theme on load.
- Make every league/tournament emblem legible in **both** themes.

## Non-goals

- No changes to team crests / `TeamCrest` / `MonogramCrest` behavior (user is happy with them).
- No per-emblem color inversion or curated "is this logo monochrome" metadata — rejected as
  fragile (would wreck La Liga's rainbow and flip Serie A's white box to black).
- No redesign of layout, spacing, or component structure beyond what theming requires.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Theme control & default | Default to OS `prefers-color-scheme`; manual toggle overrides and persists to `localStorage`; no flash. |
| Toggle placement | **Single global floating button**, fixed corner, rendered once in the root layout. |
| Emblem legibility fix | **Light "chip"** behind each emblem (near-white rounded tile + faint ring), applied in both themes. |
| Light-theme scope | **Full app** — convert all themed components. |

## Approach

### 0. Build fix (already applied)
`npm install` installed `lucide-react@1.16.0` (it was declared in `package.json` and present in
`package-lock.json`, just missing from `node_modules`). No source change required.

### 1. Semantic color tokens (Tailwind v4)
Instead of adding `dark:` variants to every utility across 20 files, introduce **semantic CSS
variables** that flip based on a `.dark` class on `<html>`. The dark theme reproduces today's
exact look; light is a clean counterpart.

In `app/globals.css`:

- Define token values in `:root` (light) and `:root.dark` (dark), plus `color-scheme` per theme:

  | Token | Role | Dark (current look) | Light |
  |---|---|---|---|
  | `--bg` | page background | `#0b0f17` | `#f6f7f9` |
  | `--surface` | cards / panels | `#0c111b` | `#ffffff` |
  | `--surface-muted` | pills / raised chips (was `zinc-900`) | `#18181b` | `#eef0f3` |
  | `--fg` | primary text | `#e6edf3` | `#16181d` |
  | `--muted` | secondary text (was `zinc-400/500`) | `#8b93a0` | `#59616e` |
  | `--faint` | tertiary text / icons (was `zinc-600`) | `#52525b` | `#9aa1ac` |
  | `--border` | default border (was `zinc-800`) | `#27272a` | `#e2e5ea` |
  | `--border-strong` | hover border (was `zinc-600`) | `#52525b` | `#c4c9d1` |

  (Exact hex values may be nudged during implementation to match the current dark look
  pixel-for-pixel; the mapping is what matters.) The accent (`emerald-600/500`) and the
  status-band colors (ucl/uel/relegation/etc.) stay identical in both themes.

- Expose tokens to utilities with `@theme inline` so `bg-bg`, `bg-surface`,
  `bg-surface-muted`, `text-fg`, `text-muted`, `text-faint`, `border-border`,
  `border-border-strong` all exist (and support alpha, e.g. `bg-surface/40`).
- Add `@custom-variant dark (&:where(.dark, .dark *));` so class-based `dark:` still works for
  the few spots that need it (chip ring, shadows).
- Remove the hardcoded `html { color-scheme: dark }` and the fixed `background-color`/`color`
  on `html, body` (now driven by tokens).

### 2. No-flash theme init
In `app/layout.tsx`:

- Drop the hardcoded `dark` class and the `bg-[#0b0f17]`/`text-zinc-100` classes; `<body>`
  uses `bg-bg text-fg`.
- Add `suppressHydrationWarning` on `<html>`.
- Inject a tiny **blocking** inline script in `<head>` that runs before paint:
  reads `localStorage.theme`; if absent, falls back to `matchMedia('(prefers-color-scheme: dark)')`;
  sets `documentElement.classList.toggle('dark', …)` and `documentElement.style.colorScheme`.
  Wrapped in `try/catch`.

### 3. `ThemeToggle` component (new — `components/ThemeToggle.tsx`)
- Client component. On mount, reads the current state from
  `document.documentElement.classList.contains('dark')` and syncs into React state (avoids
  hydration mismatch — render a stable placeholder until mounted).
- On click: toggles the `.dark` class, sets `documentElement.style.colorScheme`, writes
  `localStorage.theme = 'dark' | 'light'`.
- Renders a fixed-position button (e.g. bottom-right) with the lucide `Sun`/`Moon` icon.
  Styled with semantic tokens (`bg-surface`, `border-border`, `text-fg`) so it fits both themes.
- Mounted **once** in `app/layout.tsx`'s `<body>` so it appears on every page.
- (Nice-to-have) listen to `prefers-color-scheme` changes and follow them only while the user
  has no stored override.

### 4. Component refactor — semantic utilities
Convert hardcoded colors to tokens across all themed files. Conversion cheatsheet:

| Current | Replace with |
|---|---|
| page bg `bg-[#0b0f17]` / `bg-zinc-950` (page) | `bg-bg` |
| panel `bg-zinc-950/40`, `bg-zinc-950/80` | `bg-surface/40`, `bg-surface/80` |
| pill/chip `bg-zinc-900` | `bg-surface-muted` |
| body text `text-zinc-100` / `text-white` (non-accent) | `text-fg` |
| secondary `text-zinc-300/400/500` | `text-muted` |
| tertiary/icon `text-zinc-600` | `text-faint` |
| `border-zinc-800` | `border-border` |
| `hover:border-zinc-600` | `hover:border-border-strong` |
| emerald accent, status bands, white-on-color | **unchanged** |

Files in scope (≈20): `app/layout.tsx`, `app/page.tsx`, and components `Bracket`,
`CompetitionCard`, `FixtureCard`, `FlipClockDigit`, `GroupCard`, `HomeGrid`, `ProjectedTable`,
`SavedScenarios`, `ShareBar`, `Sidebar`, `SimulationBoard`, `Sparkline`, `TeamColumn`,
`TeamList`, `TopBar`, `TournamentBuilder`. `MonogramCrest` (white text on a colored gradient)
needs no change; `Sparkline` only changes if it uses neutral grid colors.

### 5. `CompetitionEmblem` component (new — `components/CompetitionEmblem.tsx`) — the logo fix
- Props: `{ src: string; alt?: string; size?: number }`.
- Renders the emblem inside a near-white rounded tile: `bg-white`, small padding,
  `ring-1 ring-black/5 dark:ring-white/10`, `object-contain`. The white chip guarantees every
  emblem (black CL, purple PL, rainbow La Liga, white-boxed Serie A) is legible in both themes;
  the ring defines the tile's edge against a light page in light mode.
- Used in `CompetitionCard` in place of the bare `<img>` (the only emblem render site today).

### 6. Verification
- `npm run build` succeeds (proves `lucide-react` fixed + no type/lint breakage).
- `npm test` (vitest) stays green — the change is presentational; existing logic tests are
  unaffected.
- Manual visual check (via the app): home grid, a league scenario view, and a tournament view,
  each in **light and dark**, confirming (a) emblems legible, (b) toggle works + persists across
  reload, (c) no flash on load.

## Risk / edge cases
- **Hydration mismatch** on the toggle: avoided by reading theme from the DOM after mount and
  rendering a neutral placeholder until then.
- **Alpha on token colors**: Tailwind v4 supports `bg-surface/40` for theme colors defined via
  `--color-*`; verified pattern.
- **Missing emblems** (some football-data PNGs 404 to a tiny placeholder): the white chip still
  renders cleanly around whatever loads; out of scope to fix the upstream asset.
