import { describe, expect, it } from "vitest";
import { simulate } from "@/lib/simulate";
import { mulberry32 } from "@/lib/rng";
import type { Fixture, Standing, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function row(t: Team, pts: number, gf: number, ga: number, played = 36): Standing {
  return {
    team: t, position: 0, playedGames: played,
    won: 0, draw: 0, lost: 0,
    points: pts, goalsFor: gf, goalsAgainst: ga, goalDifference: gf - ga,
  };
}

function scheduled(id: number, home: Team, away: Team, matchday = 37): Fixture {
  return {
    id, matchday, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-05-19T15:00:00Z",
  };
}

describe("simulate", () => {
  const a = team(1, "Alpha");
  const b = team(2, "Bravo");
  const c = team(3, "Charlie");

  const standings = [row(a, 70, 60, 30), row(b, 50, 45, 40), row(c, 30, 30, 60)];
  const fixtures = [scheduled(11, a, b), scheduled(12, b, c), scheduled(13, a, c)];

  it("produces a deterministic result with a seeded RNG", () => {
    const out1 = simulate(standings, fixtures, {}, { rng: mulberry32(42) });
    const out2 = simulate(standings, fixtures, {}, { rng: mulberry32(42) });
    expect(out1).toEqual(out2);
  });

  it("fills every scheduled fixture with a scoreline", () => {
    const out = simulate(standings, fixtures, {}, { rng: mulberry32(1) });
    for (const fix of fixtures) {
      const o = out[fix.id];
      expect(o).toBeDefined();
      expect(typeof o!.homeScore).toBe("number");
      expect(typeof o!.awayScore).toBe("number");
      expect(o!.kind).toBe(
        o!.homeScore! > o!.awayScore! ? "H" : o!.homeScore! < o!.awayScore! ? "A" : "D",
      );
    }
  });

  it("preserves locked outcomes", () => {
    const initial = {
      11: { kind: "H" as const, locked: true, homeScore: 4, awayScore: 0 },
    };
    const out = simulate(standings, fixtures, initial, { rng: mulberry32(7) });
    expect(out[11]).toEqual(initial[11]);
  });

  it("teamScope limits which fixtures are simulated", () => {
    const out = simulate(standings, fixtures, {}, {
      teamScope: [a.id],
      rng: mulberry32(3),
    });
    expect(out[11]).toBeDefined(); // a-vs-b
    expect(out[13]).toBeDefined(); // a-vs-c
    expect(out[12]).toBeUndefined(); // b-vs-c — outside scope
  });

  it("does not touch FINISHED fixtures", () => {
    const finished: Fixture = {
      id: 99, matchday: 1, homeTeam: a, awayTeam: b,
      status: "FINISHED", homeGoals: 2, awayGoals: 1,
      utcDate: "2025-08-15T15:00:00Z",
    };
    const out = simulate(standings, [...fixtures, finished], {}, { rng: mulberry32(5) });
    expect(out[99]).toBeUndefined();
  });
});
