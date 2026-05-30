import { describe, expect, it } from "vitest";
import { projectTournament } from "@/lib/tournament/projection";
import { getCompetition } from "@/lib/competitions";
import type { Fixture, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

describe("projectTournament", () => {
  it("returns finishingPositions including 'Group stage' for non-qualifiers and 'R16' for qualifiers", () => {
    const ec = getCompetition("EC")!;
    const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
    const groupFixtures: Fixture[] = [
      { id: 1, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 2, matchday: 1, homeTeam: c, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 3, matchday: 1, homeTeam: a, awayTeam: c, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 4, matchday: 1, homeTeam: b, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 5, matchday: 1, homeTeam: a, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
      { id: 6, matchday: 1, homeTeam: b, awayTeam: c, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", group: "GROUP_A", stage: "GROUP_STAGE" },
    ];
    const outcomes = {
      1: { kind: "H" as const, locked: false }, 3: { kind: "H" as const, locked: false }, 5: { kind: "H" as const, locked: false },
      4: { kind: "H" as const, locked: false }, 6: { kind: "H" as const, locked: false }, 2: { kind: "H" as const, locked: false },
    };
    const result = projectTournament(ec, [], groupFixtures, outcomes, {});
    expect(result.finishingPositions.get(1)).toBe("R16");
    expect(result.finishingPositions.get(2)).toBe("R16");
    expect(result.finishingPositions.get(3)).toBe("Group stage");
    expect(result.finishingPositions.get(4)).toBe("Group stage");
  });

  it("updates winner's finishingPosition to 'Winner' and runner-up's to 'Runner-up' when FINAL choice is set", () => {
    const ec = getCompetition("EC")!;
    const a = team(1, "A"), b = team(2, "B");
    // Just enough knockout data to create a Final tie with both teams.
    const finalFix: Fixture = {
      id: 99, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED",
      homeGoals: null, awayGoals: null, utcDate: "x", stage: "FINAL",
    };
    const result = projectTournament(ec, [], [finalFix], {}, { "F1": 1 });
    expect(result.finishingPositions.get(1)).toBe("Winner");
    expect(result.finishingPositions.get(2)).toBe("Runner-up");
  });

  it("returns the bracket as built when the competition has a template", () => {
    const ec = getCompetition("EC")!;
    const result = projectTournament(ec, [], [], {}, {});
    // EC template has 8+4+2+1 = 15 ties (R16, QF, SF, FINAL)
    expect(result.bracket.length).toBe(15);
  });
});
