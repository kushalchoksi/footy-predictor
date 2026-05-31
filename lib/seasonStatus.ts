import type { Fixture } from "@/types";

/**
 * A season is complete when it has fixtures and every one of them has finished —
 * i.e. there is nothing left to play (or pick). An empty fixture list means the
 * season hasn't been published yet, which is not "complete".
 */
export function isSeasonComplete(fixtures: Fixture[]): boolean {
  return fixtures.length > 0 && fixtures.every((f) => f.status === "FINISHED");
}

export interface SeasonProgress {
  played: number;
  total: number;
  /** True once at least half the season's matches have been played. */
  unlocked: boolean;
}

/**
 * Prediction is pointless until a league is at least halfway done — before then
 * almost anything is still possible and the projection is noise. This reports the
 * match counts and whether predictions should be unlocked (more than half the
 * matches still to play ⇒ locked).
 */
export function seasonProgress(fixtures: Fixture[]): SeasonProgress {
  const total = fixtures.length;
  const remaining = fixtures.filter((f) => f.status === "SCHEDULED").length;
  const played = total - remaining;
  // Unlocked when half or more is played, i.e. remaining is not more than half.
  const unlocked = total > 0 && remaining * 2 <= total;
  return { played, total, unlocked };
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
