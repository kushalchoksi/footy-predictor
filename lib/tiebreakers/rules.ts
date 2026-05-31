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

function h2hPoints(
  aId: TeamId,
  bId: TeamId,
  ctx: { h2h: { [k: string]: { lowPts: number; highPts: number; lowGoals: number; highGoals: number } } },
) {
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

// For two-team H2H, H2H GD of A = aGoals - bGoals; H2H GD of B = bGoals - aGoals.
// So A ranks above B (return negative) when aGoals > bGoals — same direction as headToHeadGoals.
const headToHeadGD: TiebreakerRuleFn = (a, b, ctx) => {
  const { aGoals, bGoals } = h2hPoints(a.team.id, b.team.id, ctx);
  return bGoals - aGoals;
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
