import { describe, expect, it } from "vitest";
import { projectStandings } from "@/lib/scenario";
import type { Standing, Fixture, OutcomeMap, Team } from "@/types";
import { pairKey } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function baseStanding(t: Team, pts: number, gf: number, ga: number): Standing {
  return {
    team: t, position: 0, playedGames: 36,
    won: 0, draw: 0, lost: 0,
    points: pts, goalsFor: gf, goalsAgainst: ga, goalDifference: gf - ga,
  };
}

function fixture(id: number, home: Team, away: Team, matchday: number): Fixture {
  return {
    id, matchday, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-05-19T15:00:00Z",
  };
}

describe("projectStandings", () => {
  const arsenal = team(57, "Arsenal");
  const city = team(65, "Man City");
  const spurs = team(73, "Spurs");

  const base: Standing[] = [
    baseStanding(arsenal, 80, 80, 30),
    baseStanding(city, 82, 90, 35),
    baseStanding(spurs, 60, 70, 50),
  ];

  it("home win adds 3 pts to home, +1 GF home, +1 GA away", () => {
    const fix = [fixture(1, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 1: { kind: "H", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);

    const ars = standings.find((s) => s.team.id === 57)!;
    const mci = standings.find((s) => s.team.id === 65)!;

    expect(ars.points).toBe(83);
    expect(ars.won).toBe(1);
    expect(ars.goalsFor).toBe(81);
    expect(ars.playedGames).toBe(37);
    expect(mci.points).toBe(82);
    expect(mci.lost).toBe(1);
    expect(mci.goalsAgainst).toBe(36);
    expect(mci.playedGames).toBe(37);
  });

  it("draw adds 1 pt each, no goals changes", () => {
    const fix = [fixture(2, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 2: { kind: "D", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);
    expect(standings.find((s) => s.team.id === 57)!.points).toBe(81);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(83);
  });

  it("away win adds 3 to away", () => {
    const fix = [fixture(3, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 3: { kind: "A", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(85);
    expect(standings.find((s) => s.team.id === 57)!.lost).toBe(1);
  });

  it("unset outcome leaves both teams unchanged", () => {
    const fix = [fixture(4, arsenal, city, 37)];
    const { standings } = projectStandings(base, fix, {});
    expect(standings.find((s) => s.team.id === 57)!.points).toBe(80);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(82);
  });

  it("records H2H from a projected match", () => {
    const fix = [fixture(5, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 5: { kind: "A", locked: false } };
    const { h2h } = projectStandings(base, fix, outcomes);
    const entry = h2h[pairKey(57, 65)];
    expect(entry).toBeDefined();
    expect(entry.lowPts).toBe(0); // arsenal (low id) lost
    expect(entry.highPts).toBe(3);
  });

  it("ignores fixtures that don't involve any cluster team", () => {
    const fix = [fixture(6, arsenal, spurs, 37)];
    const outcomes: OutcomeMap = { 6: { kind: "H", locked: false } };
    const { standings } = projectStandings(base, fix, outcomes);
    expect(standings.find((s) => s.team.id === 65)!.points).toBe(82); // unchanged
  });

  it("uses explicit scoreline for GF/GA when provided", () => {
    const fix = [fixture(7, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 7: { kind: "H", locked: false, homeScore: 3, awayScore: 1 } };
    const { standings } = projectStandings(base, fix, outcomes);
    const ars = standings.find((s) => s.team.id === 57)!;
    const mci = standings.find((s) => s.team.id === 65)!;
    expect(ars.goalsFor).toBe(83);     // 80 + 3
    expect(ars.goalsAgainst).toBe(31); // 30 + 1
    expect(ars.points).toBe(83);       // win = 3 pts
    expect(mci.goalsFor).toBe(91);     // 90 + 1
    expect(mci.goalsAgainst).toBe(38); // 35 + 3 (City conceded Arsenal's homeScore=3)
  });

  it("records explicit goals in H2H map", () => {
    const fix = [fixture(8, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 8: { kind: "A", locked: false, homeScore: 0, awayScore: 2 } };
    const { h2h } = projectStandings(base, fix, outcomes);
    const entry = h2h[pairKey(57, 65)];
    expect(entry).toBeDefined();
    // Arsenal is the lower-id team; lost 0-2. So lowGoals=0, highGoals=2.
    expect(entry.lowGoals).toBe(0);
    expect(entry.highGoals).toBe(2);
    expect(entry.lowPts).toBe(0);
    expect(entry.highPts).toBe(3);
  });

  it("ignores contradictory scoreline and falls back to +1 model", () => {
    // kind=A says away wins but score 2-1 says home wins. Trust kind, ignore scoreline.
    const fix = [fixture(9, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 9: { kind: "A", locked: false, homeScore: 2, awayScore: 1 } };
    const { standings } = projectStandings(base, fix, outcomes);
    const mci = standings.find((s) => s.team.id === 65)!;
    // Falls back to +1 model: away win gives +1 GF to away, +1 GA to home.
    expect(mci.goalsFor).toBe(91);
    expect(mci.points).toBe(85);
  });

  it("draw scoreline still applies actual goals", () => {
    const fix = [fixture(10, arsenal, city, 37)];
    const outcomes: OutcomeMap = { 10: { kind: "D", locked: false, homeScore: 2, awayScore: 2 } };
    const { standings } = projectStandings(base, fix, outcomes);
    const ars = standings.find((s) => s.team.id === 57)!;
    const mci = standings.find((s) => s.team.id === 65)!;
    expect(ars.goalsFor).toBe(82);
    expect(ars.goalsAgainst).toBe(32);
    expect(ars.points).toBe(81); // draw = 1 pt
    expect(mci.goalsFor).toBe(92);
    expect(mci.goalsAgainst).toBe(37);
  });
});
