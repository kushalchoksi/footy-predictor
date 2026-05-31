import { describe, expect, it } from "vitest";
import { CHAINS } from "@/lib/tiebreakers/chains";
import { RULES } from "@/lib/tiebreakers/rules";
import type { TiebreakerChainId } from "@/types";

describe("CHAINS registry", () => {
  it("defines all 11 chains", () => {
    const expected: TiebreakerChainId[] = [
      "epl", "laLiga", "bundesliga", "serieA", "ligue1",
      "eredivisie", "primeira", "championship", "brasileirao",
      "uefa", "fifa",
    ];
    for (const id of expected) expect(CHAINS[id]).toBeDefined();
  });

  it("every rule id referenced exists in RULES", () => {
    for (const chain of Object.values(CHAINS)) {
      for (const ruleId of chain.rules) {
        expect(RULES[ruleId]).toBeDefined();
      }
    }
  });

  it("every chain starts with 'points'", () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.rules[0]).toBe("points");
    }
  });
});
