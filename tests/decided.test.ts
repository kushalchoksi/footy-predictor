import { describe, expect, it } from "vitest";
import { detectDecided } from "@/lib/decided";
import type { PointsRange } from "@/lib/ranges";
import type { TeamId } from "@/types";

function ranges(entries: [TeamId, number, number][]): Map<TeamId, PointsRange> {
  return new Map(entries.map(([id, min, max]) => [id, { min, max }]));
}

describe("detectDecided", () => {
  it("flags a team as already champions when their min beats everyone's max", () => {
    const r = ranges([
      [57, 85, 88], // Arsenal: minimum 85
      [65, 80, 84], // City: max 84
      [64, 78, 82], // Liverpool: max 82
    ]);
    const result = detectDecided(r, { relegationCut: 17, top4Cut: 4 });
    expect(result.get(57)?.alreadyChampions).toBe(true);
    expect(result.get(65)?.alreadyChampions).toBe(false);
  });

  it("flags a team as mathematically safe when their min position is above relegation", () => {
    const r = ranges([
      [10, 50, 55], // team A
      [11, 40, 42], // team B
      [12, 35, 38],
      [13, 33, 36],
      [14, 28, 30],
      [15, 25, 27],
      [16, 24, 25],
      [17, 22, 22],
      [18, 20, 21], // relegation zone candidates
      [19, 19, 20],
      [20, 18, 18],
    ]);
    const result = detectDecided(r, { relegationCut: 17, top4Cut: 4 });
    expect(result.get(10)?.mathematicallySafe).toBe(true);
    expect(result.get(20)?.relegated).toBe(true);
  });

  it("flags cannot-finish-top-4 when 4 other teams' min strictly exceeds this team's max", () => {
    const r = ranges([
      [1, 90, 90],
      [2, 88, 88],
      [3, 85, 85],
      [4, 82, 82],
      [5, 70, 75], // can't catch the top 4
    ]);
    const result = detectDecided(r, { relegationCut: 17, top4Cut: 4 });
    expect(result.get(5)?.cannotFinishTop4).toBe(true);
    expect(result.get(4)?.cannotFinishTop4).toBe(false);
  });
});
