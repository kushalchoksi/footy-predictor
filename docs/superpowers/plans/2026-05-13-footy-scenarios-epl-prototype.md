# Footy Scenarios EPL Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Next.js prototype of Footy Scenarios for the Premier League — users pick a cluster of teams, toggle W/D/L on every remaining EPL fixture, and see the projected final table update live with correct EPL tiebreakers. Every scenario is shareable via URL.

**Architecture:** Next.js 15 App Router with TypeScript and Tailwind. Server components fetch standings + fixtures from football-data.org through a server-only client that caches with `unstable_cache` (10-min TTL). The browser holds zero secrets. Scenario state lives in the URL hash for free shareability. Pure-logic modules (tiebreakers, scenario projection, ranges, decided detection, URL state) are TDD'd with Vitest.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest, Zod (response validation), football-data.org (v4 REST API).

**Spec:** [`docs/superpowers/specs/2026-05-13-footy-scenarios-epl-prototype-design.md`](../specs/2026-05-13-footy-scenarios-epl-prototype-design.md)

---

## File Structure

Files this plan creates (relative to repo root):

```
app/
  layout.tsx                    root layout, fonts, Tailwind, dark theme
  page.tsx                      server component: fetch standings+fixtures, hand to <ScenarioBuilder>
  globals.css                   Tailwind directives + base CSS variables
  api/standings/route.ts        GET → cached football-data.org standings
  api/fixtures/route.ts         GET → cached football-data.org fixtures (SCHEDULED + FINISHED)
components/
  ScenarioBuilder.tsx           client component: top-level state, URL-hash sync
  ClusterPicker.tsx             auto-suggestions + custom multi-select
  FixtureGrid.tsx               groups fixtures by matchweek
  FixtureRow.tsx                one fixture: home/away crests + H/D/A buttons + lock toggle
  LiveTable.tsx                 projected table with color-coded bands
  SummaryBadges.tsx             "Already champions" etc.
  ShareBar.tsx                  Copy link + Save scenario
  SavedScenarios.tsx            list of locally-saved scenarios
lib/
  footballData.ts               server-only API client with unstable_cache wrapper
  tiebreakers.ts                pluggable compareTeams; EPL chain implemented
  scenario.ts                   pure: compute projected table from base + outcomes
  ranges.ts                     pure: min/max points per team
  decided.ts                    pure: "Already champions", "Cannot finish top 4", etc.
  urlState.ts                   encode/decode scenario ↔ URL hash
types/
  index.ts                      shared TS types
tests/
  tiebreakers.test.ts
  scenario.test.ts
  ranges.test.ts
  decided.test.ts
  urlState.test.ts
.env.local.example              FOOTBALL_DATA_API_KEY placeholder
README.md                       setup + run instructions
```

Configuration files: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`.

---

## Task 1: Scaffold Next.js + TypeScript + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.env.local.example`, `README.md`
- Note: do everything from the project root `/Users/kushalchoksi/Documents/dev/claude/footy-predictor`. Do **not** create a subdirectory.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "footy-scenarios",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.4.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "crests.football-data.org" }],
  },
};

export default config;
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```js
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
```

- [ ] **Step 6: Create `app/globals.css`**

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

html, body {
  background: #0b0f17;
  color: #e6edf3;
}
```

- [ ] **Step 7: Create `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Footy Scenarios — EPL",
  description: "Model the remaining Premier League fixtures and see the projected final table.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create `app/page.tsx` (placeholder)**

```tsx
export default function Page() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Footy Scenarios — EPL</h1>
      <p className="mt-2 text-sm text-zinc-400">Scaffolding in progress.</p>
    </main>
  );
}
```

- [ ] **Step 9: Create `.gitignore`**

```
node_modules
.next
.env.local
*.tsbuildinfo
next-env.d.ts
coverage
```

- [ ] **Step 10: Create `.env.local.example`**

```
# Get a free key at https://www.football-data.org/client/register
FOOTBALL_DATA_API_KEY=your-key-here
```

- [ ] **Step 11: Create `README.md`**

```markdown
# Footy Scenarios — EPL Prototype

Toggle every remaining Premier League fixture and see how the final table looks. Share scenarios with a URL.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and paste your [football-data.org](https://www.football-data.org/client/register) key.
3. `npm run dev` and open http://localhost:3000.

## Tests

`npm test`

## Deploy

Push to a Vercel project, set `FOOTBALL_DATA_API_KEY` in the project's environment variables, and it deploys.
```

- [ ] **Step 12: Install dependencies**

Run: `npm install`
Expected: lockfile created, `node_modules/` populated, no errors.

- [ ] **Step 13: Verify dev server boots**

Run: `npm run build`
Expected: build succeeds, `.next/` directory created. (Skip `npm run dev` here; the build pass is enough.)

- [ ] **Step 14: Commit**

```bash
git add -- package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs app/ .gitignore .env.local.example README.md package-lock.json
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind"
```

---

## Task 2: Add Vitest for unit tests

**Files:**
- Create: `vitest.config.ts`, `tests/sanity.test.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Create a sanity test**

`tests/sanity.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("sanity", () => {
  it("math still works", () => {
    expect(2 + 2).toBe(4);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: 1 test passes.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/sanity.test.ts
git commit -m "chore: add Vitest with a sanity test"
```

---

## Task 3: Define shared types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Create the types file**

`types/index.ts`:

```ts
export type TeamId = number;
export type FixtureId = number;

export interface Team {
  id: TeamId;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Standing {
  team: Team;
  position: number;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export type FixtureStatus = "SCHEDULED" | "FINISHED";

export interface Fixture {
  id: FixtureId;
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  status: FixtureStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  utcDate: string;
}

export type OutcomeKind = "H" | "D" | "A";

export interface Outcome {
  kind: OutcomeKind;
  locked: boolean;
}

// Map fixtureId -> Outcome. Absent entries are "unset".
export type OutcomeMap = Record<FixtureId, Outcome>;

export interface Scenario {
  cluster: TeamId[];
  outcomes: OutcomeMap;
}

// Pair key for H2H. Always sorted ascending: `${min}|${max}`.
export type PairKey = string;

export interface H2HEntry {
  // Points and goals from the perspective of the lower-id team.
  lowPts: number;
  highPts: number;
  lowGoals: number;
  highGoals: number;
}

export type H2HMap = Record<PairKey, H2HEntry>;

export function pairKey(a: TeamId, b: TeamId): PairKey {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared scenario types"
```

---

## Task 4: Tiebreaker engine (TDD)

**Files:**
- Create: `lib/tiebreakers.ts`
- Test: `tests/tiebreakers.test.ts`

EPL chain (after points tie): GD → GF → H2H → playoff flag.

- [ ] **Step 1: Write failing tests**

`tests/tiebreakers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { compareEPL, type TiebreakContext } from "@/lib/tiebreakers";
import type { Standing, H2HMap } from "@/types";
import { pairKey } from "@/types";

function s(name: string, id: number, pts: number, gd: number, gf: number): Standing {
  return {
    team: { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" },
    position: 0,
    playedGames: 38,
    won: 0, draw: 0, lost: 0,
    points: pts,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
  };
}

const emptyH2H: H2HMap = {};
const ctx = (h2h: H2HMap = emptyH2H): TiebreakContext => ({ h2h, playoffsFlagged: new Set() });

describe("compareEPL", () => {
  it("sorts by points first", () => {
    const a = s("A", 1, 89, 10, 50);
    const b = s("B", 2, 90, 0, 30);
    expect(compareEPL(a, b, ctx())).toBeGreaterThan(0); // b ranks above a
  });

  it("breaks point ties on goal difference (2011-12 City over United)", () => {
    const city = s("Man City", 65, 89, 64, 93);
    const united = s("Man United", 66, 89, 56, 89);
    expect(compareEPL(city, united, ctx())).toBeLessThan(0); // city first
  });

  it("breaks GD ties on goals for", () => {
    const a = s("A", 1, 70, 20, 60);
    const b = s("B", 2, 70, 20, 55);
    expect(compareEPL(a, b, ctx())).toBeLessThan(0); // a first
  });

  it("falls to head-to-head when pts/GD/GF all equal", () => {
    const a = s("A", 1, 70, 20, 60);
    const b = s("B", 2, 70, 20, 60);
    const h2h: H2HMap = {
      [pairKey(1, 2)]: { lowPts: 4, highPts: 1, lowGoals: 3, highGoals: 1 },
    };
    expect(compareEPL(a, b, ctx(h2h))).toBeLessThan(0); // a (low id) won H2H
  });

  it("flags playoff when even H2H is tied", () => {
    const a = s("A", 1, 70, 20, 60);
    const b = s("B", 2, 70, 20, 60);
    const c = ctx();
    const result = compareEPL(a, b, c);
    expect(result).toBe(0);
    expect(c.playoffsFlagged.has(pairKey(1, 2))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: failures because `lib/tiebreakers.ts` doesn't exist yet.

- [ ] **Step 3: Implement `lib/tiebreakers.ts`**

```ts
import type { Standing, H2HMap, TeamId } from "@/types";
import { pairKey } from "@/types";

export interface TiebreakContext {
  h2h: H2HMap;
  playoffsFlagged: Set<string>;
}

export function compareEPL(a: Standing, b: Standing, ctx: TiebreakContext): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;

  const h2hDelta = compareHeadToHead(a.team.id, b.team.id, ctx.h2h);
  if (h2hDelta !== 0) return h2hDelta;

  ctx.playoffsFlagged.add(pairKey(a.team.id, b.team.id));
  return 0;
}

function compareHeadToHead(aId: TeamId, bId: TeamId, h2h: H2HMap): number {
  const entry = h2h[pairKey(aId, bId)];
  if (!entry) return 0;
  const aIsLow = aId < bId;
  const aPts = aIsLow ? entry.lowPts : entry.highPts;
  const bPts = aIsLow ? entry.highPts : entry.lowPts;
  if (aPts !== bPts) return bPts - aPts;
  const aGoals = aIsLow ? entry.lowGoals : entry.highGoals;
  const bGoals = aIsLow ? entry.highGoals : entry.lowGoals;
  if (aGoals !== bGoals) return bGoals - aGoals;
  return 0;
}

export function sortByEPL(standings: Standing[], h2h: H2HMap): { sorted: Standing[]; playoffsFlagged: Set<string> } {
  const ctx: TiebreakContext = { h2h, playoffsFlagged: new Set() };
  const sorted = [...standings].sort((a, b) => compareEPL(a, b, ctx));
  return { sorted, playoffsFlagged: ctx.playoffsFlagged };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: all 5 tiebreaker tests pass (sanity test still passes too).

- [ ] **Step 5: Commit**

```bash
git add lib/tiebreakers.ts tests/tiebreakers.test.ts
git commit -m "feat(tiebreakers): EPL chain with regression cases"
```

---

## Task 5: Scenario projection (TDD)

**Files:**
- Create: `lib/scenario.ts`
- Test: `tests/scenario.test.ts`

Apply outcomes to base standings → new standings + new H2H map. +1 GD per win, 0 per draw. Goal-difference granularity is intentionally coarse (matches spec §6.3 F13: scoreline overrides out of scope).

- [ ] **Step 1: Write failing tests**

`tests/scenario.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { projectStandings } from "@/lib/scenario";
import type { Standing, Fixture, OutcomeMap, Team } from "@/types";
import { pairKey } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function baseStanding(t: Team, pts: number, gf: number, ga: number): Standing {
  return {
    team: t, position: 0, playedGames: 36,
    won: 0, draw: 0, lost: 0,
    points: pts, goalsFor: gf, goalsAgainst: ga, goalDifference: gf - ga,
  };
}

function fixture(id: number, home: Team, away: Team, matchday: number): Fixture {
  return {
    id, matchday, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-05-19T15:00:00Z",
  };
}

describe("projectStandings", () => {
  const arsenal = team(57, "Arsenal");
  const city = team(65, "Man City");
  const spurs = team(73, "Spurs");

  const base: Standing[] = [
    baseStanding(arsenal, 80, 80, 30),
    baseStanding(city, 82, 90, 35),
    baseStanding(spurs, 60, 70, 50),
  ];

  it("home win adds 3 pts to home, +1 GF home, +1 GA away", () => {
    const fix = [fixture(1, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 1: { kind: "H", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);

    const ars = standings.find((s) => s.team.id === 57)!;
    const mci = standings.find((s) => s.team.id === 65)!;

    expect(ars.points).toBe(83);
    expect(ars.won).toBe(1);
    expect(ars.goalsFor).toBe(81);
    expect(ars.playedGames).toBe(37);
    expect(mci.points).toBe(82);
    expect(mci.lost).toBe(1);
    expect(mci.goalsAgainst).toBe(36);
    expect(mci.playedGames).toBe(37);
  });

  it("draw adds 1 pt each, no goals changes", () => {
    const fix = [fixture(2, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 2: { kind: "D", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);
    expect(standings.find((s) => s.team.id === 57)!.points).toBe(81);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(83);
  });

  it("away win adds 3 to away", () => {
    const fix = [fixture(3, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 3: { kind: "A", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(85);
    expect(standings.find((s) => s.team.id === 57)!.lost).toBe(1);
  });

  it("unset outcome leaves both teams unchanged", () => {
    const fix = [fixture(4, arsenal, city, 37)];
    const { standings } = projectStandings(base, fix, {});
    expect(standings.find((s) => s.team.id === 57)!.points).toBe(80);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(82);
  });

  it("records H2H from a projected match", () => {
    const fix = [fixture(5, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 5: { kind: "A", locked: false } };
    const { h2h } = projectStandings(base, fix, outcomes);
    const entry = h2h[pairKey(57, 65)];
    expect(entry).toBeDefined();
    expect(entry.lowPts).toBe(0); // arsenal (low id) lost
    expect(entry.highPts).toBe(3);
  });

  it("ignores fixtures that don't involve any cluster team", () => {
    const fix = [fixture(6, arsenal, spurs, 37)];
    const outcomes: OutcomeMap = { 6: { kind: "H", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(82); // unchanged
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: 6 new failures.

- [ ] **Step 3: Implement `lib/scenario.ts`**

```ts
import type { Standing, Fixture, OutcomeMap, H2HMap, H2HEntry } from "@/types";
import { pairKey } from "@/types";

export interface ProjectionResult {
  standings: Standing[];
  h2h: H2HMap;
}

export function projectStandings(
  base: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
): ProjectionResult {
  const byId = new Map<number, Standing>();
  for (const s of base) {
    byId.set(s.team.id, { ...s });
  }

  const h2h: H2HMap = {};

  for (const fix of fixtures) {
    const outcome = outcomes[fix.id];
    if (!outcome) continue;

    const home = byId.get(fix.homeTeam.id);
    const away = byId.get(fix.awayTeam.id);
    if (!home && !away) continue;

    applyOutcome(home, away, outcome.kind);
    recordH2H(h2h, fix.homeTeam.id, fix.awayTeam.id, outcome.kind);
  }

  return { standings: Array.from(byId.values()), h2h };
}

function applyOutcome(home: Standing | undefined, away: Standing | undefined, kind: "H" | "D" | "A") {
  if (home) home.playedGames += 1;
  if (away) away.playedGames += 1;

  if (kind === "H") {
    if (home) {
      home.points += 3;
      home.won += 1;
      home.goalsFor += 1;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
    }
    if (away) {
      away.lost += 1;
      away.goalsAgainst += 1;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    }
  } else if (kind === "A") {
    if (away) {
      away.points += 3;
      away.won += 1;
      away.goalsFor += 1;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    }
    if (home) {
      home.lost += 1;
      home.goalsAgainst += 1;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
    }
  } else {
    if (home) { home.points += 1; home.draw += 1; }
    if (away) { away.points += 1; away.draw += 1; }
  }
}

function recordH2H(h2h: H2HMap, homeId: number, awayId: number, kind: "H" | "D" | "A") {
  const key = pairKey(homeId, awayId);
  const lowIsHome = homeId < awayId;
  const prev: H2HEntry = h2h[key] ?? { lowPts: 0, highPts: 0, lowGoals: 0, highGoals: 0 };

  if (kind === "H") {
    if (lowIsHome) { prev.lowPts += 3; prev.lowGoals += 1; }
    else { prev.highPts += 3; prev.highGoals += 1; }
  } else if (kind === "A") {
    if (lowIsHome) { prev.highPts += 3; prev.highGoals += 1; }
    else { prev.lowPts += 3; prev.lowGoals += 1; }
  } else {
    prev.lowPts += 1; prev.highPts += 1;
  }

  h2h[key] = prev;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: 6 scenario tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/scenario.ts tests/scenario.test.ts
git commit -m "feat(scenario): project standings + H2H from outcomes"
```

---

## Task 6: Min/max points ranges (TDD)

**Files:**
- Create: `lib/ranges.ts`
- Test: `tests/ranges.test.ts`

For each team, compute the bounds reachable across all *unset, unlocked* fixtures.

- [ ] **Step 1: Write failing tests**

`tests/ranges.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeRanges } from "@/lib/ranges";
import type { Fixture, OutcomeMap, Team } from "@/types";

function t(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function f(id: number, home: Team, away: Team): Fixture {
  return {
    id, matchday: 37, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-05-19T15:00:00Z",
  };
}

describe("computeRanges", () => {
  const arsenal = t(57, "Arsenal");
  const city = t(65, "Man City");
  const spurs = t(73, "Spurs");
  const wolves = t(76, "Wolves");

  it("two unset fixtures give a span of 0..6 over base points", () => {
    const base = new Map([[57, 80], [65, 82]]);
    const fixtures = [f(1, arsenal, spurs), f(2, city, arsenal)];
    const ranges = computeRanges(base, fixtures, {});
    expect(ranges.get(57)).toEqual({ min: 80, max: 86 });
    expect(ranges.get(65)).toEqual({ min: 82, max: 85 });
  });

  it("locked fixture collapses the range", () => {
    const base = new Map([[57, 80]]);
    const fixtures = [f(1, arsenal, spurs), f(2, city, arsenal)];
    const outcomes: OutcomeMap = {
      1: { kind: "H", locked: true },
      2: { kind: "A", locked: true },
    };
    const ranges = computeRanges(base, fixtures, outcomes);
    expect(ranges.get(57)).toEqual({ min: 86, max: 86 });
  });

  it("unset fixture between teams not in the base map is skipped", () => {
    const base = new Map([[57, 80]]);
    const fixtures = [f(1, city, wolves)];
    const ranges = computeRanges(base, fixtures, {});
    expect(ranges.get(57)).toEqual({ min: 80, max: 80 });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: 3 new failures.

- [ ] **Step 3: Implement `lib/ranges.ts`**

```ts
import type { Fixture, OutcomeMap, TeamId } from "@/types";

export interface PointsRange {
  min: number;
  max: number;
}

export function computeRanges(
  basePoints: Map<TeamId, number>,
  fixtures: Fixture[],
  outcomes: OutcomeMap,
): Map<TeamId, PointsRange> {
  const out = new Map<TeamId, PointsRange>();
  for (const [id, pts] of basePoints) {
    out.set(id, { min: pts, max: pts });
  }

  for (const fix of fixtures) {
    const outcome = outcomes[fix.id];
    const homeRange = out.get(fix.homeTeam.id);
    const awayRange = out.get(fix.awayTeam.id);

    if (outcome?.locked) {
      if (homeRange) {
        const delta = pointsForOutcome(outcome.kind, "home");
        homeRange.min += delta;
        homeRange.max += delta;
      }
      if (awayRange) {
        const delta = pointsForOutcome(outcome.kind, "away");
        awayRange.min += delta;
        awayRange.max += delta;
      }
    } else {
      if (homeRange) homeRange.max += 3;
      if (awayRange) awayRange.max += 3;
    }
  }

  return out;
}

function pointsForOutcome(kind: "H" | "D" | "A", side: "home" | "away"): number {
  if (kind === "D") return 1;
  if (side === "home") return kind === "H" ? 3 : 0;
  return kind === "A" ? 3 : 0;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: all range tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ranges.ts tests/ranges.test.ts
git commit -m "feat(ranges): min/max points per team"
```

---

## Task 7: Decided-state detection (TDD)

**Files:**
- Create: `lib/decided.ts`
- Test: `tests/decided.test.ts`

A team is **already champions** if the upper-bound points of every *other* team is strictly less than this team's lower-bound points. Similar logic for the other badges.

- [ ] **Step 1: Write failing tests**

`tests/decided.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectDecided } from "@/lib/decided";
import type { PointsRange } from "@/lib/ranges";
import type { TeamId } from "@/types";

function ranges(entries: [TeamId, number, number][]): Map<TeamId, PointsRange> {
  return new Map(entries.map(([id, min, max]) => [id, { min, max }]));
}

describe("detectDecided", () => {
  it("flags a team as already champions when their min beats everyone's max", () => {
    const r = ranges([
      [57, 85, 88], // Arsenal: minimum 85
      [65, 80, 84], // City: max 84
      [64, 78, 82], // Liverpool: max 82
    ]);
    const result = detectDecided(r, { relegationCut: 17, top4Cut: 4 });
    expect(result.get(57)?.alreadyChampions).toBe(true);
    expect(result.get(65)?.alreadyChampions).toBe(false);
  });

  it("flags a team as mathematically safe when their min position is above relegation", () => {
    const r = ranges([
      [10, 50, 55], // team A
      [11, 40, 42], // team B
      [12, 35, 38],
      [13, 33, 36],
      [14, 28, 30],
      [15, 25, 27],
      [16, 24, 25],
      [17, 22, 22],
      [18, 20, 21], // relegation zone candidates
      [19, 19, 20],
      [20, 18, 18],
    ]);
    const result = detectDecided(r, { relegationCut: 17, top4Cut: 4 });
    expect(result.get(10)?.mathematicallySafe).toBe(true);
    expect(result.get(20)?.relegated).toBe(true);
  });

  it("flags cannot-finish-top-4 when 4 other teams' min strictly exceeds this team's max", () => {
    const r = ranges([
      [1, 90, 90],
      [2, 88, 88],
      [3, 85, 85],
      [4, 82, 82],
      [5, 70, 75], // can't catch the top 4
    ]);
    const result = detectDecided(r, { relegationCut: 17, top4Cut: 4 });
    expect(result.get(5)?.cannotFinishTop4).toBe(true);
    expect(result.get(4)?.cannotFinishTop4).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: 3 new failures.

- [ ] **Step 3: Implement `lib/decided.ts`**

```ts
import type { TeamId } from "@/types";
import type { PointsRange } from "@/lib/ranges";

export interface DecidedFlags {
  alreadyChampions: boolean;
  cannotFinishTop4: boolean;
  mathematicallySafe: boolean;
  relegated: boolean;
}

export interface DecidedOptions {
  /** Number of teams that finish above the relegation cut, e.g. 17 means positions 1..17 are safe in a 20-team league. */
  relegationCut: number;
  /** Top-N qualification cut; 4 for UCL. */
  top4Cut: number;
}

export function detectDecided(
  ranges: Map<TeamId, PointsRange>,
  opts: DecidedOptions,
): Map<TeamId, DecidedFlags> {
  const ids = [...ranges.keys()];
  const out = new Map<TeamId, DecidedFlags>();

  for (const id of ids) {
    const me = ranges.get(id)!;
    const others = ids.filter((x) => x !== id).map((x) => ranges.get(x)!);

    const alreadyChampions = others.every((o) => o.max < me.min);

    const teamsThatBeatMyMax = others.filter((o) => o.min > me.max).length;
    const cannotFinishTop4 = teamsThatBeatMyMax >= opts.top4Cut;

    // worst-case position: how many can finish strictly above me at minimum?
    const teamsAboveAtWorst = others.filter((o) => o.min > me.max).length;
    const worstPosition = teamsAboveAtWorst + 1;
    const mathematicallySafe = worstPosition <= opts.relegationCut;

    const teamsBelowAtBest = others.filter((o) => o.max < me.min).length;
    const bestPosition = ids.length - teamsBelowAtBest;
    const relegated = bestPosition > opts.relegationCut;

    out.set(id, { alreadyChampions, cannotFinishTop4, mathematicallySafe, relegated });
  }

  return out;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: all decided tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/decided.ts tests/decided.test.ts
git commit -m "feat(decided): mathematically-decided flag detection"
```

---

## Task 8: URL state encoding (TDD)

**Files:**
- Create: `lib/urlState.ts`
- Test: `tests/urlState.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/urlState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { encodeScenario, decodeScenario } from "@/lib/urlState";
import type { Scenario } from "@/types";

describe("urlState", () => {
  it("round-trips an empty scenario", () => {
    const s: Scenario = { cluster: [], outcomes: {} };
    const encoded = encodeScenario(s);
    expect(encoded).toBe("");
    expect(decodeScenario(encoded)).toEqual(s);
  });

  it("encodes cluster as sorted CSV", () => {
    const s: Scenario = { cluster: [65, 57, 73], outcomes: {} };
    expect(encodeScenario(s)).toBe("c=57,65,73");
  });

  it("encodes outcomes as fixId:outcome list", () => {
    const s: Scenario = {
      cluster: [57],
      outcomes: {
        438101: { kind: "H", locked: false },
        438102: { kind: "A", locked: true },
        438103: { kind: "D", locked: false },
      },
    };
    const enc = encodeScenario(s);
    expect(enc).toContain("c=57");
    expect(enc).toContain("o=438101:H,438102:LA,438103:D");
  });

  it("decodes a locked outcome", () => {
    const s = decodeScenario("c=57&o=438101:LH");
    expect(s.cluster).toEqual([57]);
    expect(s.outcomes[438101]).toEqual({ kind: "H", locked: true });
  });

  it("ignores malformed outcome entries", () => {
    const s = decodeScenario("c=57&o=438101:H,bogus,438102:Z");
    expect(s.outcomes[438101]).toEqual({ kind: "H", locked: false });
    expect(s.outcomes[438102]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: 5 new failures.

- [ ] **Step 3: Implement `lib/urlState.ts`**

```ts
import type { Scenario, Outcome, OutcomeKind } from "@/types";

const VALID_KINDS: OutcomeKind[] = ["H", "D", "A"];

export function encodeScenario(s: Scenario): string {
  const parts: string[] = [];
  if (s.cluster.length > 0) {
    parts.push("c=" + [...s.cluster].sort((a, b) => a - b).join(","));
  }
  const ids = Object.keys(s.outcomes).map(Number).sort((a, b) => a - b);
  if (ids.length > 0) {
    const list = ids.map((id) => `${id}:${encodeOutcome(s.outcomes[id])}`).join(",");
    parts.push("o=" + list);
  }
  return parts.join("&");
}

export function decodeScenario(raw: string): Scenario {
  const out: Scenario = { cluster: [], outcomes: {} };
  if (!raw) return out;
  const cleaned = raw.startsWith("#") ? raw.slice(1) : raw;
  for (const segment of cleaned.split("&")) {
    if (segment.startsWith("c=")) {
      out.cluster = segment.slice(2).split(",").map(Number).filter((n) => Number.isFinite(n));
    } else if (segment.startsWith("o=")) {
      for (const entry of segment.slice(2).split(",")) {
        const [idStr, code] = entry.split(":");
        const id = Number(idStr);
        if (!Number.isFinite(id) || !code) continue;
        const outcome = decodeOutcome(code);
        if (outcome) out.outcomes[id] = outcome;
      }
    }
  }
  return out;
}

function encodeOutcome(o: Outcome): string {
  return o.locked ? "L" + o.kind : o.kind;
}

function decodeOutcome(code: string): Outcome | null {
  let locked = false;
  let body = code;
  if (body.startsWith("L")) {
    locked = true;
    body = body.slice(1);
  }
  if (!VALID_KINDS.includes(body as OutcomeKind)) return null;
  return { kind: body as OutcomeKind, locked };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: all urlState tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/urlState.ts tests/urlState.test.ts
git commit -m "feat(urlState): encode/decode scenario to URL hash"
```

---

## Task 9: football-data.org server client

**Files:**
- Create: `lib/footballData.ts`

This runs only on the server. The API key never reaches the browser.

- [ ] **Step 1: Implement the client**

```ts
import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import type { Fixture, Standing, Team } from "@/types";

const BASE = "https://api.football-data.org/v4";
const COMP = "PL";
const REVALIDATE_SECONDS = 600;

const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().nullable(),
  tla: z.string().nullable(),
  crest: z.string().nullable(),
});

const standingsResponseSchema = z.object({
  standings: z.array(
    z.object({
      stage: z.string(),
      type: z.string(),
      table: z.array(
        z.object({
          position: z.number(),
          team: teamSchema,
          playedGames: z.number(),
          won: z.number(),
          draw: z.number(),
          lost: z.number(),
          points: z.number(),
          goalsFor: z.number(),
          goalsAgainst: z.number(),
          goalDifference: z.number(),
        }),
      ),
    }),
  ),
});

const matchSchema = z.object({
  id: z.number(),
  matchday: z.number().nullable(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  status: z.string(),
  utcDate: z.string(),
  score: z.object({
    fullTime: z.object({
      home: z.number().nullable(),
      away: z.number().nullable(),
    }),
  }),
});

const matchesResponseSchema = z.object({
  matches: z.array(matchSchema),
});

function normalizeTeam(t: z.infer<typeof teamSchema>): Team {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? t.name,
    tla: t.tla ?? t.name.slice(0, 3).toUpperCase(),
    crest: t.crest ?? "",
  };
}

async function fetchFromApi(path: string): Promise<unknown> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set. Copy .env.local.example to .env.local and add your key.");
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} returned ${res.status}`);
  }
  return res.json();
}

export const getStandings = unstable_cache(
  async (): Promise<Standing[]> => {
    const raw = await fetchFromApi(`/competitions/${COMP}/standings`);
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
  ["epl-standings"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getFixtures = unstable_cache(
  async (): Promise<Fixture[]> => {
    const raw = await fetchFromApi(`/competitions/${COMP}/matches`);
    const parsed = matchesResponseSchema.parse(raw);
    return parsed.matches
      .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED" || m.status === "FINISHED")
      .map((m) => ({
        id: m.id,
        matchday: m.matchday ?? 0,
        homeTeam: normalizeTeam(m.homeTeam),
        awayTeam: normalizeTeam(m.awayTeam),
        status: m.status === "FINISHED" ? "FINISHED" : "SCHEDULED",
        homeGoals: m.score.fullTime.home,
        awayGoals: m.score.fullTime.away,
        utcDate: m.utcDate,
      }));
  },
  ["epl-fixtures"],
  { revalidate: REVALIDATE_SECONDS },
);
```

- [ ] **Step 2: Install `server-only`**

Run: `npm install server-only`
Expected: package added, lockfile updated.

- [ ] **Step 3: Commit**

```bash
git add lib/footballData.ts package.json package-lock.json
git commit -m "feat(footballData): server client with unstable_cache"
```

---

## Task 10: API routes (passthrough for client refresh)

**Files:**
- Create: `app/api/standings/route.ts`, `app/api/fixtures/route.ts`

These exist so the client can trigger an explicit refresh without re-rendering the server page. Page-level fetch still uses the lib directly.

- [ ] **Step 1: Create `app/api/standings/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getStandings } from "@/lib/footballData";

export async function GET() {
  try {
    const standings = await getStandings();
    return NextResponse.json({ standings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/fixtures/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/footballData";

export async function GET() {
  try {
    const fixtures = await getFixtures();
    return NextResponse.json({ fixtures });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/
git commit -m "feat(api): standings + fixtures routes"
```

---

## Task 11: Root page server fetch + handoff to ScenarioBuilder

**Files:**
- Modify: `app/page.tsx`
- Create: `components/ScenarioBuilder.tsx` (skeleton)

- [ ] **Step 1: Create the ScenarioBuilder skeleton**

`components/ScenarioBuilder.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, Scenario, Standing } from "@/types";
import { decodeScenario, encodeScenario } from "@/lib/urlState";

interface Props {
  standings: Standing[];
  fixtures: Fixture[];
  fetchedAt: string;
}

export default function ScenarioBuilder({ standings, fixtures, fetchedAt }: Props) {
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

  const remainingFixtures = useMemo(
    () => fixtures.filter((f) => f.status === "SCHEDULED"),
    [fixtures],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Premier League — Scenarios</h1>
          <p className="text-xs text-zinc-500">
            Data fetched {new Date(fetchedAt).toLocaleString()} ·
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </p>
        </div>
        <div className="text-sm text-zinc-400">
          {remainingFixtures.length} fixtures remaining
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Cluster
        </h2>
        <p className="text-sm text-zinc-500">ClusterPicker goes here (Task 13).</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Fixtures
        </h2>
        <p className="text-sm text-zinc-500">FixtureGrid goes here (Task 14).</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Projected table
        </h2>
        <p className="text-sm text-zinc-500">LiveTable goes here (Task 15).</p>
      </section>

      <pre className="overflow-auto rounded bg-zinc-900 p-3 text-xs">
        {JSON.stringify(scenario, null, 2)}
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Update `app/page.tsx` to do the server fetch**

```tsx
import ScenarioBuilder from "@/components/ScenarioBuilder";
import { getFixtures, getStandings } from "@/lib/footballData";

export const revalidate = 600;

export default async function Page() {
  let standings, fixtures;
  try {
    [standings, fixtures] = await Promise.all([getStandings(), getFixtures()]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Footy Scenarios — EPL</h1>
        <div className="mt-6 rounded border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
          <p className="font-semibold">Data fetch failed.</p>
          <p className="mt-2">{message}</p>
          <p className="mt-2 text-red-300">
            Make sure <code className="rounded bg-black/40 px-1">FOOTBALL_DATA_API_KEY</code> is set
            in <code className="rounded bg-black/40 px-1">.env.local</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <ScenarioBuilder
        standings={standings}
        fixtures={fixtures}
        fetchedAt={new Date().toISOString()}
      />
    </main>
  );
}
```

- [ ] **Step 3: Smoke-test the build**

Run: `npm run build`
Expected: build succeeds. (Page might fail at request time without an API key, but the build itself should pass because the fetch is dynamic.)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/ScenarioBuilder.tsx
git commit -m "feat(page): server fetch + ScenarioBuilder skeleton"
```

---

## Task 12: Helper — cluster suggestions

**Files:**
- Create: `lib/clusters.ts`
- Test: `tests/clusters.test.ts`

Pure helper used by `ClusterPicker`. Given current standings, suggest title / UCL / UEL+UECL / relegation groups.

- [ ] **Step 1: Write failing tests**

`tests/clusters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { suggestClusters } from "@/lib/clusters";
import type { Standing, Team } from "@/types";

function row(id: number, pts: number, played: number): Standing {
  const team: Team = { id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}`, crest: "" };
  return {
    team, position: 0, playedGames: played,
    won: 0, draw: 0, lost: 0,
    points: pts, goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
  };
}

const TOTAL_MATCHES = 38;

describe("suggestClusters", () => {
  it("title race: leader plus anyone within max-catch-up points", () => {
    const standings = [
      row(1, 80, 36), // leader, 2 games left → max +6
      row(2, 75, 36), // 5 behind, can catch
      row(3, 73, 36), // 7 behind, cannot
    ];
    const clusters = suggestClusters(standings, TOTAL_MATCHES);
    const title = clusters.find((c) => c.kind === "title")!;
    expect(title.teamIds).toEqual([1, 2]);
  });

  it("relegation cluster includes teams within reach of 17th", () => {
    const standings = Array.from({ length: 20 }, (_, i) => row(i + 1, 50 - i, 36));
    const clusters = suggestClusters(standings, TOTAL_MATCHES);
    const reln = clusters.find((c) => c.kind === "relegation")!;
    expect(reln.teamIds.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: 2 new failures.

- [ ] **Step 3: Implement `lib/clusters.ts`**

```ts
import type { Standing, TeamId } from "@/types";

export type ClusterKind = "title" | "ucl" | "uel" | "relegation";

export interface Cluster {
  kind: ClusterKind;
  label: string;
  prizeLabel: string;
  teamIds: TeamId[];
}

const TOP4_CUT = 4;
const UEL_END = 7;
const RELEGATION_CUT = 17;

export function suggestClusters(standings: Standing[], totalMatches: number): Cluster[] {
  const ordered = [...standings].sort((a, b) => b.points - a.points);
  if (ordered.length === 0) return [];

  const maxRemaining = (s: Standing) => (totalMatches - s.playedGames) * 3;
  const leader = ordered[0];

  const title = ordered.filter((s) => s === leader || s.points + maxRemaining(s) >= leader.points);
  const ucl = takeRaceFor(ordered, TOP4_CUT, maxRemaining);
  const uel = takeRaceForBand(ordered, TOP4_CUT + 1, UEL_END, maxRemaining);
  const reln = takeRelegation(ordered, maxRemaining);

  return [
    { kind: "title", label: "Title race", prizeLabel: "1st place — Premier League title", teamIds: title.map((s) => s.team.id) },
    { kind: "ucl", label: "Champions League race", prizeLabel: "Top 4 — UCL qualification", teamIds: ucl.map((s) => s.team.id) },
    { kind: "uel", label: "Europa / Conference race", prizeLabel: "5th–7th — UEL/UECL spots", teamIds: uel.map((s) => s.team.id) },
    { kind: "relegation", label: "Relegation battle", prizeLabel: "17th — final safe position", teamIds: reln.map((s) => s.team.id) },
  ];
}

function takeRaceFor(ordered: Standing[], cut: number, maxRem: (s: Standing) => number): Standing[] {
  const cutTeam = ordered[cut - 1];
  if (!cutTeam) return [...ordered];
  const cutPts = cutTeam.points;
  return ordered.filter((s, idx) => {
    if (idx < cut) return true;
    return s.points + maxRem(s) >= cutPts;
  });
}

function takeRaceForBand(ordered: Standing[], startPos: number, endPos: number, maxRem: (s: Standing) => number): Standing[] {
  const band = ordered.slice(startPos - 1, endPos);
  if (band.length === 0) return [];
  const minPts = Math.min(...band.map((s) => s.points));
  const maxPtsAtBest = Math.max(...band.map((s) => s.points + maxRem(s)));
  return ordered.filter((s) => s.points + maxRem(s) >= minPts && s.points <= maxPtsAtBest);
}

function takeRelegation(ordered: Standing[], maxRem: (s: Standing) => number): Standing[] {
  const safeTeam = ordered[RELEGATION_CUT - 1];
  if (!safeTeam) return ordered.slice(-3);
  const safeCeiling = safeTeam.points + maxRem(safeTeam);
  return ordered.filter((s, idx) => {
    if (idx >= RELEGATION_CUT - 1) return true; // 17th onwards
    return s.points + maxRem(s) <= safeCeiling; // can still be caught from above
  });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: cluster tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/clusters.ts tests/clusters.test.ts
git commit -m "feat(clusters): auto-suggest title/UCL/UEL/relegation groups"
```

---

## Task 13: ClusterPicker component

**Files:**
- Create: `components/ClusterPicker.tsx`
- Modify: `components/ScenarioBuilder.tsx`

- [ ] **Step 1: Create `components/ClusterPicker.tsx`**

```tsx
"use client";

import type { Standing, TeamId } from "@/types";
import { suggestClusters, type Cluster } from "@/lib/clusters";
import { useMemo } from "react";
import Image from "next/image";

interface Props {
  standings: Standing[];
  cluster: TeamId[];
  onChange: (cluster: TeamId[]) => void;
}

export default function ClusterPicker({ standings, cluster, onChange }: Props) {
  const suggestions = useMemo(() => suggestClusters(standings, 38), [standings]);
  const clusterSet = new Set(cluster);

  function applySuggestion(s: Cluster) {
    onChange([...s.teamIds]);
  }

  function toggleTeam(id: TeamId) {
    if (clusterSet.has(id)) {
      onChange(cluster.filter((t) => t !== id));
    } else {
      onChange([...cluster, id]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.kind}
            type="button"
            onClick={() => applySuggestion(s)}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
            title={s.prizeLabel}
          >
            {s.label} ({s.teamIds.length})
          </button>
        ))}
        {cluster.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {standings.map((s) => {
          const active = clusterSet.has(s.team.id);
          return (
            <button
              key={s.team.id}
              type="button"
              onClick={() => toggleTeam(s.team.id)}
              className={
                "flex items-center gap-2 rounded border px-2 py-1 text-left text-sm " +
                (active
                  ? "border-emerald-500 bg-emerald-950/30 text-emerald-100"
                  : "border-zinc-800 text-zinc-300 hover:border-zinc-600")
              }
            >
              {s.team.crest && (
                <Image src={s.team.crest} alt="" width={20} height={20} unoptimized />
              )}
              <span className="truncate">{s.team.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `components/ScenarioBuilder.tsx`**

Replace the placeholder "Cluster" section in `components/ScenarioBuilder.tsx`. Find:

```tsx
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Cluster
        </h2>
        <p className="text-sm text-zinc-500">ClusterPicker goes here (Task 13).</p>
      </section>
```

Replace with:

```tsx
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Cluster
        </h2>
        <ClusterPicker
          standings={standings}
          cluster={scenario.cluster}
          onChange={(cluster) => updateScenario({ ...scenario, cluster })}
        />
      </section>
```

And add the import at the top of the file:

```tsx
import ClusterPicker from "@/components/ClusterPicker";
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 4: Commit**

```bash
git add components/ClusterPicker.tsx components/ScenarioBuilder.tsx
git commit -m "feat(cluster): ClusterPicker with auto-suggestions and crests"
```

---

## Task 14: FixtureGrid + FixtureRow

**Files:**
- Create: `components/FixtureGrid.tsx`, `components/FixtureRow.tsx`
- Modify: `components/ScenarioBuilder.tsx`

- [ ] **Step 1: Create `components/FixtureRow.tsx`**

```tsx
"use client";

import Image from "next/image";
import type { Fixture, Outcome, OutcomeKind } from "@/types";

interface Props {
  fixture: Fixture;
  outcome: Outcome | undefined;
  intraCluster: boolean;
  onSet: (kind: OutcomeKind) => void;
  onToggleLock: () => void;
}

const KINDS: { kind: OutcomeKind; label: string }[] = [
  { kind: "H", label: "Home" },
  { kind: "D", label: "Draw" },
  { kind: "A", label: "Away" },
];

export default function FixtureRow({ fixture, outcome, intraCluster, onSet, onToggleLock }: Props) {
  const locked = outcome?.locked ?? false;

  return (
    <div className={
      "flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:gap-4 " +
      (intraCluster ? "border-amber-700/60 bg-amber-950/10" : "border-zinc-800")
    }>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <TeamCell team={fixture.homeTeam} align="left" />
        <span className="text-zinc-500">vs</span>
        <TeamCell team={fixture.awayTeam} align="right" />
      </div>
      <div className="flex items-center gap-1">
        {KINDS.map(({ kind, label }) => {
          const active = outcome?.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              disabled={locked && !active}
              onClick={() => onSet(kind)}
              className={
                "min-w-[56px] rounded px-3 py-2 text-xs font-medium " +
                (active
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700") +
                (locked && !active ? " opacity-30" : "")
              }
              title={label}
            >
              {kind}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onToggleLock}
          aria-label={locked ? "Unlock fixture" : "Lock fixture"}
          className={
            "ml-1 rounded px-2 py-2 text-xs " +
            (locked ? "bg-amber-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")
          }
          title={locked ? "Locked" : "Lock"}
        >
          {locked ? "🔒" : "🔓"}
        </button>
      </div>
    </div>
  );
}

function TeamCell({ team, align }: { team: Fixture["homeTeam"]; align: "left" | "right" }) {
  return (
    <div className={"flex flex-1 items-center gap-2 min-w-0 " + (align === "right" ? "justify-end" : "")}>
      {align === "left" && team.crest && (
        <Image src={team.crest} alt="" width={20} height={20} unoptimized />
      )}
      <span className="truncate text-sm">{team.shortName}</span>
      {align === "right" && team.crest && (
        <Image src={team.crest} alt="" width={20} height={20} unoptimized />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/FixtureGrid.tsx`**

```tsx
"use client";

import type { Fixture, OutcomeKind, OutcomeMap, Standing, TeamId } from "@/types";
import FixtureRow from "@/components/FixtureRow";

interface Props {
  fixtures: Fixture[];
  cluster: TeamId[];
  outcomes: OutcomeMap;
  standings: Standing[];
  onChange: (outcomes: OutcomeMap) => void;
}

export default function FixtureGrid({ fixtures, cluster, outcomes, standings, onChange }: Props) {
  const teamName = (id: TeamId) => standings.find((s) => s.team.id === id)?.team.shortName ?? `Team #${id}`;
  const clusterSet = new Set(cluster);
  const relevant = fixtures.filter(
    (f) => clusterSet.has(f.homeTeam.id) || clusterSet.has(f.awayTeam.id),
  );

  if (cluster.length === 0) {
    return <p className="text-sm text-zinc-500">Pick a cluster above to see fixtures.</p>;
  }

  if (relevant.length === 0) {
    return <p className="text-sm text-zinc-500">No remaining fixtures for this cluster.</p>;
  }

  const byMatchday = new Map<number, Fixture[]>();
  for (const fix of relevant) {
    const list = byMatchday.get(fix.matchday) ?? [];
    list.push(fix);
    byMatchday.set(fix.matchday, list);
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  function setOutcome(id: number, kind: OutcomeKind) {
    const prev = outcomes[id];
    const next: OutcomeMap = {
      ...outcomes,
      [id]: { kind, locked: prev?.locked ?? false },
    };
    onChange(next);
  }

  function toggleLock(id: number) {
    const prev = outcomes[id];
    if (!prev) return;
    const next: OutcomeMap = { ...outcomes, [id]: { ...prev, locked: !prev.locked } };
    onChange(next);
  }

  function setRun(teamId: TeamId, kind: OutcomeKind) {
    const next: OutcomeMap = { ...outcomes };
    for (const fix of relevant) {
      const isHome = fix.homeTeam.id === teamId;
      const isAway = fix.awayTeam.id === teamId;
      if (!isHome && !isAway) continue;
      const code: OutcomeKind = kind === "D" ? "D" : isHome ? kind : (kind === "H" ? "A" : "H");
      const prev = next[fix.id];
      if (prev?.locked) continue;
      next[fix.id] = { kind: code, locked: false };
    }
    onChange(next);
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {cluster.map((id) => (
          <div key={id} className="flex items-center gap-2 rounded border border-zinc-800 px-2 py-1">
            <span className="font-medium text-zinc-200">{teamName(id)}</span>
            <button type="button" className="text-emerald-400 hover:underline" onClick={() => setRun(id, "H")}>Wins out</button>
            <button type="button" className="text-zinc-400 hover:underline" onClick={() => setRun(id, "D")}>Draws out</button>
            <button type="button" className="text-rose-400 hover:underline" onClick={() => setRun(id, "A")}>Loses out</button>
          </div>
        ))}
        {Object.keys(outcomes).length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto rounded border border-zinc-800 px-3 py-1 text-zinc-400 hover:border-rose-500 hover:text-rose-300"
          >
            Clear all picks
          </button>
        )}
      </div>

      {matchdays.map((md) => (
        <div key={md}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Matchweek {md}
          </h3>
          <div className="space-y-2">
            {byMatchday.get(md)!.map((fix) => {
              const intra = clusterSet.has(fix.homeTeam.id) && clusterSet.has(fix.awayTeam.id);
              return (
                <FixtureRow
                  key={fix.id}
                  fixture={fix}
                  outcome={outcomes[fix.id]}
                  intraCluster={intra}
                  onSet={(kind) => setOutcome(fix.id, kind)}
                  onToggleLock={() => toggleLock(fix.id)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `components/ScenarioBuilder.tsx`**

Add import at the top:

```tsx
import FixtureGrid from "@/components/FixtureGrid";
```

Replace the "Fixtures" placeholder section with:

```tsx
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Fixtures
        </h2>
        <FixtureGrid
          fixtures={remainingFixtures}
          cluster={scenario.cluster}
          outcomes={scenario.outcomes}
          standings={standings}
          onChange={(outcomes) => updateScenario({ ...scenario, outcomes })}
        />
      </section>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/FixtureGrid.tsx components/FixtureRow.tsx components/ScenarioBuilder.tsx
git commit -m "feat(fixtures): FixtureGrid + FixtureRow with lock and team-run buttons"
```

---

## Task 15: LiveTable with color bands

**Files:**
- Create: `components/LiveTable.tsx`
- Modify: `components/ScenarioBuilder.tsx`

- [ ] **Step 1: Create `components/LiveTable.tsx`**

```tsx
"use client";

import Image from "next/image";
import type { Fixture, OutcomeMap, Standing, TeamId } from "@/types";
import { projectStandings } from "@/lib/scenario";
import { sortByEPL } from "@/lib/tiebreakers";
import { computeRanges } from "@/lib/ranges";
import { detectDecided, type DecidedFlags } from "@/lib/decided";
import { useMemo } from "react";

interface Props {
  base: Standing[];
  fixtures: Fixture[];
  outcomes: OutcomeMap;
  cluster: TeamId[];
}

const BAND_CLASSES: Array<{ test: (pos: number) => boolean; cls: string }> = [
  { test: (p) => p <= 4, cls: "border-l-emerald-500" },
  { test: (p) => p <= 6, cls: "border-l-sky-500" },
  { test: (p) => p === 7, cls: "border-l-teal-500" },
  { test: (p) => p >= 18, cls: "border-l-rose-600" },
  { test: () => true, cls: "border-l-transparent" },
];

function bandFor(pos: number): string {
  return BAND_CLASSES.find((b) => b.test(pos))!.cls;
}

export default function LiveTable({ base, fixtures, outcomes, cluster }: Props) {
  const clusterSet = useMemo(() => new Set(cluster), [cluster]);

  const projected = useMemo(() => projectStandings(base, fixtures, outcomes), [base, fixtures, outcomes]);

  const sorted = useMemo(() => sortByEPL(projected.standings, projected.h2h), [projected]);

  const ranges = useMemo(() => {
    const map = new Map<TeamId, number>();
    for (const s of projected.standings) map.set(s.team.id, s.points);
    return computeRanges(map, fixtures.filter((f) => f.status === "SCHEDULED"), outcomes);
  }, [projected.standings, fixtures, outcomes]);

  const decided = useMemo(() => detectDecided(ranges, { relegationCut: 17, top4Cut: 4 }), [ranges]);

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-400">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Team</th>
            <th className="px-2 py-2 text-right">P</th>
            <th className="px-2 py-2 text-right">W</th>
            <th className="px-2 py-2 text-right">D</th>
            <th className="px-2 py-2 text-right">L</th>
            <th className="px-2 py-2 text-right">GF</th>
            <th className="px-2 py-2 text-right">GA</th>
            <th className="px-2 py-2 text-right">GD</th>
            <th className="px-2 py-2 text-right">Pts</th>
            <th className="px-2 py-2 text-right">Range</th>
          </tr>
        </thead>
        <tbody>
          {sorted.sorted.map((row, i) => {
            const pos = i + 1;
            const inCluster = clusterSet.has(row.team.id);
            const range = ranges.get(row.team.id);
            const flags = decided.get(row.team.id);
            return (
              <tr
                key={row.team.id}
                className={
                  "border-t border-l-4 border-zinc-900 " +
                  bandFor(pos) +
                  (inCluster ? " bg-zinc-900/60" : "")
                }
              >
                <td className="px-2 py-2 text-zinc-400">{pos}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {row.team.crest && (
                      <Image src={row.team.crest} alt="" width={18} height={18} unoptimized />
                    )}
                    <span className="truncate">{row.team.shortName}</span>
                    <DecidedBadges flags={flags} />
                  </div>
                </td>
                <td className="px-2 py-2 text-right">{row.playedGames}</td>
                <td className="px-2 py-2 text-right">{row.won}</td>
                <td className="px-2 py-2 text-right">{row.draw}</td>
                <td className="px-2 py-2 text-right">{row.lost}</td>
                <td className="px-2 py-2 text-right">{row.goalsFor}</td>
                <td className="px-2 py-2 text-right">{row.goalsAgainst}</td>
                <td className="px-2 py-2 text-right">{row.goalDifference}</td>
                <td className="px-2 py-2 text-right font-semibold">{row.points}</td>
                <td className="px-2 py-2 text-right text-xs text-zinc-500">
                  {range && range.min !== range.max ? `${range.min}–${range.max}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.playoffsFlagged.size > 0 && (
        <div className="border-t border-amber-700/40 bg-amber-950/20 p-2 text-xs text-amber-200">
          Playoff required to break a tie: {[...sorted.playoffsFlagged].join(", ")}
        </div>
      )}
    </div>
  );
}

function DecidedBadges({ flags }: { flags: DecidedFlags | undefined }) {
  if (!flags) return null;
  const badges: string[] = [];
  if (flags.alreadyChampions) badges.push("Champions");
  if (flags.relegated) badges.push("Relegated");
  if (flags.mathematicallySafe && !flags.alreadyChampions) badges.push("Safe");
  if (flags.cannotFinishTop4 && !flags.alreadyChampions && !flags.relegated) badges.push("No top 4");
  if (badges.length === 0) return null;
  return (
    <span className="ml-1 flex gap-1">
      {badges.map((b) => (
        <span key={b} className="rounded-full bg-zinc-700 px-2 text-[10px] uppercase tracking-wider text-zinc-200">
          {b}
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Wire it into `components/ScenarioBuilder.tsx`**

Add import:

```tsx
import LiveTable from "@/components/LiveTable";
```

Replace the "Projected table" placeholder section with:

```tsx
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Projected table
        </h2>
        <LiveTable
          base={standings}
          fixtures={fixtures}
          outcomes={scenario.outcomes}
          cluster={scenario.cluster}
        />
      </section>
```

Also remove the JSON debug `<pre>` at the bottom of the file.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/LiveTable.tsx components/ScenarioBuilder.tsx
git commit -m "feat(live-table): projected standings with color bands and decided badges"
```

---

## Task 16: ShareBar (copy link + save scenarios)

**Files:**
- Create: `components/ShareBar.tsx`, `components/SavedScenarios.tsx`
- Modify: `components/ScenarioBuilder.tsx`

- [ ] **Step 1: Create `components/ShareBar.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Scenario } from "@/types";
import { encodeScenario } from "@/lib/urlState";

interface Props {
  scenario: Scenario;
  onSave: (name: string) => void;
}

export default function ShareBar({ scenario, onSave }: Props) {
  const [copied, setCopied] = useState(false);
  const [saveName, setSaveName] = useState("");

  async function copyLink() {
    const encoded = encodeScenario(scenario);
    const url = encoded ? `${window.location.origin}${window.location.pathname}#${encoded}` : window.location.origin + window.location.pathname;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSave() {
    if (!saveName.trim()) return;
    onSave(saveName.trim());
    setSaveName("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-zinc-800 p-3">
      <button
        type="button"
        onClick={copyLink}
        className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500"
      >
        {copied ? "Copied!" : "Copy share link"}
      </button>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Name this scenario"
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500"
        />
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-zinc-700 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-600"
        >
          Save
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/SavedScenarios.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export interface SavedScenario {
  name: string;
  hash: string;
  savedAt: string;
}

const STORAGE_KEY = "footy-scenarios:saved";

export function loadSaved(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSaved(items: SavedScenario[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface Props {
  refreshKey: number;
}

export default function SavedScenarios({ refreshKey }: Props) {
  const [items, setItems] = useState<SavedScenario[]>([]);

  useEffect(() => {
    setItems(loadSaved());
  }, [refreshKey]);

  function open(hash: string) {
    window.location.hash = hash;
  }

  function remove(name: string) {
    const next = items.filter((i) => i.name !== name);
    persistSaved(next);
    setItems(next);
  }

  if (items.length === 0) {
    return <p className="text-xs text-zinc-500">No saved scenarios yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {items.map((s) => (
        <li key={s.name} className="flex items-center justify-between rounded border border-zinc-800 px-2 py-1 text-sm">
          <button
            type="button"
            onClick={() => open(s.hash)}
            className="flex-1 text-left text-zinc-200 hover:text-emerald-300"
          >
            {s.name}
            <span className="ml-2 text-xs text-zinc-500">{new Date(s.savedAt).toLocaleDateString()}</span>
          </button>
          <button
            type="button"
            onClick={() => remove(s.name)}
            className="rounded text-xs text-zinc-500 hover:text-rose-400"
            aria-label={`Delete ${s.name}`}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Wire ShareBar and SavedScenarios into ScenarioBuilder**

In `components/ScenarioBuilder.tsx`, add imports at the top:

```tsx
import ShareBar from "@/components/ShareBar";
import SavedScenarios, { loadSaved, persistSaved } from "@/components/SavedScenarios";
```

Add a state for the saved-list refresh:

```tsx
  const [savedRefresh, setSavedRefresh] = useState(0);
```

Add a handler for saving:

```tsx
  function handleSave(name: string) {
    const items = loadSaved();
    const hash = encodeScenario(scenario);
    const next = [{ name, hash, savedAt: new Date().toISOString() }, ...items.filter((i) => i.name !== name)].slice(0, 20);
    persistSaved(next);
    setSavedRefresh((r) => r + 1);
  }
```

Add new sections at the bottom of the returned JSX (after the LiveTable section):

```tsx
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Share</h2>
        <ShareBar scenario={scenario} onSave={handleSave} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Saved scenarios</h2>
        <SavedScenarios refreshKey={savedRefresh} />
      </section>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/ShareBar.tsx components/SavedScenarios.tsx components/ScenarioBuilder.tsx
git commit -m "feat(share): copy-link and locally-saved scenarios"
```

---

## Task 17: Manual smoke test

**Files:** none.

- [ ] **Step 1: Add your API key**

If you don't have one yet, sign up at https://www.football-data.org/client/register. Then:

```bash
cp .env.local.example .env.local
# edit .env.local and paste the key
```

- [ ] **Step 2: Run the dev server**

Run: `npm run dev`
Open: http://localhost:3000

- [ ] **Step 3: Walk the smoke checklist**

Verify each:
- The page loads showing real Premier League standings with team crests.
- Clicking a suggested cluster (e.g., "Title race") fills the cluster row and shows the relevant fixtures grouped by matchweek.
- Each fixture has H / D / A buttons; clicking them updates the projected table immediately.
- The projected table shows correct color-coded bands (top 4 green, 5–6 sky, 7 teal, 18+ rose).
- Locking a fixture (padlock button) makes the H/D/A buttons disabled except for the currently selected outcome.
- Min–max range displays when some fixtures are unset.
- Copying the share link puts a URL on your clipboard with the scenario in the hash.
- Pasting that URL into a new tab reproduces the same cluster and outcomes.
- Saving a scenario adds it to the Saved Scenarios list; clicking it re-applies the hash.

If anything fails, fix it before moving on. No commit needed unless code changed.

---

## Task 18: Final verification and tidy

**Files:** none (verification only).

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: every test passes. There should be at least 5 test files: tiebreakers, scenario, ranges, decided, urlState, plus clusters and sanity.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build completes with no errors. Note any warnings; if any reference unused imports or missing keys, fix them before declaring done.

- [ ] **Step 3: Confirm `.env.local` is not committed**

Run: `git status`
Expected: `.env.local` does not appear (it's in `.gitignore`).

- [ ] **Step 4: Final commit (if anything changed)**

If lint/build fixes were needed, commit them:

```bash
git add -A
git commit -m "chore: polish before merge"
```

---

## Done

After Task 18 the prototype runs locally and on Vercel. Future enhancements (other leagues, server-stored share IDs via Vercel KV, PNG export, scoreline overrides) are tracked in the spec's §9 "Out of scope" list.
