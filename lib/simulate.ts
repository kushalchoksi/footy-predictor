import type { Fixture, OutcomeMap, Standing, TeamId } from "@/types";
import { defaultRng, type RNG } from "@/lib/rng";

const HOME_ADV = 1.15;
const AWAY_ADV = 0.95;
const FALLBACK_LEAGUE_AVG = 1.4;
const MAX_GOALS = 9;
const MIN_RATE = 0.1;
const MAX_RATE = 5.0;

function poissonSample(lambda: number, rng: RNG): number {
  // Knuth: O(λ). Fine for the small λs we expect here.
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * "market" — strength-aware: each team's scoring rate is driven by its own
 * attack/defence form (the realistic model; our offline stand-in for betting odds).
 * "random" — strength-blind: both sides get the league-average rate, so results
 * are pure chance with no favourite bias.
 */
export type SimStrategy = "market" | "random";

export interface SimulateOptions {
  /** Restrict simulation to fixtures involving any of these team ids. Empty/undefined → all teams. */
  teamScope?: TeamId[];
  /** Replace existing unlocked picks too (default true). Locked outcomes are always preserved. */
  overwriteUnlocked?: boolean;
  /** Scoring model (default "market"). */
  strategy?: SimStrategy;
  rng?: RNG;
}

export function simulate(
  base: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
  opts: SimulateOptions = {},
): OutcomeMap {
  const rng = opts.rng ?? defaultRng;
  const overwrite = opts.overwriteUnlocked ?? true;
  const strategy = opts.strategy ?? "market";
  const scope = opts.teamScope && opts.teamScope.length > 0 ? new Set(opts.teamScope) : null;

  // League-wide attack baseline.
  let totalGoals = 0;
  let totalGames = 0;
  const byId = new Map<TeamId, Standing>();
  for (const s of base) {
    byId.set(s.team.id, s);
    totalGoals += s.goalsFor;
    totalGames += s.playedGames;
  }
  const leagueAvg = totalGames > 0 ? totalGoals / totalGames : FALLBACK_LEAGUE_AVG;

  const next: OutcomeMap = { ...outcomes };

  for (const fix of fixtures) {
    if (fix.status !== "SCHEDULED") continue;
    if (scope && !scope.has(fix.homeTeam.id) && !scope.has(fix.awayTeam.id)) continue;
    const prev = next[fix.id];
    if (prev?.locked) continue;
    if (prev && !overwrite) continue;

    const home = byId.get(fix.homeTeam.id);
    const away = byId.get(fix.awayTeam.id);
    if (!home || !away) continue;

    // Per-team rates fall back to the league average when a side has no games yet
    // (tournaments before kickoff) so "market" still produces realistic scorelines
    // instead of collapsing to 0-0.
    const rate = (s: Standing, key: "goalsFor" | "goalsAgainst") =>
      s.playedGames > 0 ? s[key] / s.playedGames : leagueAvg;

    let lambdaH: number;
    let lambdaA: number;
    if (strategy === "random") {
      // Strength-blind: every match is an even, league-average contest.
      lambdaH = clamp(leagueAvg, MIN_RATE, MAX_RATE);
      lambdaA = clamp(leagueAvg, MIN_RATE, MAX_RATE);
    } else {
      const homeAttack = rate(home, "goalsFor");
      const awayDefense = rate(away, "goalsAgainst");
      const awayAttack = rate(away, "goalsFor");
      const homeDefense = rate(home, "goalsAgainst");
      lambdaH = clamp((homeAttack * awayDefense / leagueAvg) * HOME_ADV, MIN_RATE, MAX_RATE);
      lambdaA = clamp((awayAttack * homeDefense / leagueAvg) * AWAY_ADV, MIN_RATE, MAX_RATE);
    }

    const hg = Math.min(MAX_GOALS, poissonSample(lambdaH, rng));
    const ag = Math.min(MAX_GOALS, poissonSample(lambdaA, rng));

    next[fix.id] = {
      kind: hg > ag ? "H" : hg < ag ? "A" : "D",
      locked: false,
      homeScore: hg,
      awayScore: ag,
    };
  }

  return next;
}
