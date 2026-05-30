import type { Standing, H2HMap, TeamId, TiebreakerChain } from "@/types";
import { RULES } from "@/lib/tiebreakers/rules";
import type { TiebreakContext } from "@/lib/tiebreakers/types";
import { CHAINS } from "@/lib/tiebreakers/chains";

export { CHAINS } from "@/lib/tiebreakers/chains";
export type { TiebreakContext } from "@/lib/tiebreakers/types";

export function compare(
  a: Standing,
  b: Standing,
  chain: TiebreakerChain,
  ctx: TiebreakContext,
): number {
  for (const ruleId of chain.rules) {
    const delta = RULES[ruleId](a, b, ctx);
    if (delta !== 0) return delta;
  }
  return 0;
}

export interface SortByChainResult {
  sorted: Standing[];
  playoffsFlagged: Set<string>;
}

export function sortByChain(
  standings: Standing[],
  h2h: H2HMap,
  chain: TiebreakerChain,
  awayGoals: Map<TeamId, number> = new Map(),
): SortByChainResult {
  const ctx: TiebreakContext = { h2h, playoffsFlagged: new Set(), awayGoals };
  const sorted = [...standings].sort((a, b) => compare(a, b, chain, ctx));
  return { sorted, playoffsFlagged: ctx.playoffsFlagged };
}

// ── Backward-compatible shims for code that previously imported from @/lib/tiebreakers ──

/** @deprecated Use sortByChain(standings, h2h, CHAINS.epl) instead */
export function compareEPL(a: Standing, b: Standing, ctx: TiebreakContext): number {
  return compare(a, b, CHAINS.epl, ctx);
}

/** @deprecated Use sortByChain(standings, h2h, CHAINS.epl) instead */
export function sortByEPL(
  standings: Standing[],
  h2h: H2HMap,
): { sorted: Standing[]; playoffsFlagged: Set<string> } {
  return sortByChain(standings, h2h, CHAINS.epl);
}
