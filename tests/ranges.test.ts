import { describe, expect, it } from "vitest";
import { computeRanges } from "@/lib/ranges";
import type { Fixture, OutcomeMap, Team } from "@/types";

function t(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function f(id: number, home: Team, away: Team): Fixture {
  return {
    id, matchday: 37, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-05-19T15:00:00Z",
  };
}

describe("computeRanges", () => {
  const arsenal = t(57, "Arsenal");
  const city = t(65, "Man City");
  const spurs = t(73, "Spurs");
  const wolves = t(76, "Wolves");

  it("two unset fixtures give a span of 0..6 over base points", () => {
    const base = new Map([[57, 80], [65, 82]]);
    const fixtures = [f(1, arsenal, spurs), f(2, city, arsenal)];
    const ranges = computeRanges(base, fixtures, {});
    expect(ranges.get(57)).toEqual({ min: 80, max: 86 });
    expect(ranges.get(65)).toEqual({ min: 82, max: 85 });
  });

  it("locked fixture collapses the range", () => {
    const base = new Map([[57, 80]]);
    const fixtures = [f(1, arsenal, spurs), f(2, city, arsenal)];
    const outcomes: OutcomeMap = {
      1: { kind: "H", locked: true },
      2: { kind: "A", locked: true },
    };
    const ranges = computeRanges(base, fixtures, outcomes);
    expect(ranges.get(57)).toEqual({ min: 86, max: 86 });
  });

  it("unset fixture between teams not in the base map is skipped", () => {
    const base = new Map([[57, 80]]);
    const fixtures = [f(1, city, wolves)];
    const ranges = computeRanges(base, fixtures, {});
    expect(ranges.get(57)).toEqual({ min: 80, max: 80 });
  });
});
