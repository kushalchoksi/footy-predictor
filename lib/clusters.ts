import type { Standing, TeamId } from "@/types";

export type ClusterKind = "title" | "ucl" | "uel" | "relegation";

export interface Cluster {
  kind: ClusterKind;
  label: string;
  prizeLabel: string;
  teamIds: TeamId[];
}

const TOP4_CUT = 4;
const UEL_END = 7;
const RELEGATION_CUT = 17;

export function suggestClusters(standings: Standing[], totalMatches: number): Cluster[] {
  const ordered = [...standings].sort((a, b) => b.points - a.points);
  if (ordered.length === 0) return [];

  const maxRemaining = (s: Standing) => (totalMatches - s.playedGames) * 3;
  const leader = ordered[0];

  const title = ordered.filter((s) => s === leader || s.points + maxRemaining(s) >= leader.points);
  const ucl = takeRaceFor(ordered, TOP4_CUT, maxRemaining);
  const uel = takeRaceForBand(ordered, TOP4_CUT + 1, UEL_END, maxRemaining);
  const reln = takeRelegation(ordered, maxRemaining);

  return [
    { kind: "title", label: "Title race", prizeLabel: "1st place — Premier League title", teamIds: title.map((s) => s.team.id) },
    { kind: "ucl", label: "Champions League race", prizeLabel: "Top 4 — UCL qualification", teamIds: ucl.map((s) => s.team.id) },
    { kind: "uel", label: "Europa / Conference race", prizeLabel: "5th–7th — UEL/UECL spots", teamIds: uel.map((s) => s.team.id) },
    { kind: "relegation", label: "Relegation battle", prizeLabel: "17th — final safe position", teamIds: reln.map((s) => s.team.id) },
  ];
}

function takeRaceFor(ordered: Standing[], cut: number, maxRem: (s: Standing) => number): Standing[] {
  const cutTeam = ordered[cut - 1];
  if (!cutTeam) return [...ordered];
  const cutPts = cutTeam.points;
  return ordered.filter((s, idx) => {
    if (idx < cut) return true;
    return s.points + maxRem(s) >= cutPts;
  });
}

function takeRaceForBand(ordered: Standing[], startPos: number, endPos: number, maxRem: (s: Standing) => number): Standing[] {
  const band = ordered.slice(startPos - 1, endPos);
  if (band.length === 0) return [];
  const minPts = Math.min(...band.map((s) => s.points));
  const maxPtsAtBest = Math.max(...band.map((s) => s.points + maxRem(s)));
  return ordered.filter((s) => s.points + maxRem(s) >= minPts && s.points <= maxPtsAtBest);
}

function takeRelegation(ordered: Standing[], maxRem: (s: Standing) => number): Standing[] {
  const safeTeam = ordered[RELEGATION_CUT - 1];
  if (!safeTeam) return ordered.slice(-3);
  const safeCeiling = safeTeam.points + maxRem(safeTeam);
  return ordered.filter((s, idx) => {
    if (idx >= RELEGATION_CUT - 1) return true; // 17th onwards
    return s.points + maxRem(s) <= safeCeiling; // can still be caught from above
  });
}
