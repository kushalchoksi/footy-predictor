import type { Standing, TeamId } from "@/types";

export type ClusterKind = "title" | "ucl" | "uel" | "relegation";

export interface Cluster {
  kind: ClusterKind;
  label: string;
  prizeLabel: string;
  teamIds: TeamId[];
}

const TITLE_CUT = 1;
const UCL_CUT = 4;
const UEL_BAND = [5, 7] as const;
const SAFE_CUT = 17;

/**
 * Compute best and worst possible finishing positions for a team.
 *
 * best_position(me)  = 1 + count(teams whose min_pts > my max_pts)
 *   — those teams are definitely above me regardless of results
 *
 * worst_position(me) = N - count(teams whose max_pts < my min_pts)
 *   — those teams are definitely below me regardless of results
 */
function bounds(
  s: Standing,
  all: Standing[],
  totalMatches: number,
): { best: number; worst: number } {
  const myMin = s.points;
  const myMax = s.points + (totalMatches - s.playedGames) * 3;
  const N = all.length;

  let definitelyAbove = 0;
  let definitelyBelow = 0;
  for (const other of all) {
    if (other === s) continue;
    const otherMin = other.points;
    const otherMax = other.points + (totalMatches - other.playedGames) * 3;
    if (otherMin > myMax) definitelyAbove++;
    if (otherMax < myMin) definitelyBelow++;
  }

  return {
    best: 1 + definitelyAbove,
    worst: N - definitelyBelow,
  };
}

export function suggestClusters(standings: Standing[], totalMatches: number): Cluster[] {
  const ordered = [...standings].sort((a, b) => b.points - a.points);
  if (ordered.length === 0) return [];

  // Title race: best_position ≤ 1 AND worst_position > 1
  const title = ordered.filter((s) => {
    const { best, worst } = bounds(s, ordered, totalMatches);
    return best <= TITLE_CUT && worst > TITLE_CUT;
  });

  // UCL race (top 4): best_position ≤ 4 AND worst_position > 4
  const ucl = ordered.filter((s) => {
    const { best, worst } = bounds(s, ordered, totalMatches);
    return best <= UCL_CUT && worst > UCL_CUT;
  });

  // Europa/Conference band (5–7): best_position ≤ 7 AND worst_position ≥ 5
  const [uelStart, uelEnd] = UEL_BAND;
  const uel = ordered.filter((s) => {
    const { best, worst } = bounds(s, ordered, totalMatches);
    return best <= uelEnd && worst >= uelStart;
  });

  // Relegation race: worst_position > 17 AND best_position ≤ 17
  const reln = ordered.filter((s) => {
    const { best, worst } = bounds(s, ordered, totalMatches);
    return worst > SAFE_CUT && best <= SAFE_CUT;
  });

  return [
    { kind: "title", label: "Title race", prizeLabel: "1st place — Premier League title", teamIds: title.map((s) => s.team.id) },
    { kind: "ucl", label: "Champions League race", prizeLabel: "Top 4 — UCL qualification", teamIds: ucl.map((s) => s.team.id) },
    { kind: "uel", label: "Europa / Conference race", prizeLabel: "5th–7th — UEL/UECL spots", teamIds: uel.map((s) => s.team.id) },
    { kind: "relegation", label: "Relegation battle", prizeLabel: "17th — final safe position", teamIds: reln.map((s) => s.team.id) },
  ];
}
