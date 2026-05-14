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
