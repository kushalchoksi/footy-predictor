# Multi-competition expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Footy Scenarios from EPL-only to all 12 football-data.org free-tier competitions — 9 round-robin leagues plus 3 knockout tournaments (UCL, Euros, World Cup) — with a home grid at `/`, per-league correct tiebreakers, and a full tournament engine for group stage + bracket.

**Architecture:** A static competition registry (`lib/competitions.ts`) drives a generalised data layer and a chain-driven tiebreaker engine. The `/competition/[code]` route dispatches by format: `"league"` renders today's `ScenarioBuilder`, `"tournament"` renders a new `TournamentBuilder` (group cards + clickable bracket). Two engines stay distinct because the underlying math is distinct; shared utilities live in `lib/` and reusable presentational components in `components/`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4, Zod, Vitest, football-data.org REST API.

**Spec:** `docs/superpowers/specs/2026-05-29-multi-competition-design.md`

**Phase boundaries:** Five phases. Stop after each. The user reviews and approves before the next phase begins.

---

## Phase 1 — Foundation

**Outcome of this phase:** EPL still works end-to-end exactly as today, but it now runs through the generalised data layer + chain-driven tiebreaker engine. The 10 tiebreaker chains exist and are tested. Nothing user-visible changes. The next phase can wire up routing on top without further engine changes.

---

### Task 1.1 — Add core multi-competition types to `types/index.ts`

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Append the new types to `types/index.ts`**

Open `types/index.ts` and append the following block at the end of the file (after the existing `pairKey` function):

```ts
// ──────────────────────────────────────────────────────────────────────────
// Multi-competition types (added 2026-05-29)
// ──────────────────────────────────────────────────────────────────────────

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

export type BandColor = "ucl" | "uel" | "uecl" | "relegation" | "promotion" | "playoff";

export interface QualificationBand {
  positions: number[];
  label: string;
  color: BandColor;
}

export type TournamentStage =
  | "GROUP_STAGE"
  | "LAST_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "FINAL"
  | "PLAYOFFS";

export interface BracketTemplateRound {
  id: string;             // synthetic, e.g. "QF1"
  feederHome?: string;    // tie id whose winner fills the home slot
  feederAway?: string;
}

export interface BracketTemplate {
  rounds: Partial<Record<TournamentStage, BracketTemplateRound[]>>;
}

export interface Competition {
  code: string;
  name: string;
  country: string;
  emblem: string;
  format: CompetitionFormat;
  tiebreaker: TiebreakerChainId;
  season: { startYear: number; label: string };
  bands?: QualificationBand[];
  groupCount?: number;
  bracketTemplate?: BracketTemplate;
}

export interface BracketTie {
  id: string;
  stage: TournamentStage;
  homeTeam?: Team;
  awayTeam?: Team;
  feederHome?: string;
  feederAway?: string;
  fixtures: Fixture[];
}
```

- [ ] **Step 2: Type-check the file**

Run: `npx tsc --noEmit`
Expected: no errors. The new types are stand-alone and reference only existing exports.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "Add multi-competition types (Competition, TiebreakerChain, BracketTie, …)"
```

---

### Task 1.2 — Scaffold the new `lib/tiebreakers/` directory with the rule comparators

**Files:**
- Create: `lib/tiebreakers/types.ts`
- Create: `lib/tiebreakers/rules.ts`
- Create: `tests/tiebreakers/rules.test.ts`

- [ ] **Step 1: Write the failing tests in `tests/tiebreakers/rules.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { Standing, H2HMap } from "@/types";
import { pairKey } from "@/types";
import { RULES } from "@/lib/tiebreakers/rules";
import type { TiebreakContext } from "@/lib/tiebreakers/types";

function s(id: number, pts: number, gd: number, gf: number, won = 0): Standing {
  return {
    team: { id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}`, crest: "" },
    position: 0, playedGames: 38,
    won, draw: 0, lost: 0,
    points: pts,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
  };
}

const ctx = (h2h: H2HMap = {}, awayGoals: Map<number, number> = new Map()): TiebreakContext =>
  ({ h2h, playoffsFlagged: new Set(), awayGoals });

describe("tiebreaker rules", () => {
  it("points: higher points ranks above lower", () => {
    expect(RULES.points(s(1, 80, 0, 0), s(2, 70, 0, 0), ctx())).toBeLessThan(0);
    expect(RULES.points(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx())).toBe(0);
  });

  it("goalDifference: higher GD ranks above lower", () => {
    expect(RULES.goalDifference(s(1, 70, 10, 0), s(2, 70, 5, 0), ctx())).toBeLessThan(0);
  });

  it("goalsFor: higher GF ranks above lower", () => {
    expect(RULES.goalsFor(s(1, 70, 0, 50), s(2, 70, 0, 40), ctx())).toBeLessThan(0);
  });

  it("wins: more wins ranks above fewer", () => {
    expect(RULES.wins(s(1, 70, 0, 0, 22), s(2, 70, 0, 0, 20), ctx())).toBeLessThan(0);
  });

  it("goalsAway: more away goals ranks above fewer (Ligue 1)", () => {
    const away = new Map<number, number>([[1, 30], [2, 22]]);
    expect(RULES.goalsAway(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx({}, away))).toBeLessThan(0);
  });

  it("headToHead: more H2H points ranks above (low id won the pair)", () => {
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 4, highPts: 1, lowGoals: 3, highGoals: 1 } };
    expect(RULES.headToHead(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx(h2h))).toBeLessThan(0);
  });

  it("headToHeadGD: better H2H GD ranks above", () => {
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 0, highPts: 0, lowGoals: 5, highGoals: 1 } };
    expect(RULES.headToHeadGD(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx(h2h))).toBeLessThan(0);
  });

  it("headToHeadGoals: more H2H goals scored ranks above", () => {
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 3, highPts: 3, lowGoals: 4, highGoals: 2 } };
    expect(RULES.headToHeadGoals(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx(h2h))).toBeLessThan(0);
  });

  it("playoffFlag: always returns 0 and adds the pair to playoffsFlagged", () => {
    const c = ctx();
    expect(RULES.playoffFlag(s(1, 70, 0, 0), s(2, 70, 0, 0), c)).toBe(0);
    expect(c.playoffsFlagged.has(pairKey(1, 2))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tiebreakers/rules.test.ts`
Expected: FAIL with "Cannot find module '@/lib/tiebreakers/rules'".

- [ ] **Step 3: Create `lib/tiebreakers/types.ts`**

```ts
import type { Standing, H2HMap, TeamId, TiebreakerRuleId } from "@/types";

export interface TiebreakContext {
  h2h: H2HMap;
  playoffsFlagged: Set<string>;
  /** Per-team away goals scored across the season. Populated by the projection layer. */
  awayGoals: Map<TeamId, number>;
}

export type TiebreakerRuleFn = (a: Standing, b: Standing, ctx: TiebreakContext) => number;

export type RuleRegistry = Record<TiebreakerRuleId, TiebreakerRuleFn>;
```

- [ ] **Step 4: Create `lib/tiebreakers/rules.ts`**

```ts
import type { TeamId } from "@/types";
import { pairKey } from "@/types";
import type { RuleRegistry, TiebreakerRuleFn } from "@/lib/tiebreakers/types";

const points: TiebreakerRuleFn = (a, b) => b.points - a.points;
const goalDifference: TiebreakerRuleFn = (a, b) => b.goalDifference - a.goalDifference;
const goalsFor: TiebreakerRuleFn = (a, b) => b.goalsFor - a.goalsFor;
const wins: TiebreakerRuleFn = (a, b) => b.won - a.won;

const goalsAway: TiebreakerRuleFn = (a, b, ctx) => {
  const aAway = ctx.awayGoals.get(a.team.id) ?? 0;
  const bAway = ctx.awayGoals.get(b.team.id) ?? 0;
  return bAway - aAway;
};

function h2hPoints(aId: TeamId, bId: TeamId, ctx: { h2h: { [k: string]: { lowPts: number; highPts: number; lowGoals: number; highGoals: number } } }) {
  const entry = ctx.h2h[pairKey(aId, bId)];
  if (!entry) return { aPts: 0, bPts: 0, aGoals: 0, bGoals: 0 };
  const aIsLow = aId < bId;
  return {
    aPts: aIsLow ? entry.lowPts : entry.highPts,
    bPts: aIsLow ? entry.highPts : entry.lowPts,
    aGoals: aIsLow ? entry.lowGoals : entry.highGoals,
    bGoals: aIsLow ? entry.highGoals : entry.lowGoals,
  };
}

const headToHead: TiebreakerRuleFn = (a, b, ctx) => {
  const { aPts, bPts } = h2hPoints(a.team.id, b.team.id, ctx);
  return bPts - aPts;
};

const headToHeadGD: TiebreakerRuleFn = (a, b, ctx) => {
  const { aGoals, bGoals } = h2hPoints(a.team.id, b.team.id, ctx);
  return (bGoals - aGoals) - 0; // GD for a is aGoals - bGoals, for b is bGoals - aGoals; b ranks above if (bGoals - aGoals) > (aGoals - bGoals)
                                  // simplification: just compare aGoals vs bGoals when both sides have the same opponent
};

const headToHeadGoals: TiebreakerRuleFn = (a, b, ctx) => {
  const { aGoals, bGoals } = h2hPoints(a.team.id, b.team.id, ctx);
  return bGoals - aGoals;
};

const playoffFlag: TiebreakerRuleFn = (a, b, ctx) => {
  ctx.playoffsFlagged.add(pairKey(a.team.id, b.team.id));
  return 0;
};

export const RULES: RuleRegistry = {
  points,
  goalDifference,
  goalsFor,
  goalsAway,
  wins,
  headToHead,
  headToHeadGD,
  headToHeadGoals,
  playoffFlag,
};
```

> **Note on `headToHeadGD`:** since `h2h` only stores one pair's totals, the H2H GD of A vs B is `aGoals - bGoals`. The function returns `bGoals - aGoals` so that B ranks above A when B scored more in the head-to-head — same direction as the other rules.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/tiebreakers/rules.test.ts`
Expected: all 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/tiebreakers/types.ts lib/tiebreakers/rules.ts tests/tiebreakers/rules.test.ts
git commit -m "Add chain-driven tiebreaker rule comparators with tests"
```

---

### Task 1.3 — Define the 10 chains in `lib/tiebreakers/chains.ts`

**Files:**
- Create: `lib/tiebreakers/chains.ts`
- Create: `tests/tiebreakers/chains.test.ts`

- [ ] **Step 1: Write the failing test in `tests/tiebreakers/chains.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { CHAINS } from "@/lib/tiebreakers/chains";
import { RULES } from "@/lib/tiebreakers/rules";
import type { TiebreakerChainId } from "@/types";

describe("CHAINS registry", () => {
  it("defines all 11 chains", () => {
    const expected: TiebreakerChainId[] = [
      "epl", "laLiga", "bundesliga", "serieA", "ligue1",
      "eredivisie", "primeira", "championship", "brasileirao",
      "uefa", "fifa",
    ];
    for (const id of expected) expect(CHAINS[id]).toBeDefined();
  });

  it("every rule id referenced exists in RULES", () => {
    for (const chain of Object.values(CHAINS)) {
      for (const ruleId of chain.rules) {
        expect(RULES[ruleId]).toBeDefined();
      }
    }
  });

  it("every chain starts with 'points'", () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.rules[0]).toBe("points");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tiebreakers/chains.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tiebreakers/chains'`.

- [ ] **Step 3: Create `lib/tiebreakers/chains.ts`**

```ts
import type { TiebreakerChain, TiebreakerChainId } from "@/types";

export const CHAINS: Record<TiebreakerChainId, TiebreakerChain> = {
  epl:          { id: "epl",          rules: ["points", "goalDifference", "goalsFor", "headToHead", "playoffFlag"] },
  laLiga:       { id: "laLiga",       rules: ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"] },
  bundesliga:   { id: "bundesliga",   rules: ["points", "goalDifference", "goalsFor", "headToHead"] },
  serieA:       { id: "serieA",       rules: ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"] },
  ligue1:       { id: "ligue1",       rules: ["points", "goalDifference", "goalsFor", "goalsAway"] },
  eredivisie:   { id: "eredivisie",   rules: ["points", "goalDifference", "goalsFor"] },
  primeira:     { id: "primeira",     rules: ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"] },
  championship: { id: "championship", rules: ["points", "goalDifference", "goalsFor", "playoffFlag"] },
  brasileirao:  { id: "brasileirao",  rules: ["points", "wins", "goalDifference", "goalsFor", "headToHead"] },
  uefa:         { id: "uefa",         rules: ["points", "headToHead", "headToHeadGD", "headToHeadGoals", "goalDifference", "goalsFor"] },
  fifa:         { id: "fifa",         rules: ["points", "goalDifference", "goalsFor", "headToHead", "headToHeadGD", "headToHeadGoals"] },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/tiebreakers/chains.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tiebreakers/chains.ts tests/tiebreakers/chains.test.ts
git commit -m "Define 11 tiebreaker chains (9 leagues + UEFA + FIFA)"
```

---

### Task 1.4 — Implement `compare()` and `sortByChain()` in `lib/tiebreakers/index.ts`

**Files:**
- Create: `lib/tiebreakers/index.ts`
- Create: `tests/tiebreakers/sortByChain.test.ts`

- [ ] **Step 1: Write the failing test in `tests/tiebreakers/sortByChain.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { compare, sortByChain } from "@/lib/tiebreakers";
import { CHAINS } from "@/lib/tiebreakers/chains";
import type { Standing, H2HMap } from "@/types";
import { pairKey } from "@/types";

function s(id: number, name: string, pts: number, gd: number, gf: number, won = 0): Standing {
  return {
    team: { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" },
    position: 0, playedGames: 38,
    won, draw: 0, lost: 0,
    points: pts,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
  };
}

describe("sortByChain (EPL)", () => {
  it("2011/12: City over United on GD with equal points", () => {
    const city = s(1, "Man City", 89, 64, 93);
    const united = s(2, "Man United", 89, 56, 89);
    const { sorted } = sortByChain([united, city], {}, CHAINS.epl);
    expect(sorted[0].team.name).toBe("Man City");
  });
});

describe("sortByChain (La Liga)", () => {
  it("H2H beats GD: A wins head-to-head, B has better overall GD — A ranks higher", () => {
    const a = s(1, "A", 70, 5, 40);
    const b = s(2, "B", 70, 20, 60);
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 4, highPts: 1, lowGoals: 3, highGoals: 1 } };
    const { sorted } = sortByChain([b, a], h2h, CHAINS.laLiga);
    expect(sorted[0].team.id).toBe(1);
  });
});

describe("sortByChain (Brasileirão)", () => {
  it("uses 'wins' before GD", () => {
    const a = s(1, "A", 70, 5, 40, 22);
    const b = s(2, "B", 70, 20, 60, 20);
    const { sorted } = sortByChain([b, a], {}, CHAINS.brasileirao);
    expect(sorted[0].team.id).toBe(1); // more wins wins
  });
});

describe("sortByChain (EPL playoffFlag)", () => {
  it("flags pair when all rules including H2H tie", () => {
    const a = s(1, "A", 70, 20, 60);
    const b = s(2, "B", 70, 20, 60);
    const { playoffsFlagged } = sortByChain([a, b], {}, CHAINS.epl);
    expect(playoffsFlagged.has(pairKey(1, 2))).toBe(true);
  });
});

describe("sortByChain (Bundesliga – no playoffFlag)", () => {
  it("returns stable order without flagging when all rules tie", () => {
    const a = s(1, "A", 70, 20, 60);
    const b = s(2, "B", 70, 20, 60);
    const { playoffsFlagged } = sortByChain([a, b], {}, CHAINS.bundesliga);
    expect(playoffsFlagged.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tiebreakers/sortByChain.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tiebreakers'` (or similar).

- [ ] **Step 3: Create `lib/tiebreakers/index.ts`**

```ts
import type { Standing, H2HMap, TeamId, TiebreakerChain } from "@/types";
import { RULES } from "@/lib/tiebreakers/rules";
import type { TiebreakContext } from "@/lib/tiebreakers/types";

export { CHAINS } from "@/lib/tiebreakers/chains";
export type { TiebreakContext } from "@/lib/tiebreakers/types";

export function compare(
  a: Standing,
  b: Standing,
  chain: TiebreakerChain,
  ctx: TiebreakContext,
): number {
  for (const ruleId of chain.rules) {
    const delta = RULES[ruleId](a, b, ctx);
    if (delta !== 0) return delta;
  }
  return 0;
}

export interface SortByChainResult {
  sorted: Standing[];
  playoffsFlagged: Set<string>;
}

export function sortByChain(
  standings: Standing[],
  h2h: H2HMap,
  chain: TiebreakerChain,
  awayGoals: Map<TeamId, number> = new Map(),
): SortByChainResult {
  const ctx: TiebreakContext = { h2h, playoffsFlagged: new Set(), awayGoals };
  const sorted = [...standings].sort((a, b) => compare(a, b, chain, ctx));
  return { sorted, playoffsFlagged: ctx.playoffsFlagged };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/tiebreakers/sortByChain.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tiebreakers/index.ts tests/tiebreakers/sortByChain.test.ts
git commit -m "Implement compare() and sortByChain() driven by chain definitions"
```

---

### Task 1.5 — Migrate the existing EPL call site (`ProjectedTable.tsx`) to `sortByChain`

**Files:**
- Modify: `components/ProjectedTable.tsx`

- [ ] **Step 1: Edit the imports and the call site**

Change line 6 from:

```ts
import { sortByEPL } from "@/lib/tiebreakers";
```

to:

```ts
import { sortByChain, CHAINS } from "@/lib/tiebreakers";
import type { Competition } from "@/types";
```

Change line 40 from:

```ts
const sorted = useMemo(() => sortByEPL(projected.standings, projected.h2h), [projected]);
```

to:

```ts
const sorted = useMemo(
  () => sortByChain(projected.standings, projected.h2h, CHAINS[competition.tiebreaker]),
  [projected, competition],
);
```

Add `competition: Competition` to the `Props` interface (line 13) and the function signature (line 34):

```ts
interface Props {
  competition: Competition;
  base: Standing[];
  // ...rest unchanged
}

export default function ProjectedTable({
  competition, base, fixtures, outcomes, cluster, onClusterChange, filterTeamIds,
}: Props) {
```

- [ ] **Step 2: Verify the file type-checks**

Run: `npx tsc --noEmit 2>&1 | grep -E "ProjectedTable|tiebreakers"`
Expected: errors in `ProjectedTable.tsx`'s call sites (callers don't pass `competition` yet). That's expected — we'll fix the callers in Task 1.7 once `ScenarioBuilder` knows about competitions. For now, leave the errors; do NOT fix them here.

- [ ] **Step 3: Run the existing tiebreaker test file (it imports the old `compareEPL`)**

Run: `npx vitest run tests/tiebreakers.test.ts`
Expected: PASS — the old `compareEPL` and `sortByEPL` still exist; we'll delete them in Task 1.6. Don't delete that test file yet.

- [ ] **Step 4: Commit**

```bash
git add components/ProjectedTable.tsx
git commit -m "Wire ProjectedTable to chain-driven sortByChain"
```

---

### Task 1.6 — Delete the old `lib/tiebreakers.ts` shim and its test

**Files:**
- Delete: `lib/tiebreakers.ts`
- Delete: `tests/tiebreakers.test.ts`

- [ ] **Step 1: Confirm there are no more callers of the old exports**

Run: `grep -rn "compareEPL\|sortByEPL" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next"`
Expected: only matches inside `lib/tiebreakers.ts` and `tests/tiebreakers.test.ts`. If anything else shows up, stop and migrate it before continuing.

- [ ] **Step 2: Delete both files**

```bash
rm lib/tiebreakers.ts tests/tiebreakers.test.ts
```

- [ ] **Step 3: Re-run all tests**

Run: `npm test`
Expected: PASS (the new chain tests cover EPL behavior; the deleted test's cases are subsumed by `sortByChain.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add -u lib/tiebreakers.ts tests/tiebreakers.test.ts
git commit -m "Remove old EPL-only tiebreakers module (replaced by chain engine)"
```

---

### Task 1.7 — Create the competition registry with the EPL entry only

**Files:**
- Create: `lib/competitions.ts`
- Create: `tests/competitions.test.ts`

> Phase 1 only seeds the registry with EPL. The other 11 entries arrive in Phase 2 (leagues) and Phase 3 (tournaments), each gated on its own data verification.

- [ ] **Step 1: Write the failing test in `tests/competitions.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { COMPETITIONS, getCompetition } from "@/lib/competitions";
import { CHAINS } from "@/lib/tiebreakers/chains";

describe("competition registry", () => {
  it("contains at least the EPL entry", () => {
    expect(COMPETITIONS.find((c) => c.code === "PL")).toBeDefined();
  });

  it("getCompetition returns the entry by code", () => {
    expect(getCompetition("PL")?.name).toBe("Premier League");
    expect(getCompetition("ZZ")).toBeUndefined();
  });

  it("every chain id referenced resolves in CHAINS", () => {
    for (const comp of COMPETITIONS) {
      expect(CHAINS[comp.tiebreaker]).toBeDefined();
    }
  });

  it("league entries have qualification bands; tournament entries have groupCount", () => {
    for (const comp of COMPETITIONS) {
      if (comp.format === "league") expect(comp.bands).toBeDefined();
      else expect(comp.groupCount).toBeDefined();
    }
  });

  it("codes are unique", () => {
    const codes = COMPETITIONS.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/competitions.test.ts`
Expected: FAIL — `Cannot find module '@/lib/competitions'`.

- [ ] **Step 3: Create `lib/competitions.ts`**

```ts
import type { Competition } from "@/types";

export const COMPETITIONS: Competition[] = [
  {
    code: "PL",
    name: "Premier League",
    country: "England",
    emblem: "https://crests.football-data.org/PL.png",
    format: "league",
    tiebreaker: "epl",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [18, 19, 20],  label: "Relegation",       color: "relegation" },
    ],
  },
];

export function getCompetition(code: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.code === code);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/competitions.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/competitions.ts tests/competitions.test.ts
git commit -m "Seed competition registry with EPL entry and invariant tests"
```

---

### Task 1.8 — Parameterise the data layer by competition code

**Files:**
- Modify: `lib/footballData.ts`

- [ ] **Step 1: Replace the file's exports with code-parameterised versions**

Replace lines 6–8 from:

```ts
const BASE = "https://api.football-data.org/v4";
const COMP = "PL";
const REVALIDATE_SECONDS = 120;
```

with:

```ts
const BASE = "https://api.football-data.org/v4";
const REVALIDATE_SECONDS = 120;
```

(Note: removing `COMP`.)

Replace lines 85–127 (the `getStandings` and `getFixtures` `unstable_cache` blocks) with:

```ts
export function getStandings(code: string): Promise<Standing[]> {
  return unstable_cache(
    async (): Promise<Standing[]> => {
      const raw = await fetchFromApi(`/competitions/${code}/standings`);
      const parsed = standingsResponseSchema.parse(raw);
      const total = parsed.standings.find((s) => s.type === "TOTAL");
      if (!total) throw new Error("No TOTAL standings stage in response");
      return total.table.map((row) => ({
        team: normalizeTeam(row.team),
        position: row.position,
        playedGames: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
      }));
    },
    [`${code}-standings`],
    { revalidate: REVALIDATE_SECONDS },
  )();
}

export function getFixtures(code: string): Promise<Fixture[]> {
  return unstable_cache(
    async (): Promise<Fixture[]> => {
      const raw = await fetchFromApi(`/competitions/${code}/matches`);
      const parsed = matchesResponseSchema.parse(raw);
      return parsed.matches
        .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED" || m.status === "FINISHED")
        .map((m) => ({
          id: m.id,
          matchday: m.matchday ?? 0,
          homeTeam: normalizeTeam(m.homeTeam),
          awayTeam: normalizeTeam(m.awayTeam),
          status: m.status === "FINISHED" ? "FINISHED" as const : "SCHEDULED" as const,
          homeGoals: m.score.fullTime.home,
          awayGoals: m.score.fullTime.away,
          utcDate: m.utcDate,
        }));
    },
    [`${code}-fixtures`],
    { revalidate: REVALIDATE_SECONDS },
  )();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "footballData\|page.tsx"`
Expected: an error in `app/page.tsx` because `getStandings()` and `getFixtures()` are now called without a code argument. Expected and fixed in the next step.

- [ ] **Step 3: Update `app/page.tsx` to pass `"PL"` explicitly**

Open `app/page.tsx`. Change lines 8–9 from:

```ts
let standings, fixtures;
try {
  [standings, fixtures] = await Promise.all([getStandings(), getFixtures()]);
```

to:

```ts
let standings, fixtures;
try {
  [standings, fixtures] = await Promise.all([getStandings("PL"), getFixtures("PL")]);
```

- [ ] **Step 4: Type-check again**

Run: `npx tsc --noEmit`
Expected: still has errors in `ScenarioBuilder` / `ProjectedTable` about the missing `competition` prop. Fix those in the next task.

- [ ] **Step 5: Commit**

```bash
git add lib/footballData.ts app/page.tsx
git commit -m "Parameterise data layer by competition code"
```

---

### Task 1.9 — Thread `competition` prop through `ScenarioBuilder` and `app/page.tsx`

**Files:**
- Modify: `components/ScenarioBuilder.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add `competition` to `ScenarioBuilder` props and pass it to `ProjectedTable`**

In `components/ScenarioBuilder.tsx`, update the `Props` interface (line 14) and the function signature (line 20):

```ts
import type { Competition, Fixture, Outcome, OutcomeMap, Scenario, Standing, TeamId } from "@/types";
// ...
interface Props {
  competition: Competition;
  standings: Standing[];
  fixtures: Fixture[];
  fetchedAt: string;
}

export default function ScenarioBuilder({ competition, standings, fixtures, fetchedAt }: Props) {
```

Pass `competition` to every `<ProjectedTable />` in the JSX. There are two render paths (the `hasCluster` true branch around line 141 and the false branch around line 167). Each instance changes from:

```tsx
<ProjectedTable
  base={standings}
  fixtures={fixtures}
  outcomes={scenario.outcomes}
  cluster={scenario.cluster}
  // ...
/>
```

to:

```tsx
<ProjectedTable
  competition={competition}
  base={standings}
  fixtures={fixtures}
  outcomes={scenario.outcomes}
  cluster={scenario.cluster}
  // ...
/>
```

- [ ] **Step 2: Update `app/page.tsx` to look up and pass the EPL competition**

In `app/page.tsx`, add the import at the top:

```ts
import { getCompetition } from "@/lib/competitions";
```

Then, inside the `Page` function, after the try/catch that fetches standings + fixtures, replace the existing `return <ScenarioBuilder ... />` with:

```tsx
const competition = getCompetition("PL")!;

return (
  <ScenarioBuilder
    competition={competition}
    standings={standings}
    fixtures={fixtures}
    fetchedAt={new Date().toISOString()}
  />
);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Smoke-test in the browser**

```bash
npm run dev
```

Open http://localhost:3000. Confirm the existing EPL experience still works: standings render, fixture grid loads, cluster selection still functions, the projected table still shows. Stop the dev server (`Ctrl-C`).

- [ ] **Step 6: Commit**

```bash
git add components/ScenarioBuilder.tsx app/page.tsx
git commit -m "Thread competition prop through ScenarioBuilder; lookup EPL in app/page.tsx"
```

---

### Task 1.10 — Phase 1 verification + STOP for review

- [ ] **Step 1: Final test run**

Run: `npm test`
Expected: every suite passes — rules, chains, sortByChain, competitions, plus all pre-existing suites (scenario, decided, ranges, simulate, urlState, sparklineData, clusters, positionBounds, sanity).

- [ ] **Step 2: Final type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: STOP and surface for user review**

Write a brief summary to the user:
> "Phase 1 complete. The data layer is now competition-aware, the tiebreaker engine is chain-driven, all 11 chains are defined and tested, and EPL still works end-to-end via the new path. Nothing user-visible has changed. Ready to start Phase 2 (home grid + routing) when you say so."

Do NOT begin Phase 2 until the user confirms.

---

## Phase 2 — Home page + routing

**Outcome of this phase:** `/` shows a grid of competition cards. All 9 leagues are in the registry and clicking any league card opens a working scenario builder for that league. Tournaments are in the registry too but their route renders a "Tournament UI coming in Phase 3" placeholder.

---

### Task 2.1 — Fill the registry with the other 8 league entries

**Files:**
- Modify: `lib/competitions.ts`

> Each league's `bands` reflect that competition's published qualification structure for the 2025/26 season. Re-verify each chain and bands before launch; rules drift.

- [ ] **Step 1: Append the 8 leagues to `COMPETITIONS`**

Add the following entries to the `COMPETITIONS` array in `lib/competitions.ts`, after the existing EPL entry:

```ts
  {
    code: "PD",
    name: "La Liga",
    country: "Spain",
    emblem: "https://crests.football-data.org/PD.png",
    format: "league",
    tiebreaker: "laLiga",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [18, 19, 20],  label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "BL1",
    name: "Bundesliga",
    country: "Germany",
    emblem: "https://crests.football-data.org/BL1.png",
    format: "league",
    tiebreaker: "bundesliga",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [16],          label: "Relegation playoff", color: "playoff" },
      { positions: [17, 18],      label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "SA",
    name: "Serie A",
    country: "Italy",
    emblem: "https://crests.football-data.org/SA.png",
    format: "league",
    tiebreaker: "serieA",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [18, 19, 20],  label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "FL1",
    name: "Ligue 1",
    country: "France",
    emblem: "https://crests.football-data.org/FL1.png",
    format: "league",
    tiebreaker: "ligue1",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3],    label: "Champions League", color: "ucl" },
      { positions: [4, 5],        label: "Europa League",    color: "uel" },
      { positions: [6],           label: "Conference League",color: "uecl" },
      { positions: [16],          label: "Relegation playoff", color: "playoff" },
      { positions: [17, 18],      label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "DED",
    name: "Eredivisie",
    country: "Netherlands",
    emblem: "https://crests.football-data.org/DED.png",
    format: "league",
    tiebreaker: "eredivisie",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2],    label: "Champions League", color: "ucl" },
      { positions: [3, 4],    label: "Europa League",    color: "uel" },
      { positions: [5, 6, 7], label: "Conference League",color: "uecl" },
      { positions: [17],      label: "Relegation playoff", color: "playoff" },
      { positions: [18],      label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "PPL",
    name: "Primeira Liga",
    country: "Portugal",
    emblem: "https://crests.football-data.org/PPL.png",
    format: "league",
    tiebreaker: "primeira",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2],    label: "Champions League", color: "ucl" },
      { positions: [3, 4],    label: "Europa League",    color: "uel" },
      { positions: [5],       label: "Conference League",color: "uecl" },
      { positions: [17, 18],  label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "ELC",
    name: "Championship",
    country: "England",
    emblem: "https://crests.football-data.org/ELC.png",
    format: "league",
    tiebreaker: "championship",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2],          label: "Promotion to Premier League", color: "promotion" },
      { positions: [3, 4, 5, 6],    label: "Playoff for promotion",       color: "playoff" },
      { positions: [22, 23, 24],    label: "Relegation",                  color: "relegation" },
    ],
  },
  {
    code: "BSA",
    name: "Brasileirão",
    country: "Brazil",
    emblem: "https://crests.football-data.org/BSA.png",
    format: "league",
    tiebreaker: "brasileirao",
    season: { startYear: 2025, label: "2025" },
    bands: [
      { positions: [1, 2, 3, 4, 5, 6], label: "Copa Libertadores",  color: "ucl" },
      { positions: [7, 8, 9, 10, 11, 12], label: "Copa Sudamericana", color: "uel" },
      { positions: [17, 18, 19, 20],   label: "Relegation",         color: "relegation" },
    ],
  },
```

- [ ] **Step 2: Run the registry test**

Run: `npx vitest run tests/competitions.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/competitions.ts
git commit -m "Register the 8 other leagues in the competition registry"
```

---

### Task 2.2 — Create the home grid components

**Files:**
- Create: `components/CompetitionCard.tsx`
- Create: `components/HomeGrid.tsx`

- [ ] **Step 1: Create `components/CompetitionCard.tsx`**

```tsx
import Link from "next/link";
import type { Competition } from "@/types";

export default function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Link
      href={`/competition/${competition.code}`}
      className="group flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={competition.emblem}
          alt=""
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">{competition.name}</div>
          <div className="truncate text-xs text-zinc-500">{competition.country}</div>
        </div>
      </div>
      <div className="text-xs text-zinc-500">{competition.season.label}</div>
    </Link>
  );
}
```

- [ ] **Step 2: Create `components/HomeGrid.tsx`**

```tsx
import type { Competition } from "@/types";
import CompetitionCard from "@/components/CompetitionCard";

interface Props {
  competitions: Competition[];
}

export default function HomeGrid({ competitions }: Props) {
  const leagues = competitions.filter((c) => c.format === "league");
  const tournaments = competitions.filter((c) => c.format === "tournament");

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Leagues</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((c) => <CompetitionCard key={c.code} competition={c} />)}
        </div>
      </section>

      {tournaments.length > 0 && (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Tournaments</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((c) => <CompetitionCard key={c.code} competition={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/CompetitionCard.tsx components/HomeGrid.tsx
git commit -m "Add home grid + competition card components"
```

---

### Task 2.3 — Replace `app/page.tsx` with the home grid

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the entire contents of `app/page.tsx`**

```tsx
import { COMPETITIONS } from "@/lib/competitions";
import HomeGrid from "@/components/HomeGrid";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-100">Footy Scenarios</h1>
        <p className="text-sm text-zinc-400">Pick a competition to simulate.</p>
      </header>
      <HomeGrid competitions={COMPETITIONS} />
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Make / render the home grid of competitions"
```

---

### Task 2.4 — Create the `/competition/[code]` route with format dispatch

**Files:**
- Create: `app/competition/[code]/page.tsx`

- [ ] **Step 1: Create the route file**

```tsx
import { notFound } from "next/navigation";
import { getCompetition } from "@/lib/competitions";
import { getFixtures, getStandings } from "@/lib/footballData";
import ScenarioBuilder from "@/components/ScenarioBuilder";

export const revalidate = 120;

interface Params {
  code: string;
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { code } = await params;
  const competition = getCompetition(code);
  if (!competition) notFound();

  if (competition.format === "tournament") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">{competition.name}</h1>
        <div className="mt-6 rounded border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
          Tournament UI coming in the next phase. The data layer is wired; the bracket UI hasn't shipped yet.
        </div>
      </main>
    );
  }

  let standings, fixtures;
  try {
    [standings, fixtures] = await Promise.all([
      getStandings(competition.code),
      getFixtures(competition.code),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">{competition.name}</h1>
        <div className="mt-6 rounded border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
          <p className="font-semibold">Data fetch failed.</p>
          <p className="mt-2">{message}</p>
        </div>
      </main>
    );
  }

  return (
    <ScenarioBuilder
      competition={competition}
      standings={standings}
      fixtures={fixtures}
      fetchedAt={new Date().toISOString()}
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/competition/[code]/page.tsx
git commit -m "Add /competition/[code] route with format dispatch"
```

---

### Task 2.5 — Smoke-test all 9 league routes and the tournament placeholders

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Visit each league URL and confirm the scenario builder renders**

For each of these 9 URLs, open the page and confirm: emblem + name in header, standings load (no red error box), a fixture grid is visible:

- http://localhost:3000/
- http://localhost:3000/competition/PL
- http://localhost:3000/competition/PD
- http://localhost:3000/competition/BL1
- http://localhost:3000/competition/SA
- http://localhost:3000/competition/FL1
- http://localhost:3000/competition/DED
- http://localhost:3000/competition/PPL
- http://localhost:3000/competition/ELC
- http://localhost:3000/competition/BSA

If any league returns an empty standings array, note it — football-data.org's free tier sometimes returns `[]` for a comp out of season; that's an upstream-data issue, not a code issue.

- [ ] **Step 3: Visit each tournament URL and confirm the placeholder renders**

- http://localhost:3000/competition/CL
- http://localhost:3000/competition/EC
- http://localhost:3000/competition/WC

Each should show "Tournament UI coming in the next phase".

(Note: tournament entries don't exist in the registry yet — they arrive in Phase 3, Task 3.1. Until then these three URLs return Next.js's 404 page. That's the expected Phase 2 state.)

- [ ] **Step 4: Stop the dev server**

Press `Ctrl-C`.

- [ ] **Step 5: Run all tests one more time**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: STOP and surface for user review**

Write a brief summary to the user:
> "Phase 2 complete. `/` is the home grid, each league has its own route, and all 9 leagues work end-to-end with their correct tiebreakers. Tournaments still 404 (registered in Phase 3). Ready for Phase 3 — tournament data + group stage — when you say so."

Do NOT begin Phase 3 until the user confirms.

---

## Phase 3 — Tournament data + group stage

**Outcome of this phase:** Tournament routes (WC, EC, CL) render group cards with fixture grids and projected group tables, top-2 (and best-thirds where applicable) flagged. Knockout bracket is still a placeholder at the bottom of the page.

---

### Task 3.1 — Add tournament entries to the registry (no bracketTemplate yet)

**Files:**
- Modify: `lib/competitions.ts`

> The `bracketTemplate` field is only used in Phase 4. Phase 3 only needs `groupCount` to lay out the group cards.

- [ ] **Step 1: Append the 3 tournament entries to `COMPETITIONS`**

```ts
  {
    code: "CL",
    name: "UEFA Champions League",
    country: "Europe",
    emblem: "https://crests.football-data.org/CL.png",
    format: "tournament",
    tiebreaker: "uefa",
    season: { startYear: 2025, label: "2025/26" },
    groupCount: 8,
  },
  {
    code: "EC",
    name: "European Championship",
    country: "International",
    emblem: "https://crests.football-data.org/EC.png",
    format: "tournament",
    tiebreaker: "uefa",
    season: { startYear: 2024, label: "Euro 2024" },
    groupCount: 6,
  },
  {
    code: "WC",
    name: "FIFA World Cup",
    country: "International",
    emblem: "https://crests.football-data.org/WC.png",
    format: "tournament",
    tiebreaker: "fifa",
    season: { startYear: 2026, label: "World Cup 2026" },
    groupCount: 12,
  },
```

- [ ] **Step 2: Run the registry test**

Run: `npx vitest run tests/competitions.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/competitions.ts
git commit -m "Register 3 tournament entries (CL, EC, WC)"
```

---

### Task 3.2 — Verify the football-data.org tournament fixture shape

**Files:**
- Create: `scripts/inspect-tournament-fixtures.ts` (temporary, deleted at the end of this task)

- [ ] **Step 1: Write a one-off inspection script**

```ts
// scripts/inspect-tournament-fixtures.ts
// Run with: npx tsx scripts/inspect-tournament-fixtures.ts
const KEY = process.env.FOOTBALL_DATA_API_KEY;
if (!KEY) { console.error("Set FOOTBALL_DATA_API_KEY"); process.exit(1); }

for (const code of ["CL", "EC", "WC"]) {
  const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/matches`, {
    headers: { "X-Auth-Token": KEY },
  });
  if (!res.ok) {
    console.log(`${code}: HTTP ${res.status}`);
    continue;
  }
  const json = await res.json();
  const sample = (json.matches ?? []).slice(0, 5);
  console.log(`──── ${code} ──── ${json.matches?.length ?? 0} matches`);
  for (const m of sample) {
    console.log({
      stage: m.stage,
      group: m.group,
      matchday: m.matchday,
      home: m.homeTeam?.name,
      away: m.awayTeam?.name,
    });
  }
}
```

- [ ] **Step 2: Run the script and inspect output**

```bash
npx tsx scripts/inspect-tournament-fixtures.ts
```

Confirm each response includes a `group` field of the form `"GROUP_A"` (or similar) on group-stage matches, and a `stage` field that takes values like `"GROUP_STAGE"`, `"LAST_16"`, `"QUARTER_FINALS"`, etc. Write the actual observed values to a comment block at the bottom of `lib/footballData.ts` as a "Discovered tournament shape" reference.

If the field names or value patterns differ from what the spec assumes (e.g. `groupName` instead of `group`), update the Zod schema and the `Fixture` mapping in Task 3.3 to match the reality.

- [ ] **Step 3: Delete the script**

```bash
rm scripts/inspect-tournament-fixtures.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/footballData.ts
git commit -m "Document football-data.org tournament fixture shape (stage/group)"
```

---

### Task 3.3 — Extend `Fixture` and the data layer with `group` and `stage`

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/footballData.ts`

- [ ] **Step 1: Extend `Fixture` in `types/index.ts`**

Find the existing `Fixture` interface (around line 27) and add two optional fields:

```ts
export interface Fixture {
  id: FixtureId;
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  status: FixtureStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  utcDate: string;
  group?: string;
  stage?: TournamentStage;
  legNumber?: number;
}
```

(`TournamentStage` is already exported from the multi-competition block added in Task 1.1.)

- [ ] **Step 2: Extend the Zod schema and the mapper in `lib/footballData.ts`**

Find the `matchSchema` definition and add `group` and `stage` as optional:

```ts
const matchSchema = z.object({
  id: z.number(),
  matchday: z.number().nullable(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  status: z.string(),
  utcDate: z.string(),
  stage: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  score: z.object({
    fullTime: z.object({
      home: z.number().nullable(),
      away: z.number().nullable(),
    }),
  }),
});
```

In the `getFixtures` mapper, pass them through:

```ts
.map((m) => ({
  id: m.id,
  matchday: m.matchday ?? 0,
  homeTeam: normalizeTeam(m.homeTeam),
  awayTeam: normalizeTeam(m.awayTeam),
  status: m.status === "FINISHED" ? "FINISHED" as const : "SCHEDULED" as const,
  homeGoals: m.score.fullTime.home,
  awayGoals: m.score.fullTime.away,
  utcDate: m.utcDate,
  group: m.group ?? undefined,
  stage: normalizeStage(m.stage),
}));
```

Add a helper `normalizeStage` near the top of the file:

```ts
function normalizeStage(s: string | null | undefined): import("@/types").TournamentStage | undefined {
  if (!s) return undefined;
  switch (s) {
    case "GROUP_STAGE":
    case "LAST_16":
    case "QUARTER_FINALS":
    case "SEMI_FINALS":
    case "FINAL":
    case "PLAYOFFS":
      return s;
    default:
      return undefined;
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Smoke check that EPL fixtures still load**

```bash
npm run dev
```

Open http://localhost:3000/competition/PL. Confirm the standings + fixtures still render with no error box. (League fixtures have no `group/stage` from the API, so the optional fields stay undefined — backwards compatible.) Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add types/index.ts lib/footballData.ts
git commit -m "Extend Fixture + data layer with optional group/stage/legNumber"
```

---

### Task 3.4 — Implement group-stage projection in `lib/tournament/groupStage.ts`

**Files:**
- Create: `lib/tournament/groupStage.ts`
- Create: `tests/tournament/groupStage.test.ts`

- [ ] **Step 1: Write the failing test in `tests/tournament/groupStage.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { projectGroups } from "@/lib/tournament/groupStage";
import { CHAINS } from "@/lib/tiebreakers/chains";
import type { Fixture, OutcomeMap, Standing, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function emptyStanding(t: Team): Standing {
  return {
    team: t, position: 0, playedGames: 0,
    won: 0, draw: 0, lost: 0, points: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
  };
}

function scheduled(id: number, home: Team, away: Team, group: string): Fixture {
  return {
    id, matchday: 1, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-06-01T00:00:00Z",
    group, stage: "GROUP_STAGE",
  };
}

describe("projectGroups", () => {
  const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
  const base: Standing[] = [a, b, c, d].map(emptyStanding);
  const fixtures: Fixture[] = [
    scheduled(101, a, b, "GROUP_A"),
    scheduled(102, c, d, "GROUP_A"),
    scheduled(103, a, c, "GROUP_A"),
    scheduled(104, b, d, "GROUP_A"),
    scheduled(105, a, d, "GROUP_A"),
    scheduled(106, b, c, "GROUP_A"),
  ];

  it("partitions standings into groups and returns standings per group when no outcomes set", () => {
    const result = projectGroups(base, fixtures, {}, CHAINS.fifa);
    expect(result.groupStandings.size).toBe(1);
    expect(result.groupStandings.get("GROUP_A")?.length).toBe(4);
  });

  it("projects standings and qualifies top 2 by chain when outcomes are set", () => {
    const outcomes: OutcomeMap = {
      101: { kind: "H", locked: false }, // A beats B
      103: { kind: "H", locked: false }, // A beats C
      105: { kind: "H", locked: false }, // A beats D
      104: { kind: "H", locked: false }, // B beats D
      106: { kind: "H", locked: false }, // B beats C
      102: { kind: "H", locked: false }, // C beats D
    };
    const result = projectGroups(base, fixtures, outcomes, CHAINS.fifa);
    const qualified = result.qualified.get("GROUP_A")!;
    expect(qualified.map((t) => t.name)).toEqual(["A", "B"]);
  });

  it("ignores fixtures with no group", () => {
    const extras: Fixture[] = [
      ...fixtures,
      { ...scheduled(999, a, b, "GROUP_A"), group: undefined },
    ];
    const result = projectGroups(base, extras, {}, CHAINS.fifa);
    expect(result.groupStandings.size).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tournament/groupStage.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tournament/groupStage'`.

- [ ] **Step 3: Create `lib/tournament/groupStage.ts`**

```ts
import type { Fixture, OutcomeMap, Standing, Team, TiebreakerChain } from "@/types";
import { projectStandings } from "@/lib/scenario";
import { sortByChain } from "@/lib/tiebreakers";

export interface GroupStageResult {
  groupStandings: Map<string, Standing[]>;
  qualified: Map<string, Team[]>;
}

export function projectGroups(
  baseStandings: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
  chain: TiebreakerChain,
  topN = 2,
): GroupStageResult {
  const byGroup = new Map<string, Fixture[]>();
  for (const fix of fixtures) {
    if (!fix.group) continue;
    if (fix.stage && fix.stage !== "GROUP_STAGE") continue;
    if (!byGroup.has(fix.group)) byGroup.set(fix.group, []);
    byGroup.get(fix.group)!.push(fix);
  }

  const groupStandings = new Map<string, Standing[]>();
  const qualified = new Map<string, Team[]>();

  for (const [group, groupFixtures] of byGroup) {
    const groupTeamIds = new Set<number>();
    for (const f of groupFixtures) {
      groupTeamIds.add(f.homeTeam.id);
      groupTeamIds.add(f.awayTeam.id);
    }
    const groupBase = baseStandings.filter((s) => groupTeamIds.has(s.team.id));

    // Synthesize zeroed standings for any group team not in the base array
    // (tournaments often have no pre-existing standings before the first match).
    const haveIds = new Set(groupBase.map((s) => s.team.id));
    for (const f of groupFixtures) {
      for (const t of [f.homeTeam, f.awayTeam]) {
        if (haveIds.has(t.id)) continue;
        haveIds.add(t.id);
        groupBase.push({
          team: t, position: 0, playedGames: 0,
          won: 0, draw: 0, lost: 0, points: 0,
          goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
        });
      }
    }

    const projected = projectStandings(groupBase, groupFixtures, outcomes);
    const { sorted } = sortByChain(projected.standings, projected.h2h, chain);
    groupStandings.set(group, sorted);
    qualified.set(group, sorted.slice(0, topN).map((s) => s.team));
  }

  return { groupStandings, qualified };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/tournament/groupStage.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/groupStage.ts tests/tournament/groupStage.test.ts
git commit -m "Implement group-stage projection (projectGroups)"
```

---

### Task 3.5 — Create the `GroupCard` and minimal `TournamentBuilder` components

**Files:**
- Create: `components/GroupCard.tsx`
- Create: `components/TournamentBuilder.tsx`

- [ ] **Step 1: Create `components/GroupCard.tsx`**

```tsx
"use client";

import type { Fixture, OutcomeMap, Standing, Team } from "@/types";
import TeamCrest from "@/components/TeamCrest";
import FixtureCard from "@/components/FixtureCard";

interface Props {
  groupName: string;
  fixtures: Fixture[];
  standings: Standing[];
  qualified: Team[];
  outcomes: OutcomeMap;
  onSetScore: (fixtureId: number, homeScore: number, awayScore: number) => void;
  onToggleLock: (fixtureId: number) => void;
  onClear: (fixtureId: number) => void;
}

export default function GroupCard({
  groupName, fixtures, standings, qualified, outcomes,
  onSetScore, onToggleLock, onClear,
}: Props) {
  const qualifiedIds = new Set(qualified.map((t) => t.id));
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <h3 className="text-sm font-semibold text-zinc-200">{groupName.replace(/_/g, " ")}</h3>

      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="text-left">Team</th>
            <th className="text-right">P</th>
            <th className="text-right">GD</th>
            <th className="text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.team.id} className={qualifiedIds.has(row.team.id) ? "bg-emerald-950/30" : ""}>
              <td className="py-1">
                <div className="flex items-center gap-2">
                  <TeamCrest team={row.team} size={14} />
                  <span className="truncate">{row.team.shortName}</span>
                </div>
              </td>
              <td className="text-right">{row.playedGames}</td>
              <td className="text-right">{row.goalDifference}</td>
              <td className="text-right font-semibold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2">
        {fixtures.map((fix) => (
          <FixtureCard
            key={fix.id}
            fixture={fix}
            outcome={outcomes[fix.id]}
            onSetScore={(h, a) => onSetScore(fix.id, h, a)}
            onToggleLock={() => onToggleLock(fix.id)}
            onClear={() => onClear(fix.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

> If `FixtureCard`'s actual prop names differ from `fixture / outcome / onSetScore / onToggleLock / onClear`, adjust to match. (Check `components/FixtureCard.tsx`.) Don't change `FixtureCard` itself.

- [ ] **Step 2: Create `components/TournamentBuilder.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Competition, Fixture, Outcome, OutcomeMap, Scenario, Standing } from "@/types";
import { CHAINS } from "@/lib/tiebreakers";
import { projectGroups } from "@/lib/tournament/groupStage";
import { decodeScenario, encodeScenario } from "@/lib/urlState";
import TopBar from "@/components/TopBar";
import GroupCard from "@/components/GroupCard";

interface Props {
  competition: Competition;
  standings: Standing[];
  fixtures: Fixture[];
  fetchedAt: string;
}

export default function TournamentBuilder({ competition, standings, fixtures, fetchedAt }: Props) {
  const [scenario, setScenario] = useState<Scenario>({ cluster: [], outcomes: {} });

  useEffect(() => {
    setScenario(decodeScenario(window.location.hash));
    const onHashChange = () => setScenario(decodeScenario(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function updateScenario(next: Scenario) {
    setScenario(next);
    const encoded = encodeScenario(next);
    const url = encoded ? `#${encoded}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  function setOutcomeFor(fixtureId: number, mut: (prev: Outcome | undefined) => Outcome | undefined) {
    const prev = scenario.outcomes[fixtureId];
    const next = mut(prev);
    const outcomes: OutcomeMap = { ...scenario.outcomes };
    if (next === undefined) delete outcomes[fixtureId];
    else outcomes[fixtureId] = next;
    updateScenario({ ...scenario, outcomes });
  }

  function handleSetScore(fixtureId: number, homeScore: number, awayScore: number) {
    setOutcomeFor(fixtureId, (prev) => ({
      kind: homeScore > awayScore ? "H" : homeScore < awayScore ? "A" : "D",
      locked: prev?.locked ?? false,
      homeScore, awayScore,
    }));
  }

  function handleToggleLock(fixtureId: number) {
    setOutcomeFor(fixtureId, (prev) => prev ? { ...prev, locked: !prev.locked } : prev);
  }

  function handleClear(fixtureId: number) {
    setOutcomeFor(fixtureId, () => undefined);
  }

  const groupFixtures = useMemo(
    () => fixtures.filter((f) => f.group && (!f.stage || f.stage === "GROUP_STAGE")),
    [fixtures],
  );

  const groups = useMemo(
    () => projectGroups(standings, groupFixtures, scenario.outcomes, CHAINS[competition.tiebreaker]),
    [standings, groupFixtures, scenario.outcomes, competition],
  );

  const totalScheduled = useMemo(() => fixtures.filter((f) => f.status === "SCHEDULED").length, [fixtures]);
  const fixturesLeft = totalScheduled - Object.keys(scenario.outcomes).length;

  const groupNames = [...groups.groupStandings.keys()].sort();

  return (
    <div className="min-h-screen">
      <TopBar
        fetchedAt={fetchedAt}
        fixturesLeft={Math.max(0, fixturesLeft)}
        onResetPicks={() => updateScenario({ ...scenario, outcomes: {} })}
        onSimulateAll={() => {/* simulate-all for tournaments lands in Phase 4 */}}
      />
      <main className="mx-auto max-w-6xl space-y-6 p-4">
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-zinc-100">{competition.name}</h1>
          <p className="text-xs text-zinc-500">{competition.season.label} — Group stage</p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupNames.map((g) => {
            const standings = groups.groupStandings.get(g) ?? [];
            const qualified = groups.qualified.get(g) ?? [];
            const fixturesForGroup = groupFixtures.filter((f) => f.group === g);
            return (
              <GroupCard
                key={g}
                groupName={g}
                fixtures={fixturesForGroup}
                standings={standings}
                qualified={qualified}
                outcomes={scenario.outcomes}
                onSetScore={handleSetScore}
                onToggleLock={handleToggleLock}
                onClear={handleClear}
              />
            );
          })}
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
          Knockout bracket lands in Phase 4.
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `FixtureCard` props don't match, fix in `GroupCard`.)

- [ ] **Step 4: Commit**

```bash
git add components/GroupCard.tsx components/TournamentBuilder.tsx
git commit -m "Add GroupCard + minimal TournamentBuilder (group stage only)"
```

---

### Task 3.6 — Wire the `/competition/[code]` dispatcher to `TournamentBuilder`

**Files:**
- Modify: `app/competition/[code]/page.tsx`

- [ ] **Step 1: Replace the tournament-format branch**

Replace the existing `if (competition.format === "tournament")` block in `app/competition/[code]/page.tsx` with:

```tsx
if (competition.format === "tournament") {
  let standings, fixtures;
  try {
    [standings, fixtures] = await Promise.all([
      getStandings(competition.code),
      getFixtures(competition.code),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">{competition.name}</h1>
        <div className="mt-6 rounded border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
          <p className="font-semibold">Data fetch failed.</p>
          <p className="mt-2">{message}</p>
        </div>
      </main>
    );
  }

  const { default: TournamentBuilder } = await import("@/components/TournamentBuilder");
  return (
    <TournamentBuilder
      competition={competition}
      standings={standings}
      fixtures={fixtures}
      fetchedAt={new Date().toISOString()}
    />
  );
}
```

> The dynamic import is just to keep client-side bundle for league users lean. A normal top-of-file import works too — switch if you prefer.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test all 3 tournament routes**

```bash
npm run dev
```

- http://localhost:3000/competition/WC — should show group cards (12 groups for WC 2026).
- http://localhost:3000/competition/EC — should show group cards (6 groups for Euro 2024). Note: this is a past tournament, so all fixtures will be `FINISHED`. Group tables should reflect actual real results.
- http://localhost:3000/competition/CL — likely shows the new league-phase format football-data.org uses for UCL post-2024; you may see one group with all teams. If so, the engine still works but the "groups" view is degenerate — flag this and move on; UCL format polish is Phase 5.

Confirm group standings sort correctly and top-2 teams are highlighted.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: STOP and surface for user review**

Write a brief summary to the user:
> "Phase 3 complete. World Cup, Euros, and UCL group-stage views work — group cards render, fixture toggles re-sort the group tables, top-2 are highlighted. Bracket is still a placeholder. Ready for Phase 4 — knockout bracket — when you say so."

Do NOT begin Phase 4 until the user confirms.

---

## Phase 4 — Knockout bracket

**Outcome of this phase:** Tournaments are fully functional. The user can toggle group-stage outcomes, then click through the knockout bracket to pick winners round by round; the projection panel shows each team's finishing position (Winner / Runner-up / SF / QF / R16 / Group stage).

---

### Task 4.1 — Add `bracketTemplate` to each tournament registry entry

**Files:**
- Modify: `lib/competitions.ts`

> Bracket templates encode which feeder ties produce the home and away slots of each later tie. Templates differ per tournament (16-team vs 24-team vs 32-team brackets). World Cup 2026 has 48 teams and an R32 round; verify the live data before locking the WC template.

- [ ] **Step 1: Add `bracketTemplate` to the three tournament entries**

For UCL (16-team knockout):

```ts
bracketTemplate: {
  rounds: {
    LAST_16: [
      { id: "R16-1" }, { id: "R16-2" }, { id: "R16-3" }, { id: "R16-4" },
      { id: "R16-5" }, { id: "R16-6" }, { id: "R16-7" }, { id: "R16-8" },
    ],
    QUARTER_FINALS: [
      { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
      { id: "QF2", feederHome: "R16-3", feederAway: "R16-4" },
      { id: "QF3", feederHome: "R16-5", feederAway: "R16-6" },
      { id: "QF4", feederHome: "R16-7", feederAway: "R16-8" },
    ],
    SEMI_FINALS: [
      { id: "SF1", feederHome: "QF1", feederAway: "QF2" },
      { id: "SF2", feederHome: "QF3", feederAway: "QF4" },
    ],
    FINAL: [
      { id: "F1", feederHome: "SF1", feederAway: "SF2" },
    ],
  },
},
```

For EC (Euros 2024, 16-team knockout):

```ts
bracketTemplate: {
  rounds: {
    LAST_16: [
      { id: "R16-1" }, { id: "R16-2" }, { id: "R16-3" }, { id: "R16-4" },
      { id: "R16-5" }, { id: "R16-6" }, { id: "R16-7" }, { id: "R16-8" },
    ],
    QUARTER_FINALS: [
      { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
      { id: "QF2", feederHome: "R16-3", feederAway: "R16-4" },
      { id: "QF3", feederHome: "R16-5", feederAway: "R16-6" },
      { id: "QF4", feederHome: "R16-7", feederAway: "R16-8" },
    ],
    SEMI_FINALS: [
      { id: "SF1", feederHome: "QF1", feederAway: "QF2" },
      { id: "SF2", feederHome: "QF3", feederAway: "QF4" },
    ],
    FINAL: [
      { id: "F1", feederHome: "SF1", feederAway: "SF2" },
    ],
  },
},
```

For WC (World Cup 2026, 32-team knockout):

```ts
bracketTemplate: {
  rounds: {
    PLAYOFFS: [
      { id: "R32-1" }, { id: "R32-2" }, { id: "R32-3" }, { id: "R32-4" },
      { id: "R32-5" }, { id: "R32-6" }, { id: "R32-7" }, { id: "R32-8" },
      { id: "R32-9" }, { id: "R32-10" }, { id: "R32-11" }, { id: "R32-12" },
      { id: "R32-13" }, { id: "R32-14" }, { id: "R32-15" }, { id: "R32-16" },
    ],
    LAST_16: [
      { id: "R16-1", feederHome: "R32-1", feederAway: "R32-2" },
      { id: "R16-2", feederHome: "R32-3", feederAway: "R32-4" },
      { id: "R16-3", feederHome: "R32-5", feederAway: "R32-6" },
      { id: "R16-4", feederHome: "R32-7", feederAway: "R32-8" },
      { id: "R16-5", feederHome: "R32-9", feederAway: "R32-10" },
      { id: "R16-6", feederHome: "R32-11", feederAway: "R32-12" },
      { id: "R16-7", feederHome: "R32-13", feederAway: "R32-14" },
      { id: "R16-8", feederHome: "R32-15", feederAway: "R32-16" },
    ],
    QUARTER_FINALS: [
      { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
      { id: "QF2", feederHome: "R16-3", feederAway: "R16-4" },
      { id: "QF3", feederHome: "R16-5", feederAway: "R16-6" },
      { id: "QF4", feederHome: "R16-7", feederAway: "R16-8" },
    ],
    SEMI_FINALS: [
      { id: "SF1", feederHome: "QF1", feederAway: "QF2" },
      { id: "SF2", feederHome: "QF3", feederAway: "QF4" },
    ],
    FINAL: [
      { id: "F1", feederHome: "SF1", feederAway: "SF2" },
    ],
  },
},
```

- [ ] **Step 2: Re-run registry tests**

Run: `npx vitest run tests/competitions.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/competitions.ts
git commit -m "Add bracketTemplate to UCL, EC, WC registry entries"
```

---

### Task 4.2 — Add `bracketChoices` to `Scenario` and the URL state codec

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/urlState.ts`
- Modify: `tests/urlState.test.ts`

- [ ] **Step 1: Extend `Scenario` in `types/index.ts`**

Find the existing `Scenario` interface and add `bracketChoices`:

```ts
export interface Scenario {
  cluster: TeamId[];
  outcomes: OutcomeMap;
  bracketChoices?: Record<string, TeamId>;
}
```

- [ ] **Step 2: Read the current `urlState.ts` to understand the encoding**

Open `lib/urlState.ts` and read its contents. Identify how `cluster` and `outcomes` are encoded. The format is a custom URL hash with field separators.

- [ ] **Step 3: Add a `b:` section to the encoder/decoder**

Extend the encoder to include `bracketChoices` as a `b:` section that lists `tieId=teamId` pairs separated by commas. Extend the decoder to parse the `b:` section back into `Record<string, TeamId>`. Preserve backwards compatibility: hashes without a `b:` section decode to a scenario with no `bracketChoices`.

> Exact wire format: append a `&b=tieId1:teamId1,tieId2:teamId2` segment when `bracketChoices` is non-empty. Decoder splits on `&`, finds the `b=` chunk, and parses it.

Code change in `encodeScenario`:

```ts
if (scenario.bracketChoices && Object.keys(scenario.bracketChoices).length > 0) {
  const pairs = Object.entries(scenario.bracketChoices)
    .map(([tieId, teamId]) => `${encodeURIComponent(tieId)}:${teamId}`)
    .join(",");
  parts.push(`b=${pairs}`);
}
```

Code change in `decodeScenario` (inside the part-by-part loop):

```ts
if (part.startsWith("b=")) {
  const body = part.slice(2);
  if (body.length === 0) continue;
  const bracketChoices: Record<string, number> = {};
  for (const pair of body.split(",")) {
    const [tieId, teamIdStr] = pair.split(":");
    const teamId = Number(teamIdStr);
    if (!tieId || !Number.isFinite(teamId)) continue;
    bracketChoices[decodeURIComponent(tieId)] = teamId;
  }
  scenario.bracketChoices = bracketChoices;
  continue;
}
```

> The above assumes the existing `urlState.ts` uses an `&`-separated, prefix-tagged format. If the actual encoding differs (e.g. JSON-base64), adapt the change to match the existing style. Don't rewrite the codec.

- [ ] **Step 4: Add a test in `tests/urlState.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { decodeScenario, encodeScenario } from "@/lib/urlState";

describe("urlState bracketChoices roundtrip", () => {
  it("encodes and decodes bracketChoices", () => {
    const original = {
      cluster: [],
      outcomes: {},
      bracketChoices: { "QF1": 10, "QF2": 22, "SF1": 10 },
    };
    const encoded = encodeScenario(original);
    const decoded = decodeScenario(encoded);
    expect(decoded.bracketChoices).toEqual(original.bracketChoices);
  });

  it("decodes a hash without bracketChoices as undefined", () => {
    const decoded = decodeScenario("");
    expect(decoded.bracketChoices).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run all url-state tests**

Run: `npx vitest run tests/urlState.test.ts`
Expected: all PASS, including the new tests.

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/urlState.ts tests/urlState.test.ts
git commit -m "Persist bracketChoices in scenario URL state"
```

---

### Task 4.3 — Implement bracket projection in `lib/tournament/bracket.ts`

**Files:**
- Create: `lib/tournament/bracket.ts`
- Create: `tests/tournament/bracket.test.ts`

- [ ] **Step 1: Write the failing test in `tests/tournament/bracket.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildBracket, resolveBracket } from "@/lib/tournament/bracket";
import type { BracketTemplate, Fixture, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

const template: BracketTemplate = {
  rounds: {
    LAST_16: [
      { id: "R16-1" }, { id: "R16-2" }, { id: "R16-3" }, { id: "R16-4" },
      { id: "R16-5" }, { id: "R16-6" }, { id: "R16-7" }, { id: "R16-8" },
    ],
    QUARTER_FINALS: [
      { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
      { id: "QF2", feederHome: "R16-3", feederAway: "R16-4" },
      { id: "QF3", feederHome: "R16-5", feederAway: "R16-6" },
      { id: "QF4", feederHome: "R16-7", feederAway: "R16-8" },
    ],
    SEMI_FINALS: [
      { id: "SF1", feederHome: "QF1", feederAway: "QF2" },
      { id: "SF2", feederHome: "QF3", feederAway: "QF4" },
    ],
    FINAL: [
      { id: "F1", feederHome: "SF1", feederAway: "SF2" },
    ],
  },
};

describe("buildBracket", () => {
  it("builds a tie per template round with empty fixtures and no resolved teams", () => {
    const ties = buildBracket(template, []);
    const ids = ties.map((t) => t.id);
    expect(ids).toContain("R16-1");
    expect(ids).toContain("QF1");
    expect(ids).toContain("F1");
    expect(ties.find((t) => t.id === "QF1")?.feederHome).toBe("R16-1");
  });

  it("attaches a fixture from the API to its matching tie by stage + index", () => {
    const a = team(1, "A"); const b = team(2, "B");
    const f: Fixture = {
      id: 999, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED",
      homeGoals: null, awayGoals: null, utcDate: "2026-07-01T00:00:00Z",
      stage: "LAST_16",
    };
    const ties = buildBracket(template, [f]);
    const r16_1 = ties.find((t) => t.id === "R16-1")!;
    expect(r16_1.fixtures.length).toBe(1);
    expect(r16_1.homeTeam?.id).toBe(1);
    expect(r16_1.awayTeam?.id).toBe(2);
  });
});

describe("resolveBracket", () => {
  it("fills feeder slots when user picks winners", () => {
    const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
    const r16_1: Fixture = { id: 1, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "2026-07-01T00:00:00Z", stage: "LAST_16" };
    const r16_2: Fixture = { id: 2, matchday: 1, homeTeam: c, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "2026-07-01T00:00:00Z", stage: "LAST_16" };
    const ties = buildBracket(template, [r16_1, r16_2]);
    const choices = { "R16-1": 1, "R16-2": 3 };
    const resolved = resolveBracket(ties, choices);
    const qf1 = resolved.find((t) => t.id === "QF1")!;
    expect(qf1.homeTeam?.id).toBe(1);
    expect(qf1.awayTeam?.id).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tournament/bracket.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tournament/bracket'`.

- [ ] **Step 3: Create `lib/tournament/bracket.ts`**

```ts
import type { BracketTemplate, BracketTie, Fixture, TeamId, TournamentStage } from "@/types";

const ROUND_ORDER: TournamentStage[] = [
  "PLAYOFFS", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL",
];

/**
 * Build the bracket skeleton from the template and attach any fixtures from the API
 * whose stage matches a round. Fixtures are attached in array order: the i-th
 * fixture of a stage attaches to the i-th tie of that stage's template.
 *
 * If a fixture has known teams (the API already resolved them — real result or
 * a published draw), the tie's homeTeam/awayTeam are seeded from the fixture.
 */
export function buildBracket(template: BracketTemplate, fixtures: Fixture[]): BracketTie[] {
  const ties: BracketTie[] = [];
  for (const stage of ROUND_ORDER) {
    const round = template.rounds[stage];
    if (!round) continue;
    const stageFixtures = fixtures.filter((f) => f.stage === stage);
    round.forEach((r, idx) => {
      const fix = stageFixtures[idx];
      ties.push({
        id: r.id,
        stage,
        feederHome: r.feederHome,
        feederAway: r.feederAway,
        homeTeam: fix?.homeTeam,
        awayTeam: fix?.awayTeam,
        fixtures: fix ? [fix] : [],
      });
    });
  }
  return ties;
}

/**
 * Walk the bracket in template order, filling each tie's home/away from its
 * feeder ties' chosen winners.
 */
export function resolveBracket(
  ties: BracketTie[],
  choices: Record<string, TeamId>,
): BracketTie[] {
  const byId = new Map(ties.map((t) => [t.id, { ...t }]));

  function winnerOf(tieId: string) {
    const t = byId.get(tieId);
    if (!t) return undefined;
    const winnerId = choices[tieId];
    if (winnerId === undefined) return undefined;
    if (t.homeTeam?.id === winnerId) return t.homeTeam;
    if (t.awayTeam?.id === winnerId) return t.awayTeam;
    return undefined;
  }

  for (const stage of ROUND_ORDER) {
    for (const t of byId.values()) {
      if (t.stage !== stage) continue;
      if (!t.homeTeam && t.feederHome) t.homeTeam = winnerOf(t.feederHome);
      if (!t.awayTeam && t.feederAway) t.awayTeam = winnerOf(t.feederAway);
    }
  }

  return [...byId.values()];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/tournament/bracket.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/bracket.ts tests/tournament/bracket.test.ts
git commit -m "Implement bracket build + resolve with feeder cascade"
```

---

### Task 4.4 — Compose group + bracket in `lib/tournament/projection.ts`

**Files:**
- Create: `lib/tournament/projection.ts`
- Create: `tests/tournament/projection.test.ts`

- [ ] **Step 1: Write the failing test in `tests/tournament/projection.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { projectTournament } from "@/lib/tournament/projection";
import { getCompetition } from "@/lib/competitions";
import type { Fixture, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

describe("projectTournament", () => {
  it("returns finishingPositions including 'Group stage' for non-qualifiers", () => {
    const ec = getCompetition("EC")!;
    const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
    const groupFixtures: Fixture[] = [
      { id: 1, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 2, matchday: 1, homeTeam: c, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 3, matchday: 1, homeTeam: a, awayTeam: c, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 4, matchday: 1, homeTeam: b, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 5, matchday: 1, homeTeam: a, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 6, matchday: 1, homeTeam: b, awayTeam: c, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
    ];
    const outcomes = {
      1: { kind: "H" as const, locked: false }, 3: { kind: "H" as const, locked: false }, 5: { kind: "H" as const, locked: false },
      4: { kind: "H" as const, locked: false }, 6: { kind: "H" as const, locked: false }, 2: { kind: "H" as const, locked: false },
    };
    const result = projectTournament(ec, [], groupFixtures, outcomes, {});
    expect(result.finishingPositions.get(1)).toBe("R16");
    expect(result.finishingPositions.get(2)).toBe("R16");
    expect(result.finishingPositions.get(3)).toBe("Group stage");
    expect(result.finishingPositions.get(4)).toBe("Group stage");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tournament/projection.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tournament/projection'`.

- [ ] **Step 3: Create `lib/tournament/projection.ts`**

```ts
import type {
  BracketTie, Competition, Fixture, OutcomeMap, Standing, Team, TeamId, TournamentStage,
} from "@/types";
import { CHAINS } from "@/lib/tiebreakers";
import { projectGroups, type GroupStageResult } from "@/lib/tournament/groupStage";
import { buildBracket, resolveBracket } from "@/lib/tournament/bracket";

export interface TournamentProjection {
  groupStandings: Map<string, Standing[]>;
  qualified: Map<string, Team[]>;
  bracket: BracketTie[];
  finishingPositions: Map<TeamId, string>;
}

const STAGE_LABEL: Record<TournamentStage, string> = {
  PLAYOFFS: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  FINAL: "Final",
  GROUP_STAGE: "Group stage",
};

export function projectTournament(
  competition: Competition,
  baseStandings: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
  bracketChoices: Record<string, TeamId>,
): TournamentProjection {
  const chain = CHAINS[competition.tiebreaker];
  const groupFixtures = fixtures.filter((f) => f.group);
  const knockoutFixtures = fixtures.filter((f) => f.stage && f.stage !== "GROUP_STAGE");

  const groups: GroupStageResult = projectGroups(baseStandings, groupFixtures, outcomes, chain);

  const ties = competition.bracketTemplate
    ? resolveBracket(buildBracket(competition.bracketTemplate, knockoutFixtures), bracketChoices)
    : [];

  // Compute finishing positions.
  const finishingPositions = new Map<TeamId, string>();

  // 1) Everyone who appears in groupStandings starts as "Group stage".
  for (const standings of groups.groupStandings.values()) {
    for (const s of standings) finishingPositions.set(s.team.id, "Group stage");
  }

  // 2) Qualifiers from groups → R16 / R32 (whichever is the first knockout round).
  const firstKnockout: TournamentStage | undefined =
    ties.find((t) => t.stage === "PLAYOFFS") ? "PLAYOFFS" :
    ties.find((t) => t.stage === "LAST_16") ? "LAST_16" : undefined;

  if (firstKnockout) {
    for (const teams of groups.qualified.values()) {
      for (const t of teams) finishingPositions.set(t.id, STAGE_LABEL[firstKnockout]);
    }
  }

  // 3) Walk knockout rounds in order. Each tie's winner advances to the next stage label;
  //    each loser stays at the current stage label.
  const ROUND_ORDER: TournamentStage[] = ["PLAYOFFS", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
  const tiesByStage = new Map<TournamentStage, BracketTie[]>();
  for (const t of ties) {
    if (!tiesByStage.has(t.stage)) tiesByStage.set(t.stage, []);
    tiesByStage.get(t.stage)!.push(t);
  }

  for (let i = 0; i < ROUND_ORDER.length; i++) {
    const stage = ROUND_ORDER[i];
    const stageTies = tiesByStage.get(stage);
    if (!stageTies) continue;
    const nextStage = ROUND_ORDER.slice(i + 1).find((s) => tiesByStage.get(s)?.length);
    for (const tie of stageTies) {
      const winnerId = bracketChoices[tie.id];
      if (winnerId !== undefined) {
        if (stage === "FINAL") {
          finishingPositions.set(winnerId, "Winner");
          const loserId = tie.homeTeam?.id === winnerId ? tie.awayTeam?.id : tie.homeTeam?.id;
          if (loserId !== undefined) finishingPositions.set(loserId, "Runner-up");
        } else if (nextStage) {
          finishingPositions.set(winnerId, STAGE_LABEL[nextStage]);
        }
      }
    }
  }

  return { groupStandings: groups.groupStandings, qualified: groups.qualified, bracket: ties, finishingPositions };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/tournament/projection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/projection.ts tests/tournament/projection.test.ts
git commit -m "Compose tournament projection (groups + bracket + finishing positions)"
```

---

### Task 4.5 — Build the `Bracket` component

**Files:**
- Create: `components/Bracket.tsx`

> This is a presentational component — no projection logic in it. It receives ties + the current `bracketChoices` and emits an `onPick(tieId, teamId)` callback.

- [ ] **Step 1: Create `components/Bracket.tsx`**

```tsx
"use client";

import type { BracketTie, TeamId, TournamentStage } from "@/types";
import TeamCrest from "@/components/TeamCrest";

interface Props {
  ties: BracketTie[];
  choices: Record<string, TeamId>;
  onPick: (tieId: string, teamId: TeamId) => void;
}

const STAGE_ORDER: TournamentStage[] = [
  "PLAYOFFS", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL",
];

const STAGE_LABEL: Record<TournamentStage, string> = {
  PLAYOFFS: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  FINAL: "Final",
  GROUP_STAGE: "Group stage",
};

export default function Bracket({ ties, choices, onPick }: Props) {
  const stages = STAGE_ORDER.filter((s) => ties.some((t) => t.stage === s));
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit gap-4 p-2">
        {stages.map((stage) => (
          <div key={stage} className="flex min-w-[200px] flex-col gap-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {STAGE_LABEL[stage]}
            </h3>
            {ties.filter((t) => t.stage === stage).map((tie) => (
              <BracketTieCard
                key={tie.id}
                tie={tie}
                winnerId={choices[tie.id]}
                onPick={onPick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketTieCard({
  tie, winnerId, onPick,
}: {
  tie: BracketTie;
  winnerId: TeamId | undefined;
  onPick: (tieId: string, teamId: TeamId) => void;
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950">
      <Slot tie={tie} team={tie.homeTeam} feeder={tie.feederHome} winnerId={winnerId} onPick={onPick} side="home" />
      <div className="border-t border-zinc-800" />
      <Slot tie={tie} team={tie.awayTeam} feeder={tie.feederAway} winnerId={winnerId} onPick={onPick} side="away" />
    </div>
  );
}

function Slot({
  tie, team, feeder, winnerId, onPick,
}: {
  tie: BracketTie;
  team: BracketTie["homeTeam"];
  feeder: string | undefined;
  winnerId: TeamId | undefined;
  onPick: (tieId: string, teamId: TeamId) => void;
  side: "home" | "away";
}) {
  const isWinner = team && winnerId === team.id;
  const clickable = !!team;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => team && onPick(tie.id, team.id)}
      className={
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition " +
        (clickable ? "hover:bg-zinc-900 " : "cursor-not-allowed text-zinc-600 ") +
        (isWinner ? "bg-emerald-950/40 font-semibold text-emerald-200" : "text-zinc-300")
      }
    >
      {team ? (
        <>
          <TeamCrest team={team} size={14} />
          <span className="truncate">{team.shortName}</span>
        </>
      ) : (
        <span className="italic text-zinc-500">Winner of {feeder ?? "—"}</span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/Bracket.tsx
git commit -m "Add Bracket component (round columns + click-to-pick slots)"
```

---

### Task 4.6 — Wire the bracket into `TournamentBuilder`

**Files:**
- Modify: `components/TournamentBuilder.tsx`

- [ ] **Step 1: Replace the "knockout placeholder" section with the real bracket**

In `components/TournamentBuilder.tsx`:

Add imports at the top:

```ts
import Bracket from "@/components/Bracket";
import { projectTournament } from "@/lib/tournament/projection";
```

Replace the existing `projectGroups` call with `projectTournament`:

```ts
const projection = useMemo(
  () => projectTournament(
    competition, standings, fixtures, scenario.outcomes, scenario.bracketChoices ?? {},
  ),
  [competition, standings, fixtures, scenario],
);
```

Update the group rendering loop to use `projection.groupStandings` and `projection.qualified` (drop the old `groups` variable).

Add a bracket-choice handler:

```ts
function handlePickWinner(tieId: string, teamId: number) {
  const nextChoices = { ...(scenario.bracketChoices ?? {}), [tieId]: teamId };
  updateScenario({ ...scenario, bracketChoices: nextChoices });
}
```

Replace the "Knockout bracket lands in Phase 4" placeholder section with:

```tsx
<section className="space-y-2">
  <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Knockout bracket</h2>
  <Bracket
    ties={projection.bracket}
    choices={scenario.bracketChoices ?? {}}
    onPick={handlePickWinner}
  />
</section>

<section className="space-y-2">
  <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Finishing positions</h2>
  <FinishingPositions projection={projection} />
</section>
```

At the bottom of the file, add the inline `FinishingPositions` helper:

```tsx
function FinishingPositions({ projection }: { projection: ReturnType<typeof projectTournament> }) {
  const entries = [...projection.finishingPositions.entries()];
  // Build a team-id → team lookup from the bracket and groups.
  const teams = new Map<number, { id: number; shortName: string; name: string; tla: string; crest: string }>();
  for (const standings of projection.groupStandings.values()) {
    for (const s of standings) teams.set(s.team.id, s.team);
  }
  const order = ["Winner", "Runner-up", "SF", "QF", "R16", "R32", "Group stage"];
  entries.sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]));
  return (
    <ul className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
      {entries.map(([id, pos]) => {
        const t = teams.get(id);
        if (!t) return null;
        return (
          <li key={id} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-2 py-1">
            <span className="truncate">{t.shortName}</span>
            <span className="text-zinc-500">{pos}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

- http://localhost:3000/competition/EC — Euros 2024. Pick a winner of an R16 tie; verify it appears as the "home" team in the corresponding QF tie. Verify the "Finishing positions" panel updates.
- http://localhost:3000/competition/WC — World Cup. With no scheduled matches yet, the bracket renders empty placeholders; clicking does nothing because no teams are seeded. This is expected pre-tournament behavior.

Stop the dev server.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add components/TournamentBuilder.tsx
git commit -m "Render bracket + finishing positions in TournamentBuilder"
```

---

### Task 4.7 — Phase 4 verification + STOP for final review

- [ ] **Step 1: Type-check + all tests + dev smoke**

```bash
npx tsc --noEmit && npm test
```

Both should be clean.

```bash
npm run dev
```

Walk through every URL one more time:

- `/` — home grid shows all 12.
- `/competition/PL` through `/competition/BSA` — leagues fully work.
- `/competition/CL`, `/EC`, `/WC` — tournaments show groups + bracket + finishing positions.

Stop the dev server.

- [ ] **Step 2: STOP and surface for user review**

Write a brief summary to the user:
> "Phase 4 complete. All 12 competitions are now fully functional. Leagues use their correct tiebreaker chains; tournaments support group toggles + clickable bracket + finishing-position summary. Saved scenarios and URL migration (Phase 5) are still deferred per your earlier call — let me know when you want to take that on as a separate spec."

Do NOT begin Phase 5 — it is intentionally out of scope per the spec.

---

## Phase 5 — Saved scenarios + URL migration (DEFERRED)

Per spec §2 and §11.5, this phase is intentionally not detailed here. When the user is ready to take it on, brainstorm fresh to settle the open scoping question (per-comp vs global saved list) and write a separate plan.

The work, when it happens, will involve:
- Migrating `tests/urlState.test.ts` callers and the `SavedScenarios` component to carry a competition code per saved entry.
- Adding a one-shot redirect from old hash-only URLs (`/#abc123`) to `/competition/PL#abc123`.
- Updating the home page to surface a "Recent scenarios" section.

No tasks in this plan; a separate plan supersedes this section.
