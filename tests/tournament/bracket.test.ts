import { describe, expect, it } from "vitest";
import { buildBracket, resolveBracket } from "@/lib/tournament/bracket";
import type { BracketTemplate, Fixture, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

const template: BracketTemplate = {
  rounds: {
    LAST_16: [
      { id: "R16-1" }, { id: "R16-2" }, { id: "R16-3" }, { id: "R16-4" },
      { id: "R16-5" }, { id: "R16-6" }, { id: "R16-7" }, { id: "R16-8" },
    ],
    QUARTER_FINALS: [
      { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
      { id: "QF2", feederHome: "R16-3", feederAway: "R16-4" },
      { id: "QF3", feederHome: "R16-5", feederAway: "R16-6" },
      { id: "QF4", feederHome: "R16-7", feederAway: "R16-8" },
    ],
    SEMI_FINALS: [
      { id: "SF1", feederHome: "QF1", feederAway: "QF2" },
      { id: "SF2", feederHome: "QF3", feederAway: "QF4" },
    ],
    FINAL: [
      { id: "F1", feederHome: "SF1", feederAway: "SF2" },
    ],
  },
};

describe("buildBracket", () => {
  it("builds a tie per template round with empty fixtures and no resolved teams", () => {
    const ties = buildBracket(template, []);
    const ids = ties.map((t) => t.id);
    expect(ids).toContain("R16-1");
    expect(ids).toContain("QF1");
    expect(ids).toContain("F1");
    expect(ties.find((t) => t.id === "QF1")?.feederHome).toBe("R16-1");
  });

  it("attaches a fixture from the API to its matching tie by stage + index", () => {
    const a = team(1, "A"); const b = team(2, "B");
    const f: Fixture = {
      id: 999, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED",
      homeGoals: null, awayGoals: null, utcDate: "2026-07-01T00:00:00Z",
      stage: "LAST_16",
    };
    const ties = buildBracket(template, [f]);
    const r16_1 = ties.find((t) => t.id === "R16-1")!;
    expect(r16_1.fixtures.length).toBe(1);
    expect(r16_1.homeTeam?.id).toBe(1);
    expect(r16_1.awayTeam?.id).toBe(2);
  });
});

describe("resolveBracket", () => {
  it("fills feeder slots when user picks winners", () => {
    const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
    const r16_1: Fixture = { id: 1, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "2026-07-01T00:00:00Z", stage: "LAST_16" };
    const r16_2: Fixture = { id: 2, matchday: 1, homeTeam: c, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "2026-07-01T00:00:00Z", stage: "LAST_16" };
    const ties = buildBracket(template, [r16_1, r16_2]);
    const choices = { "R16-1": 1, "R16-2": 3 };
    const resolved = resolveBracket(ties, choices);
    const qf1 = resolved.find((t) => t.id === "QF1")!;
    expect(qf1.homeTeam?.id).toBe(1);
    expect(qf1.awayTeam?.id).toBe(3);
  });

  it("cascades winners through multiple rounds (R16 → QF → SF)", () => {
    const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
    const r16_1: Fixture = { id: 1, matchday: 1, homeTeam: a, awayTeam: b, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", stage: "LAST_16" };
    const r16_2: Fixture = { id: 2, matchday: 1, homeTeam: c, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", stage: "LAST_16" };
    const r16_3: Fixture = { id: 3, matchday: 1, homeTeam: a, awayTeam: c, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", stage: "LAST_16" };
    const r16_4: Fixture = { id: 4, matchday: 1, homeTeam: b, awayTeam: d, status: "SCHEDULED", homeGoals: null, awayGoals: null, utcDate: "x", stage: "LAST_16" };
    const ties = buildBracket(template, [r16_1, r16_2, r16_3, r16_4]);
    const choices = { "R16-1": 1, "R16-2": 3, "R16-3": 1, "R16-4": 2, "QF1": 1, "QF2": 2 };
    const resolved = resolveBracket(ties, choices);
    const sf1 = resolved.find((t) => t.id === "SF1")!;
    expect(sf1.homeTeam?.id).toBe(1);
    expect(sf1.awayTeam?.id).toBe(2);
  });

  it("leaves later ties unresolved when feeder choice missing", () => {
    const ties = buildBracket(template, []);
    const resolved = resolveBracket(ties, {});
    const qf1 = resolved.find((t) => t.id === "QF1")!;
    expect(qf1.homeTeam).toBeUndefined();
    expect(qf1.awayTeam).toBeUndefined();
  });
});
