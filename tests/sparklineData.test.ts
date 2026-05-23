import { describe, expect, it } from "vitest";
import { computeSparkline } from "@/lib/sparklineData";
import type { Fixture, OutcomeMap, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function fin(id: number, home: Team, away: Team, hg: number, ag: number, matchday: number): Fixture {
  return {
    id, matchday, homeTeam: home, awayTeam: away,
    status: "FINISHED", homeGoals: hg, awayGoals: ag,
    utcDate: "2025-08-15T15:00:00Z",
  };
}

function sched(id: number, home: Team, away: Team, matchday: number): Fixture {
  return {
    id, matchday, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-05-19T15:00:00Z",
  };
}

describe("computeSparkline", () => {
  const a = team(1, "Alpha");
  const b = team(2, "Bravo");

  it("accumulates points across played matchweeks", () => {
    const fixtures = [
      fin(101, a, b, 2, 0, 1), // a wins +3
      fin(102, b, a, 1, 1, 2), // draw +1
      fin(103, a, b, 0, 1, 3), // a loses +0
    ];
    const s = computeSparkline(a.id, fixtures, {});
    expect(s.history).toEqual([3, 4, 4]);
    expect(s.projection).toEqual([]);
  });

  it("extends with projected outcomes from current pts", () => {
    const fixtures = [
      fin(101, a, b, 2, 0, 1),  // +3 → 3
      sched(201, b, a, 2),       // scheduled
      sched(202, a, b, 3),       // scheduled
    ];
    const outcomes: OutcomeMap = {
      201: { kind: "A", locked: false }, // away (a) wins +3 → 6
      202: { kind: "D", locked: false }, // draw → 7
    };
    const s = computeSparkline(a.id, fixtures, outcomes);
    expect(s.history).toEqual([3]);
    expect(s.projection).toEqual([3, 6, 7]); // anchored at 3, then progressing
  });

  it("projection starts at the last history point even without outcomes set", () => {
    const fixtures = [
      fin(101, a, b, 2, 0, 1), // +3
      sched(201, a, b, 2),
    ];
    const s = computeSparkline(a.id, fixtures, {});
    expect(s.history).toEqual([3]);
    expect(s.projection).toEqual([3, 3]); // anchored at 3, fixture has no outcome → 0 pts added
  });
});
