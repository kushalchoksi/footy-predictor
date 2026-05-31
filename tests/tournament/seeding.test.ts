import { describe, expect, it } from "vitest";
import { seedBracket } from "@/lib/tournament/seeding";
import { LEAGUE_PHASE_GROUP } from "@/lib/tournament/groupStage";
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
  code: "TEST_EC", name: "Test Euro", country: "X", emblem: "", format: "tournament",
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
    code: "TEST_CL", name: "Test CL", country: "X", emblem: "", format: "tournament",
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
