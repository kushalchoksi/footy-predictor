"use client";

import Image from "next/image";
import type { Fixture, OutcomeMap, Standing, TeamId } from "@/types";
import { projectStandings } from "@/lib/scenario";
import { sortByEPL } from "@/lib/tiebreakers";
import { computeRanges } from "@/lib/ranges";
import { detectDecided, type DecidedFlags } from "@/lib/decided";
import { useMemo } from "react";

interface Props {
  base: Standing[];
  fixtures: Fixture[];
  outcomes: OutcomeMap;
  cluster: TeamId[];
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

export default function LiveTable({ base, fixtures, outcomes, cluster }: Props) {
  const clusterSet = useMemo(() => new Set(cluster), [cluster]);

  const projected = useMemo(() => projectStandings(base, fixtures, outcomes), [base, fixtures, outcomes]);

  const sorted = useMemo(() => sortByEPL(projected.standings, projected.h2h), [projected]);

  const ranges = useMemo(() => {
    const map = new Map<TeamId, number>();
    for (const s of projected.standings) map.set(s.team.id, s.points);
    return computeRanges(map, fixtures.filter((f) => f.status === "SCHEDULED"), outcomes);
  }, [projected.standings, fixtures, outcomes]);

  const decided = useMemo(() => detectDecided(ranges, { relegationCut: 17, top4Cut: 4 }), [ranges]);

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-400">
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
          {sorted.sorted.map((row, i) => {
            const pos = i + 1;
            const inCluster = clusterSet.has(row.team.id);
            const range = ranges.get(row.team.id);
            const flags = decided.get(row.team.id);
            return (
              <tr
                key={row.team.id}
                className={
                  "border-t border-l-4 border-zinc-900 " +
                  bandFor(pos) +
                  (inCluster ? " bg-zinc-900/60" : "")
                }
              >
                <td className="px-2 py-2 text-zinc-400">{pos}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {row.team.crest && (
                      <Image src={row.team.crest} alt="" width={18} height={18} unoptimized />
                    )}
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
                <td className="px-2 py-2 text-right text-xs text-zinc-500">
                  {range && range.min !== range.max ? `${range.min}–${range.max}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.playoffsFlagged.size > 0 && (
        <div className="border-t border-amber-700/40 bg-amber-950/20 p-2 text-xs text-amber-200">
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
        <span key={b} className="rounded-full bg-zinc-700 px-2 text-[10px] uppercase tracking-wider text-zinc-200">
          {b}
        </span>
      ))}
    </span>
  );
}
