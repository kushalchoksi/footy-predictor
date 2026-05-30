import { describe, expect, it } from "vitest";
import type { Standing, H2HMap } from "@/types";
import { pairKey } from "@/types";
import { RULES } from "@/lib/tiebreakers/rules";
import type { TiebreakContext } from "@/lib/tiebreakers/types";

function s(id: number, pts: number, gd: number, gf: number, won = 0): Standing {
  return {
    team: { id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}`, crest: "" },
    position: 0, playedGames: 38,
    won, draw: 0, lost: 0,
    points: pts,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
  };
}

const ctx = (h2h: H2HMap = {}, awayGoals: Map<number, number> = new Map()): TiebreakContext =>
  ({ h2h, playoffsFlagged: new Set(), awayGoals });

describe("tiebreaker rules", () => {
  it("points: higher points ranks above lower", () => {
    expect(RULES.points(s(1, 80, 0, 0), s(2, 70, 0, 0), ctx())).toBeLessThan(0);
    expect(RULES.points(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx())).toBe(0);
  });

  it("goalDifference: higher GD ranks above lower", () => {
    expect(RULES.goalDifference(s(1, 70, 10, 0), s(2, 70, 5, 0), ctx())).toBeLessThan(0);
  });

  it("goalsFor: higher GF ranks above lower", () => {
    expect(RULES.goalsFor(s(1, 70, 0, 50), s(2, 70, 0, 40), ctx())).toBeLessThan(0);
  });

  it("wins: more wins ranks above fewer", () => {
    expect(RULES.wins(s(1, 70, 0, 0, 22), s(2, 70, 0, 0, 20), ctx())).toBeLessThan(0);
  });

  it("goalsAway: more away goals ranks above fewer (Ligue 1)", () => {
    const away = new Map<number, number>([[1, 30], [2, 22]]);
    expect(RULES.goalsAway(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx({}, away))).toBeLessThan(0);
  });

  it("headToHead: more H2H points ranks above (low id won the pair)", () => {
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 4, highPts: 1, lowGoals: 3, highGoals: 1 } };
    expect(RULES.headToHead(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx(h2h))).toBeLessThan(0);
  });

  it("headToHeadGD: better H2H GD ranks above", () => {
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 0, highPts: 0, lowGoals: 5, highGoals: 1 } };
    expect(RULES.headToHeadGD(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx(h2h))).toBeLessThan(0);
  });

  it("headToHeadGoals: more H2H goals scored ranks above", () => {
    const h2h: H2HMap = { [pairKey(1, 2)]: { lowPts: 3, highPts: 3, lowGoals: 4, highGoals: 2 } };
    expect(RULES.headToHeadGoals(s(1, 70, 0, 0), s(2, 70, 0, 0), ctx(h2h))).toBeLessThan(0);
  });

  it("playoffFlag: always returns 0 and adds the pair to playoffsFlagged", () => {
    const c = ctx();
    expect(RULES.playoffFlag(s(1, 70, 0, 0), s(2, 70, 0, 0), c)).toBe(0);
    expect(c.playoffsFlagged.has(pairKey(1, 2))).toBe(true);
  });
});
