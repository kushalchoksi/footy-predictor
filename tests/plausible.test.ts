import { describe, expect, it } from "vitest";
import { plausibleCompetitors, doubleRoundRobinMatches } from "@/lib/plausible";
import type { Standing } from "@/types";

function standing(id: number, points: number, playedGames: number): Standing {
  return {
    team: { id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}`, crest: "" },
    position: 0, playedGames, won: 0, draw: 0, lost: 0, points,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
  };
}

describe("plausibleCompetitors", () => {
  // 20 teams, half a season played (19 of 38), points fanned out 40, 38, ... 2.
  function midSeasonTable(): Standing[] {
    return Array.from({ length: 20 }, (_, i) => standing(i + 1, 40 - 2 * i, 19));
  }
  const total = doubleRoundRobinMatches(20); // 38

  it("does not pull the whole table into the leader's race", () => {
    const comp = plausibleCompetitors(midSeasonTable(), total);
    const leaders = comp.get(1)!;
    expect(leaders.size).toBeLessThan(19);          // not everyone
    expect(leaders.has(20)).toBe(false);            // bottom team is not a title rival
  });

  it("keeps adjacent teams as competitors but excludes distant ones", () => {
    const comp = plausibleCompetitors(midSeasonTable(), total);
    const leaders = comp.get(1)!;
    expect(leaders.has(2)).toBe(true);              // second place is in the race
    expect(leaders.has(15)).toBe(false);            // a relegation-zone team is not
  });

  it("collapses to only level teams once the season is complete", () => {
    // All 38 played: no games remain, so bands collapse to current points.
    const finished = [
      standing(1, 80, 38), standing(2, 80, 38), standing(3, 70, 38),
    ];
    const comp = plausibleCompetitors(finished, 38);
    expect(comp.get(1)!.has(2)).toBe(true);   // tied on points → overlap
    expect(comp.get(1)!.has(3)).toBe(false);  // 10 points clear, nothing to play
  });
});
