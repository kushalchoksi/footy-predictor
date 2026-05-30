import { describe, expect, it } from "vitest";
import { compareEPL, type TiebreakContext } from "@/lib/tiebreakers";
import type { Standing, H2HMap } from "@/types";
import { pairKey } from "@/types";

function s(name: string, id: number, pts: number, gd: number, gf: number): Standing {
  return {
    team: { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" },
    position: 0,
    playedGames: 38,
    won: 0, draw: 0, lost: 0,
    points: pts,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
  };
}

const emptyH2H: H2HMap = {};
const ctx = (h2h: H2HMap = emptyH2H): TiebreakContext => ({ h2h, playoffsFlagged: new Set(), awayGoals: new Map() });

describe("compareEPL", () => {
  it("sorts by points first", () => {
    const a = s("A", 1, 89, 10, 50);
    const b = s("B", 2, 90, 0, 30);
    expect(compareEPL(a, b, ctx())).toBeGreaterThan(0); // b ranks above a
  });

  it("breaks point ties on goal difference (2011-12 City over United)", () => {
    const city = s("Man City", 65, 89, 64, 93);
    const united = s("Man United", 66, 89, 56, 89);
    expect(compareEPL(city, united, ctx())).toBeLessThan(0); // city first
  });

  it("breaks GD ties on goals for", () => {
    const a = s("A", 1, 70, 20, 60);
    const b = s("B", 2, 70, 20, 55);
    expect(compareEPL(a, b, ctx())).toBeLessThan(0); // a first
  });

  it("falls to head-to-head when pts/GD/GF all equal", () => {
    const a = s("A", 1, 70, 20, 60);
    const b = s("B", 2, 70, 20, 60);
    const h2h: H2HMap = {
      [pairKey(1, 2)]: { lowPts: 4, highPts: 1, lowGoals: 3, highGoals: 1 },
    };
    expect(compareEPL(a, b, ctx(h2h))).toBeLessThan(0); // a (low id) won H2H
  });

  it("flags playoff when even H2H is tied", () => {
    const a = s("A", 1, 70, 20, 60);
    const b = s("B", 2, 70, 20, 60);
    const c = ctx();
    const result = compareEPL(a, b, c);
    expect(result).toBe(0);
    expect(c.playoffsFlagged.has(pairKey(1, 2))).toBe(true);
  });
});
