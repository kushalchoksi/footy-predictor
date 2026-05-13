# Design — Footy Scenarios EPL Prototype

| Field | Value |
|---|---|
| Status | Approved |
| Date | 2026-05-13 |
| Parent spec | [`spec.v1.md`](../../../spec.v1.md) |
| Scope | Single league (EPL), Next.js prototype targeting Vercel |

## 1. Goal

Ship a deployable Next.js prototype that lets a user pick a cluster of Premier League teams, toggle outcomes (W/D/L) on every remaining EPL fixture involving those teams, and see the projected final table update live with correct EPL tiebreakers. Any scenario must be shareable as a URL.

This is a prototype, not v1 of the full product. It covers a subset of the parent PRD's functional requirements as listed in §3 below.

## 2. Non-goals

- Leagues other than EPL.
- PNG / image export of scenarios.
- Probability layer or Monte Carlo simulation.
- Per-fixture scoreline overrides (assume +1 GD for wins, 0 for draws).
- Live in-progress score awareness.
- Server-stored scenarios with short share IDs (URL-hash encoding only).
- Native push notifications, accounts, or auth.

## 3. Functional requirements covered

Mapping back to the parent PRD §6:

| ID | Covered? | Notes |
|---|---|---|
| F1 league picker | Partial | Hardcoded to EPL; no picker UI. |
| F2 fetch standings/fixtures/H2H | Yes | Via football-data.org server proxy. |
| F3 last-updated + refresh | Yes | Timestamp shown; manual refresh button (no pull-to-refresh on web). |
| F4 auto-suggest clusters | Yes | Title / UCL (top 4) / UEL+UECL (5–7) / Relegation. |
| F5 custom cluster multi-select | Yes | |
| F6 prize-at-stake label per cluster | Yes | |
| F7 flag intra-cluster H2H fixtures | Yes | UI badge on those rows. |
| F8 fixture grid by matchweek | Yes | |
| F9 three tap targets W/D/L per fixture | Yes | Default state: unset. |
| F10 lock fixture | Yes | Long-press / desktop click-and-hold; visually distinct. |
| F11 quick "team wins out / draws out / loses out" | Yes | Per-team button row. |
| F12 clear / revert | Yes | "Clear all" button; revert via browser back if from saved scenario. |
| F13 scoreline override for GD | **No** — out of scope for prototype. |
| F14 live table updates | Yes | No submit button. |
| F15 table columns P/W/D/L/GF/GA/GD/Pts | Yes | |
| F16 position color-coding | Yes | UCL green, UEL blue, UECL teal, relegation red, mid-table neutral. |
| F17 min/max points range for unset fixtures | Yes | Displayed as `Pts (min–max)` when scenario partial. |
| F18 plain-language outcome summaries | Partial | Show "decided" badges (F19); full natural-language sentences (e.g., "Arsenal win the title if X and Y") are out of scope for prototype. |
| F19 mathematically-decided badges | Yes | "Already champions", "Cannot finish top 4", "Mathematically safe", "Relegated". |
| F20 save scenario locally | Yes | localStorage; named scenarios list. |
| F21 deep-link URL | Yes | Primary share mechanism. |
| F22 PNG export | **No** — out of scope. |

## 4. Architecture

### 4.1 Stack

- **Next.js 15 (App Router)** with React Server Components where useful.
- **TypeScript** strict mode.
- **Tailwind CSS** for styling. Dark mode by default.
- Deployment target: **Vercel**.
- No database. No auth. Scenarios live in URL hash + localStorage.

### 4.2 File layout

```
app/
  layout.tsx                 root layout, fonts, dark theme
  page.tsx                   main scenario builder (server component shell)
  api/
    standings/route.ts       GET → server-cached fetch of EPL standings
    fixtures/route.ts        GET → server-cached fetch of EPL fixtures (SCHEDULED + FINISHED)
components/
  ScenarioBuilder.tsx        client component, holds top-level state, reads/writes URL hash
  ClusterPicker.tsx
  FixtureGrid.tsx
  FixtureRow.tsx
  LiveTable.tsx
  SummaryBadges.tsx
  ShareBar.tsx
  SavedScenarios.tsx
lib/
  footballData.ts            server-side API client; key never leaves server
  cache.ts                   wrapper around Next.js unstable_cache / revalidate
  tiebreakers.ts             pluggable per-league chain (EPL implemented)
  scenario.ts                pure: compute final table given outcomes + base standings
  ranges.ts                  pure: compute min/max points per team given unset fixtures
  decided.ts                 pure: detect mathematically-decided outcomes
  urlState.ts                encode/decode scenario to/from URL hash
types/
  index.ts                   League, Team, Fixture, Standing, Scenario, Outcome
tests/
  tiebreakers.test.ts        regression cases (2011–12 PL on GD, others)
  scenario.test.ts
  ranges.test.ts
```

### 4.3 Data flow

1. **Server load.** `app/page.tsx` (server component) fetches standings + fixtures from `lib/footballData.ts`, which uses Next.js `unstable_cache` with a 10-minute revalidation window. The football-data.org API key lives in `FOOTBALL_DATA_API_KEY` on the server only — never exposed to the browser.
2. **Hydration.** Server passes initial standings + fixtures to `<ScenarioBuilder>`. The client reads the URL hash on mount to rehydrate any encoded scenario.
3. **Interaction.** Every toggle in `<FixtureGrid>` updates the URL hash via `history.replaceState`. `<ScenarioBuilder>` listens on `hashchange` and derives the live table, ranges, and badges from current state.
4. **Refresh.** A manual "Refresh data" button calls `router.refresh()` which re-runs the server fetch, respecting cache TTL unless `?fresh=1` is set (which bypasses cache by passing `cache: 'no-store'`).

### 4.4 Server caching strategy

- `lib/footballData.ts` exposes `getStandings()` and `getFixtures()`.
- Both use `unstable_cache(fn, keyParts, { revalidate: 600 })`.
- 10-minute TTL is well within football-data.org's 10-req/minute rate limit even under heavy traffic (one upstream call per 10 minutes covers all visitors).

### 4.5 URL-hash sharing protocol

Hash format: `#c=<teamId>,<teamId>,...&o=<fixId>:<outcome>,<fixId>:<outcome>,...`

- `c=` cluster team IDs (comma-separated, numeric, sorted ascending for canonical form).
- `o=` outcome list per fixture. Outcome codes: `H` home win, `A` away win, `D` draw, `LH`/`LA`/`LD` for locked variants. Omitted fixtures are unset.
- Example: `#c=57,61,65&o=438101:H,438102:LA`

Encoding lives in `lib/urlState.ts` with round-trip tests. Future migration to server-stored short IDs only needs to swap the share button target.

### 4.6 Tiebreaker engine

`lib/tiebreakers.ts` exports `compareTeams(a: Standing, b: Standing, ctx: TiebreakContext): number` where the implementation is selected by `league.id`. Teams are sorted first by points (always primary), then for ties the EPL chain runs: **Goal Difference → Goals For → Head-to-head record**, matching parent spec §10.

Head-to-head requires the season's H2H sub-table among the tied teams. The scenario engine maintains a running H2H map keyed by `${teamA}|${teamB}` → `{aPts, bPts, aGoals, bGoals}`. Both completed matches and user-toggled scheduled matches feed this map.

Playoff fallback (per spec §10 EPL chain) is **not** silently resolved — when teams remain tied after H2H, the UI flags `"Playoff required"` rather than guessing.

### 4.7 Decided-state detection

`lib/decided.ts` runs upper-bound and lower-bound projections per cluster team:

- **Upper-bound** assumes every unset/unlocked fixture maximises that team's points; for other clusters' teams, opposite.
- **Lower-bound** inverse.

From those:
- `Already champions` — minimum-position upper-bound of all *other* teams cannot exceed this team's lower-bound points.
- `Mathematically safe` — lower-bound position is above the relegation cut.
- `Cannot finish top 4` — upper-bound position cannot reach 4th.
- `Relegated` — upper-bound position is at or below 18th.

These badges sit beside team names in `<LiveTable>` and `<SummaryBadges>`.

## 5. UX details

- **Dark theme by default**, with neutral surface colours and league-band accents.
- **Mobile-first**: fixture rows are full-width with three large tap targets sized for thumbs.
- **Sticky live table** on desktop (right column), sticky summary on mobile (top).
- Position color bands match parent spec §6.4.
- Locked fixtures show a small padlock icon. Lock is toggled by a dedicated padlock button on the row (not via long-press, to keep interaction predictable across mobile and desktop). Tapping H/D/A on a locked row is ignored until the padlock is tapped to unlock.
- "Wins out / Draws out / Loses out" appear as a 3-button strip under each cluster team's name in the fixture grid.

## 6. Configuration

`.env.local` (not committed):
```
FOOTBALL_DATA_API_KEY=...
```

`.env.local.example` (committed) shows the variable name and a link to football-data.org signup.

Server-only — never prefixed with `NEXT_PUBLIC_`.

## 7. Testing

- **Unit tests (Vitest)**: `tiebreakers.test.ts`, `scenario.test.ts`, `ranges.test.ts`, `urlState.test.ts`, `decided.test.ts`.
- **Tiebreaker regression cases** (at minimum):
  - 2011–12 EPL: City and United level on 89 pts; City champion on GD.
  - Hypothetical 3-way tie resolved by head-to-head mini-table.
  - Two teams tied on Pts/GD/GF — should fall to H2H, and when still tied → flag playoff.
- **No e2e in prototype**; smoke-test manually before deploy.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| football-data.org schema differs from assumed shape | Wrap responses in narrow zod schemas; fail loudly on schema drift. |
| API key leaks to client | Server-only env var, no `NEXT_PUBLIC_`, fetch only inside `app/api/*` and server components. |
| URL hash overflows on long scenarios | Each fixture entry is ~10–12 chars including separator; a typical end-of-season cluster of 4 teams across 2 matchweeks is ~8 fixtures → roughly 100 chars including the `c=` prefix. Well within URL limits. If a future scenario approaches browser caps, switch to base64-packed encoding. |
| Tiebreaker bug ships to users | Regression test suite is mandatory; visible "Playoff required" flag instead of silent wrong winner. |
| free-tier rate limit hit during demo | Server-side 10-min cache means one upstream call per 10 min regardless of traffic. |

## 9. Out of scope (explicitly deferred)

These are valuable but not in this prototype:
- Other leagues (La Liga, Bundesliga, Serie A, Ligue 1, etc.) — tiebreaker engine is structured to add them, but only EPL chain is implemented and only EPL data is fetched.
- Server-stored shareable scenarios with short IDs (Vercel KV).
- PNG image export of the table.
- Per-fixture scoreline overrides.
- Plain-language scenario sentences ("Arsenal win the title if…").
- Mid-season points deductions (currently none in 2025–26 EPL; if they appear, football-data.org reflects them in `points`, which we treat as canonical).
- Live in-progress scoreboard.

## 10. Open questions

None — all decisions captured above. Future enhancements tracked separately.
