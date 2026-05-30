import { describe, expect, it } from "vitest";
import { compare, sortByChain } from "@/lib/tiebreakers";
import { CHAINS } from "@/lib/tiebreakers/chains";
import type { Standing, H2HMap } from "@/types";
import { pairKey } from "@/types";

function s(id: number, name: string, pts: number, gd: number, gf: number, won = 0): Standing {
  return {
    team: { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" },
    position: 0, playedGames: 38,
    won, draw: 0, lost: 0,
    points: pts,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
  };
}

describe("sortByChain (EPL)", () => {
  it("2011/12: City over United on GD with equal points", () => {
    const city = s(1, "Man City", 89, 64, 93);
    const united = s(2, "Man United", 89, 56, 89);
    const { sorted } = sortByChain([united, city], {}, CHAINS.epl);
    expect(sorted[0].team.name).toBe("Man City");
  });
});

describe("sortByChain (La Liga)", () => {
  it("H2H beats GD: A wins head-to-head, B has better overall GD — A ranks higher", () => {
    const a = s(1, "A", 70, 5, 40);
    const b = s(2, "B", 70, 20, 60);
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 4, highPts: 1, lowGoals: 3, highGoals: 1 } };
    const { sorted } = sortByChain([b, a], h2h, CHAINS.laLiga);
    expect(sorted[0].team.id).toBe(1);
  });
});

describe("sortByChain (Brasileirão)", () => {
  it("uses 'wins' before GD", () => {
    const a = s(1, "A", 70, 5, 40, 22);
    const b = s(2, "B", 70, 20, 60, 20);
    const { sorted } = sortByChain([b, a], {}, CHAINS.brasileirao);
    expect(sorted[0].team.id).toBe(1); // more wins wins
  });
});

describe("sortByChain (EPL playoffFlag)", () => {
  it("flags pair when all rules including H2H tie", () => {
    const a = s(1, "A", 70, 20, 60);
    const b = s(2, "B", 70, 20, 60);
    const { playoffsFlagged } = sortByChain([a, b], {}, CHAINS.epl);
    expect(playoffsFlagged.has(pairKey(1, 2))).toBe(true);
  });
});

describe("sortByChain (Bundesliga – no playoffFlag)", () => {
  it("returns stable order without flagging when all rules tie", () => {
    const a = s(1, "A", 70, 20, 60);
    const b = s(2, "B", 70, 20, 60);
    const { playoffsFlagged } = sortByChain([a, b], {}, CHAINS.bundesliga);
    expect(playoffsFlagged.size).toBe(0);
  });
});
