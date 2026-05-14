import type { TeamId } from "@/types";
import type { PointsRange } from "@/lib/ranges";

export interface DecidedFlags {
  alreadyChampions: boolean;
  cannotFinishTop4: boolean;
  mathematicallySafe: boolean;
  relegated: boolean;
}

export interface DecidedOptions {
  /** Number of teams that finish above the relegation cut, e.g. 17 means positions 1..17 are safe in a 20-team league. */
  relegationCut: number;
  /** Top-N qualification cut; 4 for UCL. */
  top4Cut: number;
}

export function detectDecided(
  ranges: Map<TeamId, PointsRange>,
  opts: DecidedOptions,
): Map<TeamId, DecidedFlags> {
  const ids = [...ranges.keys()];
  const n = ids.length;
  // Cap the cut so it is meaningful within the given cohort size (n - 1 max safe spots).
  const effectiveCut = Math.min(opts.relegationCut, n - 1);
  const out = new Map<TeamId, DecidedFlags>();

  for (const id of ids) {
    const me = ranges.get(id)!;
    const others = ids.filter((x) => x !== id).map((x) => ranges.get(x)!);

    const alreadyChampions = others.every((o) => o.max < me.min);

    const teamsThatBeatMyMax = others.filter((o) => o.min > me.max).length;
    const cannotFinishTop4 = teamsThatBeatMyMax >= opts.top4Cut;

    // worst-case position: how many teams must finish above me even at their minimum?
    const teamsAboveAtWorst = others.filter((o) => o.min > me.max).length;
    const worstPosition = teamsAboveAtWorst + 1;
    const mathematicallySafe = worstPosition <= effectiveCut;

    // best-case position: total teams minus those that are definitively below me.
    const teamsBelowAtBest = others.filter((o) => o.max < me.min).length;
    const bestPosition = n - teamsBelowAtBest;
    const relegated = bestPosition > effectiveCut;

    out.set(id, { alreadyChampions, cannotFinishTop4, mathematicallySafe, relegated });
  }

  return out;
}
