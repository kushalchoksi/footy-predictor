import { describe, expect, it } from "vitest";
import { projectGroups } from "@/lib/tournament/groupStage";
import { CHAINS } from "@/lib/tiebreakers/chains";
import type { Fixture, OutcomeMap, Standing, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function emptyStanding(t: Team): Standing {
  return {
    team: t, position: 0, playedGames: 0,
    won: 0, draw: 0, lost: 0, points: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
  };
}

function scheduled(id: number, home: Team, away: Team, group: string): Fixture {
  return {
    id, matchday: 1, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-06-01T00:00:00Z",
    group, stage: "GROUP_STAGE",
  };
}

function swissFixture(id: number, home: Team, away: Team): Fixture {
  return {
    id, matchday: 1, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-06-01T00:00:00Z",
    stage: "LEAGUE_STAGE",
  };
}

describe("projectGroups", () => {
  const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
  const base: Standing[] = [a, b, c, d].map(emptyStanding);
  const fixtures: Fixture[] = [
    scheduled(101, a, b, "GROUP_A"),
    scheduled(102, c, d, "GROUP_A"),
    scheduled(103, a, c, "GROUP_A"),
    scheduled(104, b, d, "GROUP_A"),
    scheduled(105, a, d, "GROUP_A"),
    scheduled(106, b, c, "GROUP_A"),
  ];

  it("partitions standings into groups and returns standings per group when no outcomes set", () => {
    const result = projectGroups(base, fixtures, {}, CHAINS.fifa);
    expect(result.groupStandings.size).toBe(1);
    expect(result.groupStandings.get("GROUP_A")?.length).toBe(4);
  });

  it("projects standings and qualifies top 2 by chain when outcomes are set", () => {
    const outcomes: OutcomeMap = {
      101: { kind: "H", locked: false }, // A beats B
      103: { kind: "H", locked: false }, // A beats C
      105: { kind: "H", locked: false }, // A beats D
      104: { kind: "H", locked: false }, // B beats D
      106: { kind: "H", locked: false }, // B beats C
      102: { kind: "H", locked: false }, // C beats D
    };
    const result = projectGroups(base, fixtures, outcomes, CHAINS.fifa);
    const qualified = result.qualified.get("GROUP_A")!;
    expect(qualified.map((t) => t.name)).toEqual(["A", "B"]);
  });

  it("skips knockout fixtures (stage set, not GROUP_STAGE/LEAGUE_STAGE, no group)", () => {
    const knockout: Fixture = {
      id: 999, matchday: 1, homeTeam: a, awayTeam: b,
      status: "SCHEDULED", homeGoals: null, awayGoals: null,
      utcDate: "x", stage: "LAST_16",
    };
    const result = projectGroups(base, [...fixtures, knockout], {}, CHAINS.fifa);
    expect(result.groupStandings.size).toBe(1);
    expect(result.groupStandings.get("GROUP_A")?.length).toBe(4);
  });

  it("treats LEAGUE_STAGE fixtures (UCL Swiss) as a single 'LEAGUE_PHASE' virtual group", () => {
    const swiss = [
      swissFixture(201, a, b),
      swissFixture(202, c, d),
      swissFixture(203, a, c),
      swissFixture(204, b, d),
    ];
    const result = projectGroups(base, swiss, {}, CHAINS.uefa);
    expect(result.groupStandings.size).toBe(1);
    expect(result.groupStandings.get("LEAGUE_PHASE")?.length).toBe(4);
  });
});
