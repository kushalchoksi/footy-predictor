import { describe, expect, it } from "vitest";
import { computePositionInfo } from "@/lib/positionBounds";
import type { Fixture, Standing, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function row(t: Team, pts: number, gd: number, gf: number, played = 36): Standing {
  return {
    team: t, position: 0, playedGames: played,
    won: 0, draw: 0, lost: 0,
    points: pts, goalsFor: gf, goalsAgainst: gf - gd, goalDifference: gd,
  };
}

function scheduled(id: number, home: Team, away: Team, matchday = 37): Fixture {
  return {
    id, matchday, homeTeam: home, awayTeam: away,
    status: "SCHEDULED", homeGoals: null, awayGoals: null,
    utcDate: "2026-05-19T15:00:00Z",
  };
}

function finished(id: number, home: Team, away: Team, hg: number, ag: number, matchday = 1): Fixture {
  return {
    id, matchday, homeTeam: home, awayTeam: away,
    status: "FINISHED", homeGoals: hg, awayGoals: ag,
    utcDate: "2025-08-15T15:00:00Z",
  };
}

describe("computePositionInfo — bounds", () => {
  it("a team with no possible overtaker has best=worst=1", () => {
    const a = team(1, "A");
    const b = team(2, "B");
    // A at 80 pts no remaining; B at 70 with 2 remaining (max 76)
    const standings = [row(a, 80, 0, 0, 38), row(b, 70, 0, 0, 36)];
    const fixtures = [scheduled(101, b, team(99, "X")), scheduled(102, b, team(98, "Y"))];
    const info = computePositionInfo(standings, fixtures, {});
    expect(info.bounds.get(1)).toEqual({ best: 1, worst: 1 });
    expect(info.bounds.get(2)).toEqual({ best: 2, worst: 2 });
  });

  it("two equal teams with no remaining and identical stats span both positions", () => {
    const a = team(1, "A");
    const b = team(2, "B");
    const standings = [row(a, 80, 5, 50, 38), row(b, 80, 5, 50, 38)];
    const info = computePositionInfo(standings, [], {});
    expect(info.bounds.get(1)).toEqual({ best: 1, worst: 2 });
    expect(info.bounds.get(2)).toEqual({ best: 1, worst: 2 });
    expect(info.competitorsOf.get(1)?.has(2)).toBe(true);
  });
});

describe("computePositionInfo — competitorsOf", () => {
  it("a team strictly above another by points is not a competitor", () => {
    // Chelsea 49 pts max 55; Tottenham 38 pts max 44 — never swap.
    const che = team(61, "Chelsea");
    const tot = team(73, "Tottenham");
    const standings = [row(che, 49, 6, 55), row(tot, 38, -9, 46)];
    const opp1 = team(91, "Opp1");
    const opp2 = team(92, "Opp2");
    const opp3 = team(93, "Opp3");
    const opp4 = team(94, "Opp4");
    const fixtures = [
      scheduled(1, che, opp1),
      scheduled(2, opp2, che),
      scheduled(3, tot, opp3),
      scheduled(4, opp4, tot),
    ];
    const info = computePositionInfo(standings, fixtures, {});
    expect(info.competitorsOf.get(61)?.has(73)).toBe(false);
    expect(info.competitorsOf.get(73)?.has(61)).toBe(false);
  });

  it("tied-points teams whose H2H favours one are not competitors", () => {
    // Leeds 44, Tottenham 38. Without tiebreakers they could swap; with H2H,
    // if Leeds beat Tottenham, Tottenham is definitely below Leeds.
    const leeds = team(341, "Leeds");
    const tot = team(73, "Tottenham");
    const baseStandings = [
      row(leeds, 44, -5, 48),
      row(tot, 38, -9, 46),
    ];
    const opp = team(99, "Opp");
    const fixtures = [
      // Remaining games for both, no meeting between them remaining
      scheduled(11, leeds, opp),
      scheduled(12, opp, leeds),
      scheduled(13, tot, opp),
      scheduled(14, opp, tot),
      // Completed H2H: Leeds beat Tottenham home (1-0) and drew away (1-1)
      // Leeds total H2H pts: 3 + 1 = 4. Tot: 0 + 1 = 1. Leeds wins H2H.
      finished(501, leeds, tot, 1, 0),
      finished(502, tot, leeds, 1, 1),
    ];
    const info = computePositionInfo(baseStandings, fixtures, {});
    expect(info.competitorsOf.get(341)?.has(73)).toBe(false);
    expect(info.competitorsOf.get(73)?.has(341)).toBe(false);
  });

  it("tied-points teams with even H2H ARE competitors (playoff would be needed)", () => {
    const leeds = team(341, "Leeds");
    const tot = team(73, "Tottenham");
    const baseStandings = [
      row(leeds, 44, -5, 48),
      row(tot, 38, -9, 46),
    ];
    const opp = team(99, "Opp");
    const fixtures = [
      scheduled(11, leeds, opp),
      scheduled(12, opp, leeds),
      scheduled(13, tot, opp),
      scheduled(14, opp, tot),
      // H2H is a wash: 1-1 both ways
      finished(501, leeds, tot, 1, 1),
      finished(502, tot, leeds, 1, 1),
    ];
    const info = computePositionInfo(baseStandings, fixtures, {});
    // Tottenham CAN finish above Leeds (would need a playoff) → they're competitors
    expect(info.competitorsOf.get(341)?.has(73)).toBe(true);
    expect(info.competitorsOf.get(73)?.has(341)).toBe(true);
  });

  it("teams whose remaining direct fixture gives Y H2H pts in the boundary scenario remain competitors", () => {
    const a = team(1, "A");
    const b = team(2, "B");
    const baseStandings = [row(a, 44, -5, 48), row(b, 38, -9, 46)];
    const opp = team(99, "Opp");
    const fixtures = [
      // A direct meeting between A and B is still to play. In the boundary
      // scenario, B wins that meeting and gains 3 H2H points.
      scheduled(11, a, b),
      scheduled(12, opp, b), // B's other remaining
      scheduled(13, a, opp), // A's other remaining
      // No prior completed H2H
    ];
    const info = computePositionInfo(baseStandings, fixtures, {});
    // B can potentially finish above A via the remaining direct win → still competitor
    expect(info.competitorsOf.get(1)?.has(2)).toBe(true);
  });

  it("Chelsea at 49 is not a competitor of Tottenham at 38 even with overlapping numeric position bounds", () => {
    // Regression: the previous "position-range overlap" logic falsely flagged
    // Chelsea as a Tottenham competitor because Chelsea worst=15 numerically
    // touched Tottenham best=14, even though Chelsea (49+) can never finish
    // below Tottenham (38, max 44).
    const teamsList = [
      team(57, "Arsenal"), team(65, "Man City"), team(66, "Man Utd"),
      team(64, "Liverpool"), team(58, "Aston Villa"), team(35, "Bournemouth"),
      team(397, "Brighton"), team(402, "Eighth"),
      team(61, "Chelsea"), team(62, "Everton"), team(63, "Fulham"),
      team(71, "Sunderland"), team(67, "Newcastle"), team(341, "Leeds"),
      team(354, "Palace"), team(351, "Forest"), team(73, "Tottenham"),
      team(563, "West Ham"), team(328, "Burnley"), team(76, "Wolves"),
    ];
    const pts = [79, 77, 65, 59, 59, 55, 53, 50, 49, 49, 48, 48, 46, 44, 44, 43, 38, 36, 25, 22];
    const gd  = [42, 43, 15, 12,  4,  4, 10,  3,  6,  0, -6, -9, -2, -5, -9, -2, -9, -20, -25, -30];
    const gf  = [68, 75, 63, 60, 50, 56, 52, 50, 55, 46, 44, 37, 50, 48, 38, 45, 46, 42, 30, 25];
    const standings = teamsList.map((t, i) => row(t, pts[i], gd[i], gf[i]));

    // Two remaining games each, vs filler opponents so no direct meetings.
    const filler = team(900, "Filler");
    const fixtures: Fixture[] = teamsList.flatMap((t, i) => [
      scheduled(1000 + i * 2, t, filler),
      scheduled(1001 + i * 2, filler, t),
    ]);
    standings.push(row(filler, 0, 0, 0, 0)); // filler with zero, doesn't matter

    const info = computePositionInfo(standings, fixtures, {});
    expect(info.competitorsOf.get(61)?.has(73)).toBe(false); // Chelsea-Tot
    expect(info.competitorsOf.get(62)?.has(73)).toBe(false); // Everton-Tot
    expect(info.competitorsOf.get(63)?.has(73)).toBe(false); // Fulham-Tot
    expect(info.competitorsOf.get(71)?.has(73)).toBe(false); // Sunderland-Tot
    expect(info.competitorsOf.get(67)?.has(73)).toBe(false); // Newcastle-Tot
  });
});
