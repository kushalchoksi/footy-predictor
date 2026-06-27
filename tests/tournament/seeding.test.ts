import { describe, expect, it } from "vitest";
import { seedBracket } from "@/lib/tournament/seeding";
import { LEAGUE_PHASE_GROUP } from "@/lib/tournament/groupStage";
import {
  WC_BRACKET_TEMPLATE,
  WC_THIRD_COMBINATIONS,
  WC_WINNER_COLUMNS,
  assignThirdPlaced,
} from "@/lib/tournament/worldCup2026";
import type { Competition, Standing } from "@/types";

function team(id: number) {
  return { id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}`, crest: "" };
}

/** Standing with given points/GD so ranking within a pre-sorted list is explicit. */
function standing(id: number, points: number, gd = 0): Standing {
  return {
    team: team(id), position: 0, playedGames: 3,
    won: 0, draw: 0, lost: 0, points, goalsFor: gd, goalsAgainst: 0, goalDifference: gd,
  };
}

const traditionalTemplate = {
  rounds: {
    LAST_16: Array.from({ length: 8 }, (_, i) => ({ id: `R16-${i + 1}` })),
    QUARTER_FINALS: [
      { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
    ],
  },
} as Competition["bracketTemplate"];

const euroLike: Competition = {
  code: "TEST_EC", name: "Test Euro", country: "X", emblem: "", accent: "#000", flagUrl: "", trophyUrl: "", format: "tournament",
  tiebreaker: "uefa", season: { startYear: 2024, label: "t" }, groupCount: 6,
  bracketTemplate: traditionalTemplate,
};

describe("seedBracket — traditional groups (Euro-like)", () => {
  // 6 groups of 4. Group winners get descending points so ranking is predictable.
  function sixGroups(): Map<string, Standing[]> {
    const m = new Map<string, Standing[]>();
    const letters = ["A", "B", "C", "D", "E", "F"];
    letters.forEach((L, g) => {
      const base = 100 - g; // group A strongest
      m.set(`GROUP_${L}`, [
        standing(g * 10 + 1, base, 9),       // winner
        standing(g * 10 + 2, base - 10, 3),  // runner-up
        standing(g * 10 + 3, base - 20, g),  // third (GD varies by group for best-third ranking)
        standing(g * 10 + 4, 0, -9),         // bottom
      ]);
    });
    return m;
  }

  it("fills all 16 first-round slots from top-2 + best-4 thirds", () => {
    const { seeds, qualifiedIds } = seedBracket(euroLike, sixGroups());
    expect(Object.keys(seeds)).toHaveLength(8);
    expect(qualifiedIds.size).toBe(16);
    // Each tie has both slots seeded.
    for (const seed of Object.values(seeds)) {
      expect(seed.home).toBeDefined();
      expect(seed.away).toBeDefined();
    }
  });

  it("excludes all bottom-of-group teams and the two weakest thirds", () => {
    const { qualifiedIds } = seedBracket(euroLike, sixGroups());
    // Bottom teams (id ending in 4) never qualify.
    for (let g = 0; g < 6; g++) expect(qualifiedIds.has(g * 10 + 4)).toBe(false);
    // Only 4 of the 6 thirds (id ending in 3) qualify.
    const thirdsIn = [0, 1, 2, 3, 4, 5].filter((g) => qualifiedIds.has(g * 10 + 3)).length;
    expect(thirdsIn).toBe(4);
  });

  it("returns empty when groups can't fill the bracket", () => {
    const tooFew = new Map<string, Standing[]>([["GROUP_A", [standing(1, 9), standing(2, 6)]]]);
    expect(seedBracket(euroLike, tooFew).seeds).toEqual({});
  });
});

describe("seedBracket — Champions League league phase", () => {
  const clTemplate = {
    rounds: {
      PLAYOFFS: Array.from({ length: 8 }, (_, i) => ({ id: `PO${i + 1}` })),
      LAST_16: Array.from({ length: 8 }, (_, i) => ({ id: `R16-${i + 1}`, feederAway: `PO${i + 1}` })),
    },
  } as Competition["bracketTemplate"];

  const cl: Competition = {
    code: "TEST_CL", name: "Test CL", country: "X", emblem: "", accent: "#000", flagUrl: "", trophyUrl: "", format: "tournament",
    tiebreaker: "uefa", season: { startYear: 2025, label: "t" }, groupCount: 1,
    bracketTemplate: clTemplate,
  };

  function leaguePhase(n: number): Map<string, Standing[]> {
    // Ranks already sorted: team id i has points (1000 - i), so id 1 is top.
    const rows = Array.from({ length: n }, (_, i) => standing(i + 1, 1000 - i));
    return new Map([[LEAGUE_PHASE_GROUP, rows]]);
  }

  it("seeds top 8 directly into R16 home slots and ranks 9-24 into playoffs", () => {
    const { seeds, qualifiedIds } = seedBracket(cl, leaguePhase(36));
    // Top 8 → R16 home, no away (filled later by playoff winner).
    expect(seeds["R16-1"].home?.id).toBe(1);
    expect(seeds["R16-1"].away).toBeUndefined();
    expect(seeds["R16-8"].home?.id).toBe(8);
    // Playoffs paired 9 v 24, ... 16 v 17.
    expect(seeds["PO1"].home?.id).toBe(9);
    expect(seeds["PO1"].away?.id).toBe(24);
    expect(seeds["PO8"].home?.id).toBe(16);
    expect(seeds["PO8"].away?.id).toBe(17);
    // 24 teams reach the knockout/playoff phase; 25-36 do not.
    expect(qualifiedIds.size).toBe(24);
    expect(qualifiedIds.has(25)).toBe(false);
  });

  it("returns empty when fewer than 24 teams are present", () => {
    expect(seedBracket(cl, leaguePhase(20)).seeds).toEqual({});
  });
});

describe("WC third-place combination table (worldCup2026)", () => {
  it("has all 495 = C(12,8) combinations, each a permutation of its key", () => {
    const keys = Object.keys(WC_THIRD_COMBINATIONS);
    expect(keys).toHaveLength(495);
    expect(WC_WINNER_COLUMNS).toHaveLength(8);
    for (const [key, value] of Object.entries(WC_THIRD_COMBINATIONS)) {
      expect(value).toHaveLength(8);
      // value is the same eight groups as the key, reordered onto the winners.
      expect([...value].sort().join("")).toBe(key);
    }
  });

  it("maps qualifying thirds onto the official winner columns", () => {
    // Combination 1 from FIFA Annex C: groups E–L produce the qualifying thirds.
    const got = assignThirdPlaced(["L", "K", "J", "I", "H", "G", "F", "E"]);
    expect(got).toEqual({ A: "E", B: "J", D: "I", E: "F", G: "H", I: "G", K: "L", L: "K" });
  });

  it("rejects an invalid (non eight-of-twelve) set", () => {
    expect(assignThirdPlaced(["A", "B", "C"])).toBeNull();
  });
});

describe("seedBracket — World Cup fixed round of 32", () => {
  const wc: Competition = {
    code: "WC", name: "Test WC", country: "X", emblem: "", accent: "#000", flagUrl: "", trophyUrl: "",
    format: "tournament", tiebreaker: "fifa", season: { startYear: 2026, label: "t" }, groupCount: 12,
    bracketTemplate: WC_BRACKET_TEMPLATE,
  };

  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  // id scheme: group index g (0–11), position p (0–3) → g*10 + p + 1.
  const id = (g: number, p: number) => g * 10 + p + 1;

  /** 12 groups of 4, pre-sorted [winner, runner, third, bottom]. Thirds of groups
   *  E–L get more points than A–D, so the eight best thirds are exactly E–L
   *  (FIFA combination 1). */
  function twelveGroups(): Map<string, Standing[]> {
    const m = new Map<string, Standing[]>();
    LETTERS.forEach((L, g) => {
      const thirdPts = g >= 4 ? 5 : 1; // E–L (g≥4) qualify; A–D do not
      m.set(`GROUP_${L}`, [
        standing(id(g, 0), 9), // winner
        standing(id(g, 1), 6), // runner-up
        standing(id(g, 2), thirdPts), // third
        standing(id(g, 3), 0), // bottom
      ]);
    });
    return m;
  }

  it("places winners and runners-up in their fixed slots", () => {
    const { seeds } = seedBracket(wc, twelveGroups());
    // M73 = Runner-up A vs Runner-up B
    expect(seeds["M73"].home?.id).toBe(id(0, 1));
    expect(seeds["M73"].away?.id).toBe(id(1, 1));
    // M79 = Winner A vs (third). M74 = Winner E vs (third).
    expect(seeds["M79"].home?.id).toBe(id(0, 0));
    expect(seeds["M74"].home?.id).toBe(id(4, 0));
    // M88 = Runner-up D vs Runner-up G
    expect(seeds["M88"].home?.id).toBe(id(3, 1));
    expect(seeds["M88"].away?.id).toBe(id(6, 1));
  });

  it("assigns the eight best thirds to the correct winners (combination 1)", () => {
    const { seeds } = seedBracket(wc, twelveGroups());
    // Per combination EFGHIJKL: A↔3E, B↔3J, D↔3I, E↔3F, G↔3H, I↔3G, K↔3L, L↔3K.
    const thirdId = (L: string) => id(LETTERS.indexOf(L), 2);
    expect(seeds["M79"].away?.id).toBe(thirdId("E")); // winner A vs 3rd of E
    expect(seeds["M85"].away?.id).toBe(thirdId("J")); // winner B vs 3rd of J
    expect(seeds["M81"].away?.id).toBe(thirdId("I")); // winner D vs 3rd of I
    expect(seeds["M74"].away?.id).toBe(thirdId("F")); // winner E vs 3rd of F
    expect(seeds["M82"].away?.id).toBe(thirdId("H")); // winner G vs 3rd of H
    expect(seeds["M77"].away?.id).toBe(thirdId("G")); // winner I vs 3rd of G
    expect(seeds["M87"].away?.id).toBe(thirdId("L")); // winner K vs 3rd of L
    expect(seeds["M80"].away?.id).toBe(thirdId("K")); // winner L vs 3rd of K
  });

  it("qualifies 32 teams: every top-2 plus the eight best thirds, no one else", () => {
    const { qualifiedIds } = seedBracket(wc, twelveGroups());
    expect(qualifiedIds.size).toBe(32);
    // All bottom-of-group teams excluded.
    for (let g = 0; g < 12; g++) expect(qualifiedIds.has(id(g, 3))).toBe(false);
    // Thirds of A–D excluded; thirds of E–L included.
    for (let g = 0; g < 4; g++) expect(qualifiedIds.has(id(g, 2))).toBe(false);
    for (let g = 4; g < 12; g++) expect(qualifiedIds.has(id(g, 2))).toBe(true);
  });

  it("returns empty when the group data can't fill every slot", () => {
    const partial = new Map<string, Standing[]>([
      ["GROUP_A", [standing(1, 9), standing(2, 6), standing(3, 3), standing(4, 0)]],
    ]);
    expect(seedBracket(wc, partial).seeds).toEqual({});
  });

  it("matches the real 2026 bracket (combination 67: thirds B,D,E,F,I,J,K,L)", () => {
    // Mirrors the live round of 32: USA(1D) v 3rd-B, Germany(1E) v 3rd-D,
    // France(1I) v 3rd-F, Mexico(1A) v 3rd-E.
    const qualifies = new Set(["B", "D", "E", "F", "I", "J", "K", "L"]);
    const m = new Map<string, Standing[]>();
    LETTERS.forEach((L, g) => {
      m.set(`GROUP_${L}`, [
        standing(id(g, 0), 9),
        standing(id(g, 1), 6),
        standing(id(g, 2), qualifies.has(L) ? 5 : 1),
        standing(id(g, 3), 0),
      ]);
    });
    const { seeds } = seedBracket(wc, m);
    const thirdId = (L: string) => id(LETTERS.indexOf(L), 2);
    expect(seeds["M81"].away?.id).toBe(thirdId("B")); // winner D vs 3rd of B
    expect(seeds["M74"].away?.id).toBe(thirdId("D")); // winner E vs 3rd of D
    expect(seeds["M77"].away?.id).toBe(thirdId("F")); // winner I vs 3rd of F
    expect(seeds["M79"].away?.id).toBe(thirdId("E")); // winner A vs 3rd of E
  });
});
