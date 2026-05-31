import { describe, expect, it } from "vitest";
import { isSeasonComplete } from "@/lib/seasonStatus";
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
