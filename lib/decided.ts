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

    // Best-case position: only teams guaranteed above me even in my best case
    // (their worst-case points still strictly beat my best-case points).
    const guaranteedAbove = others.filter((o) => o.min > me.max).length;
    const bestPosition = guaranteedAbove + 1;

    // Worst-case position: every team that could still finish level or above me
    // (their best-case points reach my worst-case points). Ties counted as above
    // since we don't resolve tiebreakers here — keeps "safe" claims conservative.
    const possiblyAbove = others.filter((o) => o.max >= me.min).length;
    const worstPosition = possiblyAbove + 1;

    const alreadyChampions = others.every((o) => o.max < me.min);
    // Certain to miss the top-N cut: even my best case lands below it.
    const cannotFinishTop4 = bestPosition > opts.top4Cut;
    // Certain to stay up: even my worst case lands above the relegation cut.
    const mathematicallySafe = worstPosition <= effectiveCut;
    // Certain to go down: even my best case lands below the relegation cut.
    const relegated = bestPosition > effectiveCut;

    out.set(id, { alreadyChampions, cannotFinishTop4, mathematicallySafe, relegated });
  }

  return out;
}
