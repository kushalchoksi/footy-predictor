import type { Fixture, OutcomeMap, TeamId, FixtureId, Outcome } from "@/types";

export interface SparklineSeries {
  history: number[];    // cumulative points after each *played* matchweek for this team
  projection: number[]; // cumulative pts extending into projected matchweeks (starts at last history point)
}

function pointsFromFixtureResult(team: TeamId, fix: Fixture): number {
  if (fix.status !== "FINISHED" || fix.homeGoals === null || fix.awayGoals === null) return 0;
  if (fix.homeGoals === fix.awayGoals) return 1;
  const isHome = fix.homeTeam.id === team;
  const homeWon = fix.homeGoals > fix.awayGoals;
  return (isHome && homeWon) || (!isHome && !homeWon) ? 3 : 0;
}

function pointsFromProjectedOutcome(team: TeamId, fix: Fixture, outcome: Outcome): number {
  if (outcome.kind === "D") return 1;
  const isHome = fix.homeTeam.id === team;
  if (outcome.kind === "H") return isHome ? 3 : 0;
  return isHome ? 0 : 3;
}

export function computeSparkline(
  teamId: TeamId,
  fixtures: Fixture[],
  outcomes: OutcomeMap,
): SparklineSeries {
  const teamFixtures = fixtures
    .filter((f) => f.homeTeam.id === teamId || f.awayTeam.id === teamId)
    .slice()
    .sort((a, b) => a.matchday - b.matchday || a.id - b.id);

  const history: number[] = [];
  const projection: number[] = [];
  let acc = 0;
  let inProjection = false;
  let lastHistoryAcc = 0;

  for (const fix of teamFixtures) {
    if (!inProjection && fix.status === "FINISHED") {
      acc += pointsFromFixtureResult(teamId, fix);
      history.push(acc);
      lastHistoryAcc = acc;
    } else {
      if (!inProjection) {
        inProjection = true;
        // Anchor projection at the last actual points so the dashed line starts where solid ends.
        projection.push(lastHistoryAcc);
        acc = lastHistoryAcc;
      }
      const o = outcomes[fix.id as FixtureId];
      if (o) acc += pointsFromProjectedOutcome(teamId, fix, o);
      projection.push(acc);
    }
  }

  // If team had no scheduled fixtures at all, projection stays empty.
  return { history, projection };
}
