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
});
