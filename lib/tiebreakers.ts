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
