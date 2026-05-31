import type { TiebreakerChain, TiebreakerChainId } from "@/types";

export const CHAINS: Record<TiebreakerChainId, TiebreakerChain> = {
  epl:          { id: "epl",          rules: ["points", "goalDifference", "goalsFor", "headToHead", "playoffFlag"] },
  laLiga:       { id: "laLiga",       rules: ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"] },
  bundesliga:   { id: "bundesliga",   rules: ["points", "goalDifference", "goalsFor", "headToHead"] },
  serieA:       { id: "serieA",       rules: ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"] },
  ligue1:       { id: "ligue1",       rules: ["points", "goalDifference", "goalsFor", "goalsAway"] },
  eredivisie:   { id: "eredivisie",   rules: ["points", "goalDifference", "goalsFor"] },
  primeira:     { id: "primeira",     rules: ["points", "headToHead", "headToHeadGD", "goalDifference", "goalsFor"] },
  championship: { id: "championship", rules: ["points", "goalDifference", "goalsFor", "playoffFlag"] },
  brasileirao:  { id: "brasileirao",  rules: ["points", "wins", "goalDifference", "goalsFor", "headToHead"] },
  uefa:         { id: "uefa",         rules: ["points", "headToHead", "headToHeadGD", "headToHeadGoals", "goalDifference", "goalsFor"] },
  fifa:         { id: "fifa",         rules: ["points", "goalDifference", "goalsFor", "headToHead", "headToHeadGD", "headToHeadGoals"] },
};
