import type { Fixture } from "@/types";

/**
 * A season is complete when it has fixtures and every one of them has finished —
 * i.e. there is nothing left to play (or pick). An empty fixture list means the
 * season hasn't been published yet, which is not "complete".
 */
export function isSeasonComplete(fixtures: Fixture[]): boolean {
  return fixtures.length > 0 && fixtures.every((f) => f.status === "FINISHED");
}
