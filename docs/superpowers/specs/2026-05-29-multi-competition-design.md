# Design: Multi-competition expansion (leagues + tournaments)

| Field | Value |
|---|---|
| Status | Approved for planning |
| Owner | kushalchoksi |
| Date | 2026-05-29 |
| Supersedes | `spec.v1.md` §14 ("cup competitions, knockout simulators" — now in scope) |

---

## 1. Summary

Expand Footy Scenarios from EPL-only to all 12 competitions available on football-data.org's free tier: nine round-robin leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga, Championship, Brasileirão) and three knockout tournaments with group stages (Champions League, European Championship, FIFA World Cup). A new home page lets users pick a competition. Each competition uses its own correct tiebreaker chain. Tournaments support full group-stage projection plus a clickable knockout bracket.

## 2. Goals & non-goals

**Goals**

1. Land on `/`, see all 12 competitions as cards, click into any one and reach a working scenario builder.
2. League scenario builder behaves identically to today's EPL experience, but tiebreakers are now competition-correct (La Liga uses H2H first, etc.).
3. Tournament scenario builder lets users toggle outcomes of group-stage matches *and* knockout ties, then see who finishes where.
4. Existing EPL functionality (saved scenarios, share URL, projected table, decided badges, simulate-all) keeps working without behavioral regression.

**Non-goals (this design)**

- Saved-scenario migration and competition-scoped URLs. Deferred — handled in a separate spec.
- Provider expansion beyond football-data.org's free tier.
- Probability/odds layer.
- Two-legged ties with away-goals rule (UCL has phased this out; FIFA never used it). Two-legged ties are supported but tiebroken via the chain's normal rules.
- Mid-tournament playoff rules (e.g. Euros best-third logic) at the level of bespoke per-tournament code — handled via configuration only.

## 3. Architecture

### 3.1 Routes

```
/                          Home grid of cards (the 12 competitions)
/competition/[code]        Scenario builder, dispatched by the comp's format
```

`[code]` is the football-data.org competition code: `PL`, `PD`, `BL1`, `SA`, `FL1`, `DED`, `PPL`, `ELC`, `BSA`, `CL`, `EC`, `WC`.

### 3.2 Dispatch

`/competition/[code]/page.tsx`:
1. Look up the comp in the registry (`lib/competitions.ts`); if missing, render a "Competition not supported" message.
2. Fetch its data via `getStandings(code)` / `getFixtures(code)`.
3. Branch on `comp.format`:
   - `"league"` → render today's `ScenarioBuilder` with the comp's tiebreaker chain + qualification bands wired in.
   - `"tournament"` → render the new `TournamentBuilder` (group stage + bracket).

### 3.3 File layout (delta from today)

```
app/
  page.tsx                              MODIFIED: becomes the home grid
  competition/[code]/page.tsx           NEW: format dispatcher
lib/
  competitions.ts                       NEW: 12-entry registry
  footballData.ts                       MODIFIED: parameterised by competition code
  tiebreakers/
    types.ts                            NEW
    rules.ts                            NEW: each tiebreaker rule as a comparator
    chains.ts                           NEW: 10 chain definitions
    index.ts                            NEW: compare() + sortByChain()
  scenario.ts                           UNCHANGED
  simulate.ts                           MODIFIED: takes a TiebreakerChain instead of assuming EPL
  decided.ts                            MODIFIED: same — takes a TiebreakerChain
  tournament/
    groupStage.ts                       NEW
    bracket.ts                          NEW
    projection.ts                       NEW
components/
  HomeGrid.tsx                          NEW
  CompetitionCard.tsx                   NEW
  TournamentBuilder.tsx                 NEW: tournament UI shell
  Bracket.tsx                           NEW
  GroupCard.tsx                         NEW: per-group fixture grid + projected mini-table
  ScenarioBuilder.tsx                   MODIFIED: takes a `competition` prop
  ProjectedTable.tsx                    MODIFIED: takes qualification bands + chain via props
types/index.ts                          MODIFIED: extended (see §4)
tests/                                  EXTENDED: tiebreakers/, tournament/, competitions.test.ts
```

### 3.4 What does NOT change

The existing `ScenarioBuilder`, `ProjectedTable`, `SimulationBoard`, `FixtureCard`, `Sidebar`, `urlState.ts`, `scenario.ts`, `SavedScenarios`, `ShareBar` stay structurally. They become competition-aware via props rather than implicit EPL assumptions. No rewrites.

## 4. Data model extensions

### 4.1 New types

```ts
export type CompetitionFormat = "league" | "tournament";

export type TiebreakerChainId =
  | "epl" | "laLiga" | "bundesliga" | "serieA" | "ligue1"
  | "eredivisie" | "primeira" | "championship" | "brasileirao"
  | "uefa" | "fifa";

export type TiebreakerRuleId =
  | "points" | "goalDifference" | "goalsFor" | "goalsAway"
  | "wins" | "headToHead" | "headToHeadGD" | "headToHeadGoals"
  | "playoffFlag";

export interface TiebreakerChain {
  id: TiebreakerChainId;
  rules: TiebreakerRuleId[];
}

export interface QualificationBand {
  positions: number[];
  label: string;
  color: "ucl" | "uel" | "uecl" | "relegation" | "promotion" | "playoff";
}

export interface Competition {
  code: string;
  name: string;
  country: string;             // or "Europe" / "International"
  emblem: string;
  format: CompetitionFormat;
  tiebreaker: TiebreakerChainId;
  season: { startYear: number; label: string };
  bands?: QualificationBand[]; // leagues only
  groupCount?: number;         // tournaments only
  bracketTemplate?: BracketTemplate;  // tournaments only — feeder pattern per round
}

export interface BracketTemplate {
  // For each round, the ordered list of synthetic tie ids and which feeder ties produce their teams.
  // e.g. { LAST_16: [{ id: "R16-1" }, ...], QUARTER_FINALS: [{ id: "QF1", feederHome: "R16-1", feederAway: "R16-2" }, ...] }
  rounds: Partial<Record<TournamentStage, Array<{ id: string; feederHome?: string; feederAway?: string }>>>;
}

export type TournamentStage =
  | "GROUP_STAGE"
  | "LAST_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "FINAL"
  | "PLAYOFFS";

export interface BracketTie {
  id: string;                  // synthetic: "QF1", "SF2", etc.
  stage: TournamentStage;
  homeTeam?: Team;             // undefined until feeder resolves
  awayTeam?: Team;
  feederHome?: string;         // tie id whose winner fills homeTeam
  feederAway?: string;
  fixtures: Fixture[];         // 1 leg or 2 legs from the API
}
```

### 4.2 Extended types

```ts
// Existing Fixture gains two optional fields. Leagues leave them undefined.
export interface Fixture {
  // ...existing
  group?: string;              // e.g. "GROUP_A"
  stage?: TournamentStage;
  legNumber?: number;          // 1 or 2 for two-legged ties; undefined for single-leg
}

// Existing Scenario gains bracket choices for tournaments.
export interface Scenario {
  cluster: TeamId[];
  outcomes: OutcomeMap;
  bracketChoices?: Record<string, TeamId>;  // bracketTie.id -> chosen winner
}
```

## 5. Data layer (`lib/footballData.ts`)

Today's hardcoded `COMP = "PL"` is removed. The two exported functions become factories that take a competition code:

```ts
export function getStandings(code: string): Promise<Standing[]>;
export function getFixtures(code: string): Promise<Fixture[]>;
```

Each wraps `unstable_cache` with a code-scoped cache key (`${code}-standings`, `${code}-fixtures`) so different competitions don't collide. The Zod schemas gain optional `group` and `stage` fields parsed from football-data.org's match payload.

Out-of-season tournaments (no scheduled matches yet) return whatever the API has — typically the previous edition's final state. The card shows "Next edition: <date>" via the registry's `season.label`. The route still renders; it just has no active matches to toggle.

## 6. Competition registry (`lib/competitions.ts`)

Static array of 12 entries, plus a `getCompetition(code)` lookup. Used by:
- the home grid (rendering cards),
- `competition/[code]/page.tsx` (dispatch + props),
- the data layer (no — data layer is generic, competition info flows from the page).

Each entry encodes everything competition-specific: the tiebreaker chain id, the qualification bands (leagues), the group count and bracket template (tournaments), season label, country/region, and the emblem URL (sourced from football-data.org's competition metadata). The bracket template is the fixed feeder pattern for each round (e.g. R16-1 winner faces R16-2 winner in QF1) — see §8.2.

## 7. Tiebreaker engine (`lib/tiebreakers/`)

### 7.1 Refactor

`compareEPL` and `sortByEPL` from `lib/tiebreakers.ts` are replaced by chain-driven equivalents:

```ts
export function compare(a: Standing, b: Standing, chain: TiebreakerChain, ctx: TiebreakContext): number;
export function sortByChain(standings: Standing[], h2h: H2HMap, chain: TiebreakerChain): { sorted: Standing[]; playoffsFlagged: Set<string> };
```

`compare` iterates the chain's rules, applying each rule's comparator until one returns non-zero. If all rules return zero and the chain's last rule is `playoffFlag`, the pair is added to `playoffsFlagged` (preserves today's EPL behavior). If the chain has no `playoffFlag`, ties remain ties.

### 7.2 The rules

Each is ~5 lines: `points`, `goalDifference`, `goalsFor`, `goalsAway`, `wins`, `headToHead`, `headToHeadGD`, `headToHeadGoals`, `playoffFlag`. `goalsAway` requires the fixture list to compute (it's not in the cached `Standing`); the rule reads from a `ctx.awayGoals` map populated by `projectStandings`.

### 7.3 The 10 chains

```ts
{
  epl:           ["points", "goalDifference", "goalsFor", "headToHead", "playoffFlag"],
  laLiga:        ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"],
  bundesliga:    ["points", "goalDifference", "goalsFor", "headToHead"],
  serieA:        ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"],
  ligue1:        ["points", "goalDifference", "goalsFor", "goalsAway"],
  eredivisie:    ["points", "goalDifference", "goalsFor"],
  primeira:      ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"],
  championship:  ["points", "goalDifference", "goalsFor", "playoffFlag"],
  brasileirao:   ["points", "wins", "goalDifference", "goalsFor", "headToHead"],
  uefa:          ["points", "headToHead", "headToHeadGD", "headToHeadGoals", "goalDifference", "goalsFor"],
  fifa:          ["points", "goalDifference", "goalsFor", "headToHead", "headToHeadGD", "headToHeadGoals"],
}
```

Chains must be re-verified against each competition's current published rules before launch.

### 7.4 Call sites

`ProjectedTable`, `simulate.ts`, and `decided.ts` switch from importing `sortByEPL` to taking a `chain` prop/arg and calling `sortByChain`. The chain flows from `competition.tiebreaker` resolved through the chain registry.

## 8. Tournament engine (`lib/tournament/`)

### 8.1 Group stage (`groupStage.ts`)

A tournament's groups are N independent mini-leagues. The function:
1. Partitions fixtures by `fix.group`.
2. For each group, projects standings via the existing `projectStandings` (reuse, no duplication).
3. Sorts each group with `sortByChain(competition.tiebreaker)`.
4. Returns `Map<groupName, Standing[]>` plus a `Map<groupName, Team[]>` of who advances (top 2 by default; configurable for Euros best-thirds via the registry).

### 8.2 Bracket (`bracket.ts`)

Builds the bracket from API knockout fixtures. Each `BracketTie`:
- has `feederHome` / `feederAway` populated by parsing the stage progression (R16 winners feed QFs by a fixed pattern stored per tournament in the registry as a `bracketTemplate`),
- has `homeTeam` / `awayTeam` populated when the feeder resolves (from real result or from user pick in `scenario.bracketChoices`).

The user toggles a winner per tie. Two-legged ties collapse to one winner picker that shows both legs' scorelines as advanced options.

### 8.3 Projection composer (`projection.ts`)

```ts
project(competition, fixtures, outcomes, bracketChoices) -> {
  groupStandings: Map<string, Standing[]>,
  qualified:      Map<string, Team[]>,
  bracket:        BracketTie[],                  // resolved as far as choices allow
  finishingPositions: Map<TeamId, string>,       // "Winner" | "Runner-up" | "SF" | "QF" | "R16" | "Group stage"
}
```

### 8.4 Tournament UI (`components/TournamentBuilder.tsx`, `Bracket.tsx`, `GroupCard.tsx`)

`TournamentBuilder` mirrors `ScenarioBuilder`'s shell (top bar, sidebar, share bar). Main area shows:
1. **Groups section** — N `GroupCard`s side by side (responsive); each card has its fixture grid (reuses `FixtureCard`) plus a projected mini-table.
2. **Bracket section** — horizontal flow of round columns (R16 → QF → SF → Final). Each tie is a small card with both teams (or "Winner of R16-3" placeholders); tapping a team picks the winner. SVG/CSS lines connect feeders to next tie. Mobile: collapsible per round.

Saved scenarios and share bar are reused from existing components without modification (they encode the `Scenario`, which now includes `bracketChoices`).

## 9. Home page (`app/page.tsx`, `components/HomeGrid.tsx`, `components/CompetitionCard.tsx`)

Server component. Reads the static registry, no live fetch. Renders two sections — "Leagues" and "Tournaments" — each a responsive grid (1 column on phones, 2 on small tablets, 3 on desktop).

Each `CompetitionCard` is a `<Link href="/competition/[code]">` and shows the competition emblem, name, country/region, and season label. No live data on the card by default — keeps the home page instant.

(Optional minor follow-up, not in scope: hydrate cards with a small "5 matches left" or "Group stage" badge via a parallel server fetch. Listed as a candidate for the deferred polish phase.)

## 10. Testing

`tests/tiebreakers/` — one file per chain. Each file includes:
- The famous-edge-case test (e.g. EPL 2011/12 GD title, La Liga 2006/07 H2H title, Serie A 1999/2000 SS-vs-Juve).
- A synthetic case proving each rule fires when prior rules tie.
- A "no rule resolves" case proving `playoffFlag` (when present) is populated and ties remain when absent.

`tests/tournament/`:
- `groupStage.test.ts` — group projection produces correct top-2 with FIFA tiebreakers across all groups; best-third logic for Euros.
- `bracket.test.ts` — bracket resolves through feeders when user picks winners; unresolved ties remain placeholders; two-legged ties aggregate scores correctly.

`tests/competitions.test.ts` — registry sanity: every chain id resolves, every tournament has `groupCount`, every league has `bands`, no duplicates.

All tests run under existing `vitest` setup via `npm test`.

## 11. Phasing

Five phases, each independently shippable and a natural stop point. The user takes a look at the end of phases 1–4 and either approves "continue" or "stop and fix X".

1. **Foundation** — competition registry, generalized data layer, generalized tiebreaker engine + tests. EPL still works end-to-end via the new path. *Nothing user-visible changes yet.*
2. **Home page + routing** — `app/page.tsx` becomes the grid; `/competition/[code]` route added; all 9 leagues work. *Tournaments still 404 — leagues fully functional.*
3. **Tournament data + group stage** — `Fixture` extended with `group/stage`, group-stage projection works for WC/EC/UCL group games. Bracket not yet rendered. *Tournament routes show group cards + group tables only.*
4. **Knockout bracket** — `Bracket.tsx`, two-legged tie handling, full tournament projection. *Tournaments fully functional.*
5. **Polish + saved scenarios migration** — *deferred per user; placeholder for future spec on URL migration + saved scenarios scoping.*

## 12. Risks

- **Tiebreaker correctness across 10 chains.** Each chain's published rules can drift (UEFA changed its chain in 2021; FIFA changed in 2018). Mitigation: chain definitions live in a single file, easy to audit; regression tests pin behavior.
- **football-data.org tournament data shape.** Group/stage fields are documented but not exercised in this codebase yet. Mitigation: Phase 3 starts by verifying the actual payload shape against the WC 2026 fixtures before writing the projection code.
- **Bracket UI on mobile.** A 16→8→4→2→1 horizontal flow is hard to thumb on a 5" screen. Mitigation: collapsible round columns + a vertical bracket mode for narrow viewports.
- **Cache key collisions.** `unstable_cache` keys are currently `["epl-standings"]`. The refactor must scope them per code; missing this would serve EPL data on `/competition/PD`. Caught by integration test that fetches two comps in sequence and verifies cache isolation.

## 13. Open questions

- Per-card live status badges on the home page ("5 matches left", "Group stage") — nice to have, not required for v1. Decision deferred to polish phase.
- Best-thirds logic for Euros — does the existing UEFA chain plus a registry flag handle it, or does it need its own engine path? Settled in Phase 3 once we read the live Euros 2024 data shape.
