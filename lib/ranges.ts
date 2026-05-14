import type { Fixture, OutcomeMap, TeamId } from "@/types";

export interface PointsRange {
  min: number;
  max: number;
}

export function computeRanges(
  basePoints: Map<TeamId, number>,
  fixtures: Fixture[],
  outcomes: OutcomeMap,
): Map<TeamId, PointsRange> {
  const out = new Map<TeamId, PointsRange>();
  for (const [id, pts] of basePoints) {
    out.set(id, { min: pts, max: pts });
  }

  for (const fix of fixtures) {
    const outcome = outcomes[fix.id];
    const homeRange = out.get(fix.homeTeam.id);
    const awayRange = out.get(fix.awayTeam.id);

    if (outcome?.locked) {
      if (homeRange) {
        const delta = pointsForOutcome(outcome.kind, "home");
        homeRange.min += delta;
        homeRange.max += delta;
      }
      if (awayRange) {
        const delta = pointsForOutcome(outcome.kind, "away");
        awayRange.min += delta;
        awayRange.max += delta;
      }
    } else {
      if (homeRange) homeRange.max += 3;
      if (awayRange) awayRange.max += 3;
    }
  }

  return out;
}

function pointsForOutcome(kind: "H" | "D" | "A", side: "home" | "away"): number {
  if (kind === "D") return 1;
  if (side === "home") return kind === "H" ? 3 : 0;
  return kind === "A" ? 3 : 0;
}
