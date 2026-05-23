import { describe, expect, it } from "vitest";
import { encodeScenario, decodeScenario } from "@/lib/urlState";
import type { Scenario } from "@/types";

describe("urlState", () => {
  it("round-trips an empty scenario", () => {
    const s: Scenario = { cluster: [], outcomes: {} };
    const encoded = encodeScenario(s);
    expect(encoded).toBe("");
    expect(decodeScenario(encoded)).toEqual(s);
  });

  it("encodes cluster as sorted CSV", () => {
    const s: Scenario = { cluster: [65, 57, 73], outcomes: {} };
    expect(encodeScenario(s)).toBe("c=57,65,73");
  });

  it("encodes outcomes as fixId:outcome list", () => {
    const s: Scenario = {
      cluster: [57],
      outcomes: {
        438101: { kind: "H", locked: false },
        438102: { kind: "A", locked: true },
        438103: { kind: "D", locked: false },
      },
    };
    const enc = encodeScenario(s);
    expect(enc).toContain("c=57");
    expect(enc).toContain("o=438101:H,438102:LA,438103:D");
  });

  it("decodes a locked outcome", () => {
    const s = decodeScenario("c=57&o=438101:LH");
    expect(s.cluster).toEqual([57]);
    expect(s.outcomes[438101]).toEqual({ kind: "H", locked: true });
  });

  it("ignores malformed outcome entries", () => {
    const s = decodeScenario("c=57&o=438101:H,bogus,438102:Z");
    expect(s.outcomes[438101]).toEqual({ kind: "H", locked: false });
    expect(s.outcomes[438102]).toBeUndefined();
  });

  it("encodes scoreline when both homeScore and awayScore are set", () => {
    const s: Scenario = {
      cluster: [],
      outcomes: { 100: { kind: "H", locked: false, homeScore: 3, awayScore: 1 } },
    };
    expect(encodeScenario(s)).toBe("o=100:H-3-1");
  });

  it("encodes locked scoreline", () => {
    const s: Scenario = {
      cluster: [],
      outcomes: { 100: { kind: "A", locked: true, homeScore: 0, awayScore: 2 } },
    };
    expect(encodeScenario(s)).toBe("o=100:LA-0-2");
  });

  it("decodes scoreline form", () => {
    const s = decodeScenario("o=100:H-3-1,101:LD-2-2");
    expect(s.outcomes[100]).toEqual({ kind: "H", locked: false, homeScore: 3, awayScore: 1 });
    expect(s.outcomes[101]).toEqual({ kind: "D", locked: true, homeScore: 2, awayScore: 2 });
  });

  it("backward-compat: decodes old form without scoreline", () => {
    const s = decodeScenario("o=100:H,101:LA");
    expect(s.outcomes[100]).toEqual({ kind: "H", locked: false });
    expect(s.outcomes[101]).toEqual({ kind: "A", locked: true });
    expect(s.outcomes[100].homeScore).toBeUndefined();
  });

  it("ignores malformed score suffix", () => {
    const s = decodeScenario("o=100:H-abc-def,101:H-2");
    // 100 has invalid scores → strip them but keep kind
    expect(s.outcomes[100]).toEqual({ kind: "H", locked: false });
    // 101 has only one number — also malformed, strip scores
    expect(s.outcomes[101]).toEqual({ kind: "H", locked: false });
  });
});
