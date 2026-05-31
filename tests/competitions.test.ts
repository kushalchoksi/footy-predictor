import { describe, expect, it } from "vitest";
import { COMPETITIONS, getCompetition } from "@/lib/competitions";
import { CHAINS } from "@/lib/tiebreakers/chains";

describe("competition registry", () => {
  it("contains at least the EPL entry", () => {
    expect(COMPETITIONS.find((c) => c.code === "PL")).toBeDefined();
  });

  it("getCompetition returns the entry by code", () => {
    expect(getCompetition("PL")?.name).toBe("Premier League");
    expect(getCompetition("ZZ")).toBeUndefined();
  });

  it("every chain id referenced resolves in CHAINS", () => {
    for (const comp of COMPETITIONS) {
      expect(CHAINS[comp.tiebreaker]).toBeDefined();
    }
  });

  it("league entries have qualification bands; tournament entries have groupCount", () => {
    for (const comp of COMPETITIONS) {
      if (comp.format === "league") expect(comp.bands).toBeDefined();
      else expect(comp.groupCount).toBeDefined();
    }
  });

  it("codes are unique", () => {
    const codes = COMPETITIONS.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
