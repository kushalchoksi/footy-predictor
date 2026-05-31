import type { Standing, TeamId } from "@/types";

export interface PlausibleBand {
  /** Realistic lowest final points total. */
  min: number;
  /** Realistic highest final points total. */
  max: number;
  /** Straight-line projection at the current points-per-game rate. */
  expected: number;
}

// Tuning knobs for "what could realistically happen from here".
//
// Each team is projected forward at its current points-per-game rate, with an
// uncertainty band that grows with the SQUARE ROOT of games remaining (not
// linearly), so projections tighten as the season progresses. This is what keeps
// a title-race cluster to the handful of nearby teams instead of the whole table:
// teams whose plausible point ranges can't overlap aren't competitors.
const STD_PER_GAME = 1.3; // rough standard deviation of points won in one match (0/1/3)
const Z = 1.5; // width of the plausible interval (~87%); raise for a looser cluster

function leagueAveragePpg(standings: Standing[]): number {
  let points = 0;
  let played = 0;
  for (const s of standings) {
    points += s.points;
    played += s.playedGames;
  }
  return played > 0 ? points / played : 1.4;
}

/**
 * Project each team's plausible final points range from its current rate. The band
 * is clamped to [current points, current points + 3·remaining] so it never claims
 * something impossible, but within those limits it reflects what's *likely*, not
 * merely possible.
 */
export function plausibleBands(standings: Standing[], totalMatches: number): Map<TeamId, PlausibleBand> {
  const avgPpg = leagueAveragePpg(standings);
  const out = new Map<TeamId, PlausibleBand>();
  for (const s of standings) {
    const remaining = Math.max(0, totalMatches - s.playedGames);
    const ppg = s.playedGames > 0 ? s.points / s.playedGames : avgPpg;
    const expected = s.points + ppg * remaining;
    const spread = Z * STD_PER_GAME * Math.sqrt(remaining);
    const ceiling = s.points + 3 * remaining;
    const min = Math.max(s.points, Math.min(expected - spread, ceiling));
    const max = Math.min(ceiling, expected + spread);
    out.set(s.team.id, { min, max, expected });
  }
  return out;
}

/**
 * For each team, the set of other teams that could plausibly finish around it —
 * i.e. whose projected points bands overlap. Used to pick a realistic race cluster
 * (title / European / relegation) when a row is selected, rather than every team
 * that is still mathematically in contention.
 */
export function plausibleCompetitors(standings: Standing[], totalMatches: number): Map<TeamId, Set<TeamId>> {
  const bands = plausibleBands(standings, totalMatches);
  const ids = standings.map((s) => s.team.id);
  const out = new Map<TeamId, Set<TeamId>>();
  for (const x of ids) {
    const X = bands.get(x)!;
    const competitors = new Set<TeamId>();
    for (const y of ids) {
      if (y === x) continue;
      const Y = bands.get(y)!;
      if (X.min <= Y.max && Y.min <= X.max) competitors.add(y);
    }
    out.set(x, competitors);
  }
  return out;
}

/** Total matches each team plays in a double round-robin of `teamCount` teams. */
export function doubleRoundRobinMatches(teamCount: number): number {
  return Math.max(0, 2 * (teamCount - 1));
}
