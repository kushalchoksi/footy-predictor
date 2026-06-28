import { describe, expect, it } from "vitest";
import { buildBracket, finishedWinnerId, resolveBracket } from "@/lib/tournament/bracket";
import type { BracketTemplate, Fixture, Team } from "@/types";

function team(id: number, name: string): Team {
  return { id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: "" };
}

function finished(id: number, home: Team, away: Team, hg: number, ag: number, extra: Partial<Fixture> = {}): Fixture {
  return {
    id, matchday: 1, homeTeam: home, awayTeam: away, status: "FINISHED",
    homeGoals: hg, awayGoals: ag, utcDate: "x", stage: "LAST_16", ...extra,
  };
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

describe("finishedWinnerId", () => {
  const a = team(1, "A"), b = team(2, "B");

  it("returns the higher scorer of a finished match", () => {
    expect(finishedWinnerId(finished(1, a, b, 2, 1))).toBe(a.id);
    expect(finishedWinnerId(finished(1, a, b, 0, 3))).toBe(b.id);
  });

  it("breaks a drawn knockout tie by the penalty shoot-out score", () => {
    expect(finishedWinnerId(finished(1, a, b, 1, 1, { homePenalties: 4, awayPenalties: 5 }))).toBe(b.id);
    expect(finishedWinnerId(finished(1, a, b, 0, 0, { homePenalties: 3, awayPenalties: 1 }))).toBe(a.id);
  });

  it("is undefined when the match is unfinished or undecided", () => {
    const scheduled: Fixture = { ...finished(1, a, b, 0, 0), status: "SCHEDULED", homeGoals: null, awayGoals: null };
    expect(finishedWinnerId(scheduled)).toBeUndefined();
    // Drawn with no shoot-out data → winner can't be determined.
    expect(finishedWinnerId(finished(1, a, b, 1, 1))).toBeUndefined();
  });
});

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

  it("locks a tie to a real finished result and advances the actual winner over a user pick", () => {
    const a = team(1, "A"), b = team(2, "B");
    // Seed R16-1 = A vs B, as the projection does after seeding the first round.
    const ties = buildBracket(template, []).map((t) =>
      t.id === "R16-1" ? { ...t, homeTeam: a, awayTeam: b } : t,
    );
    // The real match finished with B winning — note the API's home/away order is
    // swapped versus the bracket layout, so matching must be order-independent.
    const result = finished(50, b, a, 2, 0, { stage: "LAST_16" });
    // The user wrongly tries to pick A; the real result must win.
    const resolved = resolveBracket(ties, { "R16-1": a.id }, [result]);

    const r16 = resolved.find((t) => t.id === "R16-1")!;
    expect(r16.fixtures.some((f) => f.status === "FINISHED")).toBe(true);
    const qf1 = resolved.find((t) => t.id === "QF1")!;
    expect(qf1.homeTeam?.id).toBe(b.id); // real winner advanced, not the user's pick
  });

  it("does not lock a tie when the finished result is from a different round", () => {
    const a = team(1, "A"), b = team(2, "B");
    const ties = buildBracket(template, []).map((t) =>
      t.id === "R16-1" ? { ...t, homeTeam: a, awayTeam: b } : t,
    );
    // Same pairing, but the finished fixture is a QUARTER_FINAL — must NOT match the R16 tie.
    const result = finished(51, a, b, 3, 0, { stage: "QUARTER_FINALS" });
    const resolved = resolveBracket(ties, {}, [result]);
    const r16 = resolved.find((t) => t.id === "R16-1")!;
    expect(r16.fixtures.some((f) => f.status === "FINISHED")).toBe(false);
  });

  it("cascades real results across rounds: a finished QF locks once its R16 feeders are decided", () => {
    const a = team(1, "A"), b = team(2, "B"), c = team(3, "C"), d = team(4, "D");
    // Seed the two R16 ties that feed QF1.
    const ties = buildBracket(template, []).map((t) => {
      if (t.id === "R16-1") return { ...t, homeTeam: a, awayTeam: b };
      if (t.id === "R16-2") return { ...t, homeTeam: c, awayTeam: d };
      return t;
    });
    // Both R16 games are played (B and C win), AND the QF they feed is played (B wins).
    const finishedFixtures = [
      finished(60, a, b, 0, 1, { stage: "LAST_16" }),        // B beats A
      finished(61, c, d, 2, 0, { stage: "LAST_16" }),        // C beats D
      finished(62, b, c, 1, 1, { stage: "QUARTER_FINALS", homePenalties: 4, awayPenalties: 2 }), // B beats C on pens
    ];
    const resolved = resolveBracket(ties, {}, finishedFixtures);

    // The QF resolved to the real pairing (B vs C) and locked to the real winner...
    const qf1 = resolved.find((t) => t.id === "QF1")!;
    expect(qf1.homeTeam?.id).toBe(b.id);
    expect(qf1.awayTeam?.id).toBe(c.id);
    expect(qf1.fixtures.some((f) => f.status === "FINISHED")).toBe(true);
    // ...and B advances into the semi-final.
    const sf1 = resolved.find((t) => t.id === "SF1")!;
    expect(sf1.homeTeam?.id).toBe(b.id);
  });
});
