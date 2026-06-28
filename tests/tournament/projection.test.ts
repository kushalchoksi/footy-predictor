import { describe, expect, it } from "vitest";
import { projectTournament } from "@/lib/tournament/projection";
import { getCompetition } from "@/lib/competitions";
import type { Fixture, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

describe("projectTournament", () => {
  it("labels group qualifiers with the first knockout round and non-qualifiers 'Group stage'", () => {
    const ec = getCompetition("EC")!;
    // Six full groups of four — the real Euro shape, so the 16-slot bracket fills.
    // In every group the home side always wins, giving a clean 1 > 2 > 3 > 4 order
    // (team id `g*10 + rank`).
    const fixtures: Fixture[] = [];
    const outcomes: Record<number, { kind: "H"; locked: boolean }> = {};
    let fid = 1;
    ["A", "B", "C", "D", "E", "F"].forEach((L, gi) => {
      const base = gi * 10;
      const t = (r: number) => team(base + r, `${L}${r}`);
      const pairs: [number, number][] = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
      for (const [h, a] of pairs) {
        fixtures.push({
          id: fid, matchday: 1, homeTeam: t(h), awayTeam: t(a), status: "SCHEDULED",
          homeGoals: null, awayGoals: null, utcDate: "x", group: `GROUP_${L}`, stage: "GROUP_STAGE",
        });
        outcomes[fid] = { kind: "H", locked: false };
        fid++;
      }
    });
    const result = projectTournament(ec, [], fixtures, outcomes, {});

    // Group winners and runners-up always reach the Round of 16.
    expect(result.finishingPositions.get(1)).toBe("R16");   // Group A winner
    expect(result.finishingPositions.get(12)).toBe("R16");  // Group B runner-up
    // Bottom teams never qualify.
    expect(result.finishingPositions.get(4)).toBe("Group stage");
    // Only the 4 best third-placed teams (lowest id on equal record) qualify;
    // groups E and F thirds miss out.
    expect(result.finishingPositions.get(3)).toBe("R16");           // Group A third
    expect(result.finishingPositions.get(53)).toBe("Group stage");  // Group F third
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

  it("surfaces a finished knockout result: locks the tie and advances the real winner", () => {
    const ec = getCompetition("EC")!;
    // Six full groups (home always wins) so the 16-slot bracket seeds deterministically.
    const fixtures: Fixture[] = [];
    const outcomes: Record<number, { kind: "H"; locked: boolean }> = {};
    let fid = 1;
    ["A", "B", "C", "D", "E", "F"].forEach((L, gi) => {
      const base = gi * 10;
      const t = (r: number) => team(base + r, `${L}${r}`);
      const pairs: [number, number][] = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
      for (const [h, a] of pairs) {
        fixtures.push({
          id: fid, matchday: 1, homeTeam: t(h), awayTeam: t(a), status: "SCHEDULED",
          homeGoals: null, awayGoals: null, utcDate: "x", group: `GROUP_${L}`, stage: "GROUP_STAGE",
        });
        outcomes[fid] = { kind: "H", locked: false };
        fid++;
      }
    });

    // Discover a real seeded R16 pairing from a first projection (no finished games yet).
    const before = projectTournament(ec, [], fixtures, outcomes, {});
    const seeded = before.bracket.find((t) => t.stage === "LAST_16" && t.homeTeam && t.awayTeam)!;
    const home = seeded.homeTeam!, away = seeded.awayTeam!;

    // The real R16 match finished with the away side winning 1–0.
    const result: Fixture = {
      id: 9001, matchday: 1, homeTeam: home, awayTeam: away, status: "FINISHED",
      homeGoals: 0, awayGoals: 1, utcDate: "x", stage: "LAST_16",
    };
    const after = projectTournament(ec, [], [...fixtures, result], outcomes, {});

    const lockedTie = after.bracket.find((t) => t.id === seeded.id)!;
    expect(lockedTie.fixtures.some((f) => f.status === "FINISHED")).toBe(true);
    // The real winner is forced into the effective choices, regardless of user input.
    expect(after.bracketChoices[seeded.id]).toBe(away.id);
    // ...and finishing positions reflect the real result.
    expect(after.finishingPositions.get(away.id)).toBe("QF");
    expect(after.finishingPositions.get(home.id)).toBe("R16");
  });
});
