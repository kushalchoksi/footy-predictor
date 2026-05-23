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

export interface SimulateOptions {
  /** Restrict simulation to fixtures involving any of these team ids. Empty/undefined → all teams. */
  teamScope?: TeamId[];
  /** Replace existing unlocked picks too (default true). Locked outcomes are always preserved. */
  overwriteUnlocked?: boolean;
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

    const homeAttack = home.goalsFor / Math.max(home.playedGames, 1);
    const awayDefense = away.goalsAgainst / Math.max(away.playedGames, 1);
    const awayAttack = away.goalsFor / Math.max(away.playedGames, 1);
    const homeDefense = home.goalsAgainst / Math.max(home.playedGames, 1);

    const lambdaH = clamp((homeAttack * awayDefense / leagueAvg) * HOME_ADV, MIN_RATE, MAX_RATE);
    const lambdaA = clamp((awayAttack * homeDefense / leagueAvg) * AWAY_ADV, MIN_RATE, MAX_RATE);

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
