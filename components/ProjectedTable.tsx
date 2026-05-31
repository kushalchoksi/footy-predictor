"use client";

import type { Competition, Fixture, OutcomeMap, Standing, TeamId } from "@/types";
import TeamCrest from "@/components/TeamCrest";
import { projectStandings } from "@/lib/scenario";
import { sortByChain, CHAINS } from "@/lib/tiebreakers";
import { computeRanges } from "@/lib/ranges";
import { detectDecided, type DecidedFlags } from "@/lib/decided";
import { computePositionInfo } from "@/lib/positionBounds";
import { useMemo, useState } from "react";

interface Props {
  competition: Competition;
  base: Standing[];
  fixtures: Fixture[];
  outcomes: OutcomeMap;
  cluster: TeamId[];
  onClusterChange?: (cluster: TeamId[]) => void;
  /** Render only these team IDs (positions remain global). Useful for mini views. */
  filterTeamIds?: TeamId[];
}

const BAND_CLASSES: Array<{ test: (pos: number) => boolean; cls: string }> = [
  { test: (p) => p <= 4, cls: "border-l-emerald-500" },
  { test: (p) => p <= 6, cls: "border-l-sky-500" },
  { test: (p) => p === 7, cls: "border-l-teal-500" },
  { test: (p) => p >= 18, cls: "border-l-rose-600" },
  { test: () => true, cls: "border-l-transparent" },
];

function bandFor(pos: number): string {
  return BAND_CLASSES.find((b) => b.test(pos))!.cls;
}

export default function ProjectedTable({ competition, base, fixtures, outcomes, cluster, onClusterChange, filterTeamIds }: Props) {
  const clusterSet = useMemo(() => new Set(cluster), [cluster]);
  const filterSet = useMemo(() => filterTeamIds ? new Set(filterTeamIds) : null, [filterTeamIds]);
  const [hoverTeamId, setHoverTeamId] = useState<TeamId | null>(null);

  const projected = useMemo(() => projectStandings(base, fixtures, outcomes), [base, fixtures, outcomes]);
  const sorted = useMemo(
    () => sortByChain(projected.standings, projected.h2h, CHAINS[competition.tiebreaker]),
    [projected, competition],
  );

  const ranges = useMemo(() => {
    const map = new Map<TeamId, number>();
    for (const s of projected.standings) map.set(s.team.id, s.points);
    return computeRanges(map, fixtures.filter((f) => f.status === "SCHEDULED"), outcomes);
  }, [projected.standings, fixtures, outcomes]);

  const decided = useMemo(() => detectDecided(ranges, { relegationCut: 17, top4Cut: 4 }), [ranges]);

  const positionInfo = useMemo(() => {
    if (!onClusterChange || cluster.length > 0) return null;
    return computePositionInfo(base, fixtures, outcomes);
  }, [base, fixtures, outcomes, onClusterChange, cluster.length]);

  // Compute the hover band: hovered team + all its competitors
  const hoverBandIds = useMemo<Set<TeamId>>(() => {
    if (!hoverTeamId || !positionInfo) return new Set();
    const competitors = positionInfo.competitorsOf.get(hoverTeamId) ?? new Set<TeamId>();
    return new Set([hoverTeamId, ...competitors]);
  }, [hoverTeamId, positionInfo]);

  const rows = sorted.sorted;

  // Interactive mode: onClusterChange provided and no cluster committed yet
  const interactive = !!onClusterChange && cluster.length === 0;

  function handleRowEnter(teamId: TeamId) {
    if (!interactive) return;
    setHoverTeamId(teamId);
  }

  function handleRowLeave() {
    if (!interactive) return;
    setHoverTeamId(null);
  }

  function handleRowClick(teamId: TeamId) {
    if (!interactive || !onClusterChange) return;
    if (hoverBandIds.size > 0) {
      onClusterChange([...hoverBandIds]);
    } else {
      onClusterChange([teamId]);
    }
  }

  return (
    <div className="relative overflow-x-auto rounded border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Team</th>
            <th className="px-2 py-2 text-right">P</th>
            <th className="px-2 py-2 text-right">W</th>
            <th className="px-2 py-2 text-right">D</th>
            <th className="px-2 py-2 text-right">L</th>
            <th className="px-2 py-2 text-right">GF</th>
            <th className="px-2 py-2 text-right">GA</th>
            <th className="px-2 py-2 text-right">GD</th>
            <th className="px-2 py-2 text-right">Pts</th>
            <th className="px-2 py-2 text-right">Range</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pos = i + 1;
            if (filterSet && !filterSet.has(row.team.id)) return null;
            const inCluster = clusterSet.has(row.team.id);
            const inHoverBand = hoverBandIds.has(row.team.id);
            const range = ranges.get(row.team.id);
            const flags = decided.get(row.team.id);
            const isHovered = row.team.id === hoverTeamId;

            // Determine row styling
            let rowBg = "";
            let leftBorderCls = bandFor(pos);

            if (inHoverBand) {
              rowBg = " bg-emerald-100 dark:bg-emerald-950/30";
              leftBorderCls = "border-l-emerald-400";
            } else if (inCluster) {
              rowBg = " bg-surface-2/60";
            }

            return (
              <tr
                key={row.team.id}
                className={
                  "border-t border-l-4 border-border " +
                  leftBorderCls +
                  rowBg +
                  (isHovered && interactive ? " cursor-pointer" : "")
                }
                onMouseEnter={() => handleRowEnter(row.team.id)}
                onMouseLeave={handleRowLeave}
                onClick={() => handleRowClick(row.team.id)}
              >
                <td className="px-2 py-2 text-muted">{pos}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <TeamCrest team={row.team} size={18} />
                    <span className="truncate">{row.team.shortName}</span>
                    <DecidedBadges flags={flags} />
                  </div>
                </td>
                <td className="px-2 py-2 text-right">{row.playedGames}</td>
                <td className="px-2 py-2 text-right">{row.won}</td>
                <td className="px-2 py-2 text-right">{row.draw}</td>
                <td className="px-2 py-2 text-right">{row.lost}</td>
                <td className="px-2 py-2 text-right">{row.goalsFor}</td>
                <td className="px-2 py-2 text-right">{row.goalsAgainst}</td>
                <td className="px-2 py-2 text-right">{row.goalDifference}</td>
                <td className="px-2 py-2 text-right font-semibold">{row.points}</td>
                <td className="px-2 py-2 text-right text-xs text-faint">
                  {range && range.min !== range.max ? `${range.min}–${range.max}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sorted.playoffsFlagged.size > 0 && (
        <div className="border-t border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-200">
          Playoff required to break a tie: {[...sorted.playoffsFlagged].join(", ")}
        </div>
      )}
    </div>
  );
}

function DecidedBadges({ flags }: { flags: DecidedFlags | undefined }) {
  if (!flags) return null;
  const badges: string[] = [];
  if (flags.alreadyChampions) badges.push("Champions");
  if (flags.relegated) badges.push("Relegated");
  if (flags.mathematicallySafe && !flags.alreadyChampions) badges.push("Safe");
  if (flags.cannotFinishTop4 && !flags.alreadyChampions && !flags.relegated) badges.push("No top 4");
  if (badges.length === 0) return null;
  return (
    <span className="ml-1 flex gap-1">
      {badges.map((b) => (
        <span key={b} className="rounded-full bg-surface-3 px-2 text-[10px] uppercase tracking-wider text-fg">
          {b}
        </span>
      ))}
    </span>
  );
}
