import { describe, expect, it } from "vitest";
import { simulateTournament } from "@/lib/tournament/simulate";
import { projectTournament } from "@/lib/tournament/projection";
import { getCompetition } from "@/lib/competitions";
import { mulberry32 } from "@/lib/rng";
import type { Fixture, OutcomeMap, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

/** A full Euro group stage: 6 groups of 4, every pairing scheduled, no results yet. */
function euroGroupFixtures(): Fixture[] {
  const fixtures: Fixture[] = [];
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
      fid++;
    }
  });
  return fixtures;
}

function championsOf(outcomes: OutcomeMap, bracketChoices: Record<string, number>): number[] {
  const ec = getCompetition("EC")!;
  const proj = projectTournament(ec, [], euroGroupFixtures(), outcomes, bracketChoices);
  return [...proj.finishingPositions.entries()].filter(([, pos]) => pos === "Winner").map(([id]) => id);
}

describe("simulateTournament", () => {
  const ec = getCompetition("EC")!;

  it("scores every group fixture and crowns exactly one champion (scope=all)", () => {
    const fixtures = euroGroupFixtures();
    const { outcomes, bracketChoices } = simulateTournament(
      ec, [], fixtures, { outcomes: {} },
      { strategy: "random", scope: "all", overwrite: true, rng: mulberry32(42) },
    );

    // All 36 group matches get a result.
    expect(Object.keys(outcomes).length).toBe(36);
    // The bracket is resolved all the way to the final.
    expect(bracketChoices["F1"]).toBeDefined();
    expect(championsOf(outcomes, bracketChoices)).toHaveLength(1);
  });

  it("leaves the bracket untouched for scope=groups", () => {
    const fixtures = euroGroupFixtures();
    const { outcomes, bracketChoices } = simulateTournament(
      ec, [], fixtures, { outcomes: {} },
      { strategy: "market", scope: "groups", overwrite: true, rng: mulberry32(7) },
    );
    expect(Object.keys(outcomes).length).toBe(36);
    expect(Object.keys(bracketChoices)).toHaveLength(0);
  });

  it("'Simulate rest' (overwrite=false) keeps the user's existing picks", () => {
    const fixtures = euroGroupFixtures();
    // User has set one match (a 3-0) and locked another.
    const userPick = { kind: "H", locked: false, homeScore: 3, awayScore: 0 } as const;
    const lockedPick = { kind: "A", locked: true, homeScore: 0, awayScore: 2 } as const;
    const start: OutcomeMap = { 1: userPick, 2: lockedPick };

    const { outcomes } = simulateTournament(
      ec, [], fixtures, { outcomes: start },
      { strategy: "market", scope: "all", overwrite: false, rng: mulberry32(99) },
    );

    expect(outcomes[1]).toEqual(userPick);     // untouched
    expect(outcomes[2]).toEqual(lockedPick);   // locked, untouched
    expect(Object.keys(outcomes).length).toBe(36); // the rest got filled
  });

  it("market strategy also produces a complete, valid bracket", () => {
    const fixtures = euroGroupFixtures();
    const { outcomes, bracketChoices } = simulateTournament(
      ec, [], fixtures, { outcomes: {} },
      { strategy: "market", scope: "all", overwrite: true, rng: mulberry32(2024) },
    );
    expect(Object.keys(outcomes).length).toBe(36);
    expect(championsOf(outcomes, bracketChoices)).toHaveLength(1);
  });
});
