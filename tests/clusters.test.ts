import { describe, expect, it } from "vitest";
import { suggestClusters } from "@/lib/clusters";
import type { Standing, Team } from "@/types";

function row(id: number, pts: number, played: number): Standing {
  const team: Team = { id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}`, crest: "" };
  return {
    team, position: 0, playedGames: played,
    won: 0, draw: 0, lost: 0,
    points: pts, goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
  };
}

const TOTAL_MATCHES = 38;

describe("suggestClusters", () => {
  it("title race: leader plus anyone within max-catch-up points", () => {
    const standings = [
      row(1, 80, 36), // leader, 2 games left → max +6
      row(2, 75, 36), // 5 behind, can catch
      row(3, 73, 36), // 7 behind, cannot
    ];
    const clusters = suggestClusters(standings, TOTAL_MATCHES);
    const title = clusters.find((c) => c.kind === "title")!;
    expect(title.teamIds).toEqual([1, 2]);
  });

  it("relegation cluster includes teams within reach of 17th", () => {
    const standings = Array.from({ length: 20 }, (_, i) => row(i + 1, 50 - i, 36));
    const clusters = suggestClusters(standings, TOTAL_MATCHES);
    const reln = clusters.find((c) => c.kind === "relegation")!;
    expect(reln.teamIds.length).toBeGreaterThanOrEqual(3);
  });
});
