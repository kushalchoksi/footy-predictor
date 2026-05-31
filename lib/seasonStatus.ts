import type { Fixture } from "@/types";

/**
 * A season is complete when it has fixtures and every one of them has finished —
 * i.e. there is nothing left to play (or pick). An empty fixture list means the
 * season hasn't been published yet, which is not "complete".
 */
export function isSeasonComplete(fixtures: Fixture[]): boolean {
  return fixtures.length > 0 && fixtures.every((f) => f.status === "FINISHED");
}

/**
 * Cheap completion check from the one-request /competitions metadata, used for the
 * home grid where fetching every competition's fixtures would exhaust the API rate
 * limit. A season counts as complete when it has a recorded winner or its end date
 * has passed. The per-competition page still uses the precise fixture-based check.
 */
export function isSeasonCompleteFromMeta(
  meta: { seasonEndDate: string | null; hasWinner: boolean },
  now: Date,
): boolean {
  if (meta.hasWinner) return true;
  if (meta.seasonEndDate) return new Date(meta.seasonEndDate).getTime() < now.getTime();
  return false;
}
