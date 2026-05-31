import { describe, expect, it } from "vitest";
import { isSeasonComplete, isSeasonCompleteFromMeta } from "@/lib/seasonStatus";
import type { Fixture } from "@/types";

function fixture(id: number, status: Fixture["status"]): Fixture {
  return {
    id,
    matchday: 1,
    homeTeam: { id: 1, name: "A", shortName: "A", tla: "AAA", crest: "" },
    awayTeam: { id: 2, name: "B", shortName: "B", tla: "BBB", crest: "" },
    status,
    homeGoals: status === "FINISHED" ? 1 : null,
    awayGoals: status === "FINISHED" ? 0 : null,
    utcDate: "2026-01-01T00:00:00Z",
  };
}

describe("isSeasonComplete", () => {
  it("is true when every fixture has finished", () => {
    expect(isSeasonComplete([fixture(1, "FINISHED"), fixture(2, "FINISHED")])).toBe(true);
  });

  it("is false when any fixture is still scheduled", () => {
    expect(isSeasonComplete([fixture(1, "FINISHED"), fixture(2, "SCHEDULED")])).toBe(false);
  });

  it("is false for an empty fixture list (season not published)", () => {
    expect(isSeasonComplete([])).toBe(false);
  });
});

describe("isSeasonCompleteFromMeta", () => {
  const now = new Date("2026-05-31T00:00:00Z");

  it("is true when a winner is recorded", () => {
    expect(isSeasonCompleteFromMeta({ hasWinner: true, seasonEndDate: "2026-12-01" }, now)).toBe(true);
  });

  it("is true when the season end date has passed", () => {
    expect(isSeasonCompleteFromMeta({ hasWinner: false, seasonEndDate: "2026-05-17" }, now)).toBe(true);
  });

  it("is false when the season ends in the future and has no winner", () => {
    expect(isSeasonCompleteFromMeta({ hasWinner: false, seasonEndDate: "2026-12-02" }, now)).toBe(false);
  });

  it("is false when there is no end date and no winner", () => {
    expect(isSeasonCompleteFromMeta({ hasWinner: false, seasonEndDate: null }, now)).toBe(false);
  });
});
