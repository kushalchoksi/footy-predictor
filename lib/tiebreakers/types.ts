import type { Standing, H2HMap, TeamId, TiebreakerRuleId } from "@/types";

export interface TiebreakContext {
  h2h: H2HMap;
  playoffsFlagged: Set<string>;
  /** Per-team away goals scored across the season. Populated by the projection layer. */
  awayGoals: Map<TeamId, number>;
}

export type TiebreakerRuleFn = (a: Standing, b: Standing, ctx: TiebreakContext) => number;

export type RuleRegistry = Record<TiebreakerRuleId, TiebreakerRuleFn>;
