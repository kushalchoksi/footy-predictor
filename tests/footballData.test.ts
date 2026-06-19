import { describe, it, expect } from "vitest";
import { standingsFromResponse } from "@/lib/footballParse";

function row(id: number, name: string, played: number, points: number) {
  return {
    position: 1,
    team: { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" },
    playedGames: played,
    won: points / 3,
    draw: 0,
    lost: played - points / 3,
    points,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
  };
}

describe("standingsFromResponse", () => {
  it("returns the single TOTAL table for a league competition", () => {
    const parsed = {
      standings: [
        { stage: "REGULAR_SEASON", type: "TOTAL", table: [row(57, "Arsenal", 38, 84)] },
        { stage: "REGULAR_SEASON", type: "HOME", table: [row(57, "Arsenal", 19, 45)] },
        { stage: "REGULAR_SEASON", type: "AWAY", table: [row(57, "Arsenal", 19, 39)] },
      ],
    };
    const out = standingsFromResponse(parsed);
    expect(out.map((s) => s.team.id)).toEqual([57]);
    expect(out[0].playedGames).toBe(38);
  });

  it("includes every group's TOTAL table for a tournament with groups", () => {
    // football-data.org returns one TOTAL entry PER GROUP for tournaments.
    const parsed = {
      standings: [
        { stage: "GROUP_STAGE", type: "TOTAL", table: [row(1, "GroupA-Team", 2, 6)] },
        { stage: "GROUP_STAGE", type: "TOTAL", table: [row(2, "GroupB-Team", 2, 4)] },
        { stage: "GROUP_STAGE", type: "TOTAL", table: [row(3, "GroupC-Team", 2, 3)] },
      ],
    };
    const out = standingsFromResponse(parsed);
    const byId = new Map(out.map((s) => [s.team.id, s]));
    // Group B (and C) must be present with their real played games — not dropped.
    expect(byId.get(2)?.playedGames).toBe(2);
    expect(byId.get(3)?.playedGames).toBe(2);
    expect(out).toHaveLength(3);
  });

  it("throws when there is no TOTAL table", () => {
    const parsed = {
      standings: [{ stage: "REGULAR_SEASON", type: "HOME", table: [row(57, "Arsenal", 19, 45)] }],
    };
    expect(() => standingsFromResponse(parsed)).toThrow();
  });
});
