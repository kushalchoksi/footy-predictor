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

  it("excludes clinched teams from the UCL race (Arsenal/City top of EPL)", () => {
    const standings = [
      row(57, 79, 36), // Arsenal
      row(65, 77, 36), // Man City
      row(66, 65, 36), // Man Utd
      row(64, 59, 36), // Liverpool
      row(58, 59, 36), // Aston Villa
      row(35, 55, 36), // Bournemouth
      row(397, 53, 36), // Brighton
      ...Array.from({ length: 13 }, (_, i) => row(1000 + i, 40 - i * 2, 36)),
    ];
    const clusters = suggestClusters(standings, TOTAL_MATCHES);
    const ucl = clusters.find((c) => c.kind === "ucl")!;
    expect(ucl.teamIds).not.toContain(57); // Arsenal clinched
    expect(ucl.teamIds).not.toContain(65); // City clinched
    expect(ucl.teamIds).toContain(66); // Man Utd in race
    expect(ucl.teamIds).toContain(64); // Liverpool in race
  });

  it("excludes mathematically safe teams from relegation cluster", () => {
    const standings = Array.from({ length: 20 }, (_, i) => row(i + 1, 50 - i, 36));
    const clusters = suggestClusters(standings, TOTAL_MATCHES);
    const reln = clusters.find((c) => c.kind === "relegation")!;
    expect(reln.teamIds).not.toContain(1); // top team obviously safe
    // bottom team: best_position=12, worst_position=20 → in relegation race
    expect(reln.teamIds).toContain(20);
  });
});
