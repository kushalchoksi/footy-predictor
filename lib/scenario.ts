import type { Standing, Fixture, Outcome, OutcomeMap, H2HMap, H2HEntry } from "@/types";
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

    applyOutcome(home, away, outcome);
    recordH2H(h2h, fix.homeTeam.id, fix.awayTeam.id, outcome);
  }

  return { standings: Array.from(byId.values()), h2h };
}

/**
 * Validate and extract a usable scoreline from an outcome.
 * Returns the scoreline only when both scores are defined, non-negative integers,
 * AND the scoreline is consistent with outcome.kind (home win → homeScore > awayScore, etc.).
 * If the scoreline contradicts kind, it is ignored and we fall back to the +1 model.
 * This is because kind is the user's explicit choice and is the source of truth.
 */
function resolveScoreline(
  outcome: Outcome,
): { homeScore: number; awayScore: number } | null {
  const { homeScore, awayScore, kind } = outcome;
  if (homeScore === undefined || awayScore === undefined) return null;

  // Defensive: treat non-integer or negative values as absent.
  const hs = Number.isInteger(homeScore) && homeScore >= 0 ? homeScore : 0;
  const as_ = Number.isInteger(awayScore) && awayScore >= 0 ? awayScore : 0;

  // Check consistency: scoreline's implied result must match kind.
  const impliedKind = hs > as_ ? "H" : hs < as_ ? "A" : "D";
  if (impliedKind !== kind) {
    // Contradiction: trust kind, ignore scoreline.
    return null;
  }

  return { homeScore: hs, awayScore: as_ };
}

function applyOutcome(home: Standing | undefined, away: Standing | undefined, outcome: Outcome) {
  const { kind } = outcome;
  if (home) home.playedGames += 1;
  if (away) away.playedGames += 1;

  const scoreline = resolveScoreline(outcome);

  if (kind === "H") {
    if (home) {
      home.points += 3;
      home.won += 1;
      home.goalsFor += scoreline ? scoreline.homeScore : 1;
      home.goalsAgainst += scoreline ? scoreline.awayScore : 0;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
    }
    if (away) {
      away.lost += 1;
      away.goalsFor += scoreline ? scoreline.awayScore : 0;
      away.goalsAgainst += scoreline ? scoreline.homeScore : 1;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    }
  } else if (kind === "A") {
    if (away) {
      away.points += 3;
      away.won += 1;
      away.goalsFor += scoreline ? scoreline.awayScore : 1;
      away.goalsAgainst += scoreline ? scoreline.homeScore : 0;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    }
    if (home) {
      home.lost += 1;
      home.goalsFor += scoreline ? scoreline.homeScore : 0;
      home.goalsAgainst += scoreline ? scoreline.awayScore : 1;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
    }
  } else {
    if (home) {
      home.points += 1;
      home.draw += 1;
      home.goalsFor += scoreline ? scoreline.homeScore : 0;
      home.goalsAgainst += scoreline ? scoreline.awayScore : 0;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
    }
    if (away) {
      away.points += 1;
      away.draw += 1;
      away.goalsFor += scoreline ? scoreline.awayScore : 0;
      away.goalsAgainst += scoreline ? scoreline.homeScore : 0;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    }
  }
}

function recordH2H(h2h: H2HMap, homeId: number, awayId: number, outcome: Outcome) {
  const { kind } = outcome;
  const key = pairKey(homeId, awayId);
  const lowIsHome = homeId < awayId;
  const prev: H2HEntry = h2h[key] ?? { lowPts: 0, highPts: 0, lowGoals: 0, highGoals: 0 };

  const scoreline = resolveScoreline(outcome);

  if (kind === "H") {
    if (lowIsHome) {
      prev.lowPts += 3;
      prev.lowGoals += scoreline ? scoreline.homeScore : 1;
      prev.highGoals += scoreline ? scoreline.awayScore : 0;
    } else {
      prev.highPts += 3;
      prev.highGoals += scoreline ? scoreline.homeScore : 1;
      prev.lowGoals += scoreline ? scoreline.awayScore : 0;
    }
  } else if (kind === "A") {
    if (lowIsHome) {
      prev.highPts += 3;
      prev.highGoals += scoreline ? scoreline.awayScore : 1;
      prev.lowGoals += scoreline ? scoreline.homeScore : 0;
    } else {
      prev.lowPts += 3;
      prev.lowGoals += scoreline ? scoreline.awayScore : 1;
      prev.highGoals += scoreline ? scoreline.homeScore : 0;
    }
  } else {
    prev.lowPts += 1;
    prev.highPts += 1;
    if (scoreline) {
      if (lowIsHome) { prev.lowGoals += scoreline.homeScore; prev.highGoals += scoreline.awayScore; }
      else { prev.highGoals += scoreline.homeScore; prev.lowGoals += scoreline.awayScore; }
    }
  }

  h2h[key] = prev;
}
