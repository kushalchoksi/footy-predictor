import type { Fixture, H2HEntry, H2HMap, OutcomeMap, Standing, TeamId } from "@/types";
import { pairKey } from "@/types";

export interface PositionBound {
  best: number;
  worst: number;
}

export interface PositionInfo {
  bounds: Map<TeamId, PositionBound>;
  /** For each team, the set of other teams whose relative rank is undetermined. */
  competitorsOf: Map<TeamId, Set<TeamId>>;
}

interface Boundary {
  maxPts: number;
  minPts: number;
  maxGd: number;
  minGd: number;
  maxGf: number;
  minGf: number;
}

/**
 * Compute, for each team, the best and worst possible final position and the
 * set of teams whose pairwise rank with this team is undetermined.
 *
 * A team Y is treated as "definitely below" X when, in the worst scenario for
 * X (X loses all remaining unset matches) versus the best for Y (Y wins all),
 * X still finishes above or ties with X winning on tiebreakers. The check
 * walks the full EPL chain — Points → GD → GF → H2H — where the H2H step
 * uses completed-season fixtures plus the implied result of any remaining
 * X-vs-Y meeting in the boundary scenario (Y winning all means Y beats X).
 *
 * Two teams are competitors iff neither is definitely above or below the
 * other — i.e. their relative rank could swap in some outcome assignment.
 */
export function computePositionInfo(
  base: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
): PositionInfo {
  const boundaries = computeBoundaries(base, fixtures, outcomes);
  const completedH2H = computeCompletedH2H(fixtures);
  const remainingMeetings = countRemainingMeetings(fixtures, outcomes);
  const ids = base.map((s) => s.team.id);
  const n = ids.length;

  // Pairwise "Y is definitely below X" matrix.
  const belowMatrix = new Map<TeamId, Map<TeamId, boolean>>();
  for (const xId of ids) {
    const X = boundaries.get(xId)!;
    const row = new Map<TeamId, boolean>();
    for (const yId of ids) {
      if (yId === xId) continue;
      const Y = boundaries.get(yId)!;
      row.set(yId, definitelyBelow(xId, X, yId, Y, completedH2H, remainingMeetings));
    }
    belowMatrix.set(xId, row);
  }

  const bounds = new Map<TeamId, PositionBound>();
  const competitorsOf = new Map<TeamId, Set<TeamId>>();
  for (const xId of ids) {
    let above = 0;
    let below = 0;
    const competitors = new Set<TeamId>();
    for (const yId of ids) {
      if (yId === xId) continue;
      const yBelowX = belowMatrix.get(xId)!.get(yId) === true;
      const xBelowY = belowMatrix.get(yId)!.get(xId) === true;
      if (yBelowX) {
        below++;
      } else if (xBelowY) {
        above++;
      } else {
        competitors.add(yId);
      }
    }
    bounds.set(xId, { best: above + 1, worst: n - below });
    competitorsOf.set(xId, competitors);
  }

  return { bounds, competitorsOf };
}

/** Convenience wrapper for callers that only want bounds. */
export function computePositionBounds(
  base: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
): Map<TeamId, PositionBound> {
  return computePositionInfo(base, fixtures, outcomes).bounds;
}

function computeBoundaries(
  base: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
): Map<TeamId, Boundary> {
  const out = new Map<TeamId, Boundary>();
  for (const s of base) {
    out.set(s.team.id, {
      maxPts: s.points,
      minPts: s.points,
      maxGd: s.goalDifference,
      minGd: s.goalDifference,
      maxGf: s.goalsFor,
      minGf: s.goalsFor,
    });
  }

  for (const fix of fixtures) {
    if (fix.status !== "SCHEDULED") continue;
    const outcome = outcomes[fix.id];
    const home = out.get(fix.homeTeam.id);
    const away = out.get(fix.awayTeam.id);

    if (outcome?.locked) {
      // When the locked outcome has an explicit scoreline, use actual GD/GF deltas.
      const hs = outcome.homeScore;
      const as_ = outcome.awayScore;
      const hasScore = hs !== undefined && as_ !== undefined;

      if (outcome.kind === "H") {
        if (home) {
          home.maxPts += 3; home.minPts += 3;
          const gdDelta = hasScore ? hs! - as_! : 1;
          const gfDelta = hasScore ? hs! : 1;
          home.maxGd += gdDelta; home.minGd += gdDelta;
          home.maxGf += gfDelta; home.minGf += gfDelta;
        }
        if (away) {
          const gdDelta = hasScore ? as_! - hs! : -1;
          away.maxGd += gdDelta; away.minGd += gdDelta;
          if (hasScore) { away.maxGf += as_!; away.minGf += as_!; }
        }
      } else if (outcome.kind === "A") {
        if (away) {
          away.maxPts += 3; away.minPts += 3;
          const gdDelta = hasScore ? as_! - hs! : 1;
          const gfDelta = hasScore ? as_! : 1;
          away.maxGd += gdDelta; away.minGd += gdDelta;
          away.maxGf += gfDelta; away.minGf += gfDelta;
        }
        if (home) {
          const gdDelta = hasScore ? hs! - as_! : -1;
          home.maxGd += gdDelta; home.minGd += gdDelta;
          if (hasScore) { home.maxGf += hs!; home.minGf += hs!; }
        }
      } else {
        if (home) {
          home.maxPts += 1; home.minPts += 1;
          if (hasScore) { home.maxGf += hs!; home.minGf += hs!; home.maxGd += hs! - as_!; home.minGd += hs! - as_!; }
        }
        if (away) {
          away.maxPts += 1; away.minPts += 1;
          if (hasScore) { away.maxGf += as_!; away.minGf += as_!; away.maxGd += as_! - hs!; away.minGd += as_! - hs!; }
        }
      }
    } else {
      if (home) {
        home.maxPts += 3;
        home.maxGd += 1;
        home.maxGf += 1;
        home.minGd -= 1;
      }
      if (away) {
        away.maxPts += 3;
        away.maxGd += 1;
        away.maxGf += 1;
        away.minGd -= 1;
      }
    }
  }

  return out;
}

function computeCompletedH2H(fixtures: Fixture[]): H2HMap {
  const h2h: H2HMap = {};
  for (const fix of fixtures) {
    if (fix.status !== "FINISHED") continue;
    if (fix.homeGoals === null || fix.awayGoals === null) continue;
    const key = pairKey(fix.homeTeam.id, fix.awayTeam.id);
    const lowIsHome = fix.homeTeam.id < fix.awayTeam.id;
    const prev: H2HEntry = h2h[key] ?? { lowPts: 0, highPts: 0, lowGoals: 0, highGoals: 0 };

    if (fix.homeGoals > fix.awayGoals) {
      if (lowIsHome) prev.lowPts += 3; else prev.highPts += 3;
    } else if (fix.homeGoals < fix.awayGoals) {
      if (lowIsHome) prev.highPts += 3; else prev.lowPts += 3;
    } else {
      prev.lowPts += 1; prev.highPts += 1;
    }

    if (lowIsHome) { prev.lowGoals += fix.homeGoals; prev.highGoals += fix.awayGoals; }
    else { prev.highGoals += fix.homeGoals; prev.lowGoals += fix.awayGoals; }

    h2h[key] = prev;
  }
  return h2h;
}

function countRemainingMeetings(fixtures: Fixture[], outcomes: OutcomeMap): Map<string, number> {
  const counts = new Map<string, number>();
  for (const fix of fixtures) {
    if (fix.status !== "SCHEDULED") continue;
    if (outcomes[fix.id]?.locked) continue;
    const key = pairKey(fix.homeTeam.id, fix.awayTeam.id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function definitelyBelow(
  xId: TeamId,
  X: Boundary,
  yId: TeamId,
  Y: Boundary,
  completedH2H: H2HMap,
  remainingMeetings: Map<string, number>,
): boolean {
  if (Y.maxPts < X.minPts) return true;
  if (Y.maxPts > X.minPts) return false;

  if (Y.maxGd < X.minGd) return true;
  if (Y.maxGd > X.minGd) return false;

  if (Y.maxGf < X.minGf) return true;
  if (Y.maxGf > X.minGf) return false;

  const key = pairKey(xId, yId);
  const entry = completedH2H[key];
  const remaining = remainingMeetings.get(key) ?? 0;

  const xIsLow = xId < yId;
  let xH2H = 0;
  let yH2H = 0;
  if (entry) {
    xH2H = xIsLow ? entry.lowPts : entry.highPts;
    yH2H = xIsLow ? entry.highPts : entry.lowPts;
  }
  yH2H += 3 * remaining;

  return yH2H < xH2H;
}
