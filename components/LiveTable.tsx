"use client";

import Image from "next/image";
import type { Fixture, OutcomeMap, Standing, TeamId } from "@/types";
import { projectStandings } from "@/lib/scenario";
import { sortByEPL } from "@/lib/tiebreakers";
import { computeRanges } from "@/lib/ranges";
import { computePositionInfo } from "@/lib/positionBounds";
import { detectDecided, type DecidedFlags } from "@/lib/decided";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";

interface Props {
  base: Standing[];
  fixtures: Fixture[];
  outcomes: OutcomeMap;
  cluster: TeamId[];
  onClusterChange: (cluster: TeamId[]) => void;
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

/** Find the row element ancestor with a data-pos attribute */
function findRowPos(el: Element | null): number | null {
  let cur = el;
  while (cur && cur.tagName !== "TABLE" && cur.tagName !== "BODY") {
    const v = (cur as HTMLElement).dataset?.pos;
    if (v !== undefined) return parseInt(v, 10);
    cur = cur.parentElement;
  }
  return null;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function LiveTable({ base, fixtures, outcomes, cluster, onClusterChange }: Props) {
  const clusterSet = useMemo(() => new Set(cluster), [cluster]);

  const projected = useMemo(() => projectStandings(base, fixtures, outcomes), [base, fixtures, outcomes]);
  const sorted = useMemo(() => sortByEPL(projected.standings, projected.h2h), [projected]);

  const ranges = useMemo(() => {
    const map = new Map<TeamId, number>();
    for (const s of projected.standings) map.set(s.team.id, s.points);
    return computeRanges(map, fixtures.filter((f) => f.status === "SCHEDULED"), outcomes);
  }, [projected.standings, fixtures, outcomes]);

  const decided = useMemo(() => detectDecided(ranges, { relegationCut: 17, top4Cut: 4 }), [ranges]);

  const rows = sorted.sorted;
  const totalRows = rows.length;

  const { bandTop, bandBottom } = useMemo(() => {
    if (cluster.length === 0) return { bandTop: -1, bandBottom: -1 };
    let top = totalRows + 1;
    let bottom = 0;
    rows.forEach((row, i) => {
      if (clusterSet.has(row.team.id)) {
        const pos = i + 1;
        if (pos < top) top = pos;
        if (pos > bottom) bottom = pos;
      }
    });
    return { bandTop: top, bandBottom: bottom };
  }, [cluster.length, clusterSet, rows, totalRows]);

  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [dragging, setDragging] = useState<"top" | "bottom" | null>(null);

  const positionInfo = useMemo(
    () => computePositionInfo(base, fixtures, outcomes),
    [base, fixtures, outcomes],
  );

  const competitorBand = useCallback(
    (pos: number): { top: number; bottom: number } => {
      if (pos < 1 || pos > totalRows) return { top: pos, bottom: pos };
      const hoveredId = rows[pos - 1].team.id;
      const competitors = positionInfo.competitorsOf.get(hoveredId);
      let top = pos;
      let bottom = pos;
      if (!competitors) return { top, bottom };
      for (let i = 0; i < rows.length; i++) {
        if (competitors.has(rows[i].team.id)) {
          const p = i + 1;
          if (p < top) top = p;
          if (p > bottom) bottom = p;
        }
      }
      return { top, bottom };
    },
    [rows, positionInfo, totalRows],
  );

  const getTeamIdsForRange = useCallback(
    (top: number, bottom: number): TeamId[] => {
      return rows
        .filter((_, i) => {
          const pos = i + 1;
          return pos >= top && pos <= bottom;
        })
        .map((r) => r.team.id);
    },
    [rows],
  );

  function handleRowClick(pos: number) {
    if (cluster.length === 0) {
      const { top, bottom } = competitorBand(pos);
      onClusterChange(getTeamIdsForRange(top, bottom));
    } else {
      if (pos >= bandTop && pos <= bandBottom) return;
      let newTop = bandTop;
      let newBottom = bandBottom;
      if (pos < bandTop) newTop = pos;
      else newBottom = pos;
      onClusterChange(getTeamIdsForRange(newTop, newBottom));
    }
  }

  // Refs for absolute-positioned handles.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement | null>>(new Map());
  const [handleY, setHandleY] = useState<{ top: number; bottom: number } | null>(null);

  const hasBand = cluster.length > 0 && bandTop > 0;

  // While a handle is being dragged: kill text-selection auto-scroll and
  // block wheel/touch scroll so the page stays put.
  useEffect(() => {
    if (!dragging) return;
    const block = (e: Event) => e.preventDefault();
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, [dragging]);

  useLayoutEffect(() => {
    if (!hasBand) {
      setHandleY(null);
      return;
    }
    const container = containerRef.current;
    const topRow = rowRefs.current.get(bandTop);
    const bottomRow = rowRefs.current.get(bandBottom);
    if (!container || !topRow || !bottomRow) return;
    const containerRect = container.getBoundingClientRect();
    const topRect = topRow.getBoundingClientRect();
    const bottomRect = bottomRow.getBoundingClientRect();
    setHandleY({
      top: topRect.top - containerRect.top,
      bottom: bottomRect.bottom - containerRect.top,
    });
  }, [hasBand, bandTop, bandBottom, rows]);

  // Drag bindings. The handler closes over the latest state on each render.
  const HANDLE_HEIGHT = 12;

  const moveEdge = useCallback(
    (edge: "top" | "bottom", clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      const pos = findRowPos(el);
      if (pos === null) return;
      let newTop = bandTop;
      let newBottom = bandBottom;
      if (edge === "top") newTop = clamp(pos, 1, bandBottom);
      else newBottom = clamp(pos, bandTop, totalRows);
      if (newTop !== bandTop || newBottom !== bandBottom) {
        onClusterChange(getTeamIdsForRange(newTop, newBottom));
      }
    },
    [bandTop, bandBottom, totalRows, getTeamIdsForRange, onClusterChange],
  );

  const bindTopHandle = useDrag(
    ({ first, last, xy: [x, y], tap }) => {
      if (tap) return;
      if (first) setDragging("top");
      if (last) {
        setDragging(null);
        return;
      }
      moveEdge("top", x, y);
    },
    { filterTaps: true, pointer: { keys: false } },
  );

  const bindBottomHandle = useDrag(
    ({ first, last, xy: [x, y], tap }) => {
      if (tap) return;
      if (first) setDragging("bottom");
      if (last) {
        setDragging(null);
        return;
      }
      moveEdge("bottom", x, y);
    },
    { filterTaps: true, pointer: { keys: false } },
  );

  const previewRange = hoverPos !== null && cluster.length === 0 ? competitorBand(hoverPos) : null;
  const previewTop = previewRange ? previewRange.top : -1;
  const previewBottom = previewRange ? previewRange.bottom : -1;

  return (
    <div ref={containerRef} className="relative overflow-x-auto rounded border border-zinc-800">
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
          {rows.map((row, i) => {
            const pos = i + 1;
            const inClusterBand = hasBand && pos >= bandTop && pos <= bandBottom;
            const inPreview = !hasBand && pos >= previewTop && pos <= previewBottom;
            const range = ranges.get(row.team.id);
            const flags = decided.get(row.team.id);

            let rowBg = "";
            if (inClusterBand) rowBg = " bg-emerald-950/30";
            else if (inPreview) rowBg = " bg-emerald-950/20";

            return (
              <tr
                key={row.team.id}
                data-pos={pos}
                ref={(el) => {
                  rowRefs.current.set(pos, el);
                }}
                className={
                  "border-t border-l-4 border-zinc-900 " +
                  bandFor(pos) +
                  rowBg +
                  (inClusterBand ? " border-l-emerald-400" : "") +
                  (cluster.length === 0 ? " cursor-pointer" : pos >= bandTop && pos <= bandBottom ? "" : " cursor-pointer")
                }
                onMouseEnter={() => cluster.length === 0 && setHoverPos(pos)}
                onMouseLeave={() => cluster.length === 0 && setHoverPos(null)}
                onClick={() => handleRowClick(pos)}
              >
                <td className="px-2 py-2 text-zinc-400">{pos}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {row.team.crest && (
                      <Image src={row.team.crest} alt="" width={18} height={18} unoptimized suppressHydrationWarning />
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

      {hasBand && handleY && (
        <>
          <div
            {...bindTopHandle()}
            className={
              "absolute left-0 right-0 z-10 flex cursor-ns-resize items-center justify-between border-y border-emerald-500 px-2 transition-colors select-none " +
              (dragging === "top" ? "bg-emerald-500/70" : "bg-emerald-700/50 hover:bg-emerald-600/60")
            }
            style={{
              top: handleY.top - HANDLE_HEIGHT / 2,
              height: HANDLE_HEIGHT,
              touchAction: "none",
            }}
            aria-label="Drag to move top of cluster"
          >
            <span className="text-[10px] leading-none text-emerald-100">⋮⋮</span>
            <button
              type="button"
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-700 text-[10px] leading-none text-zinc-200 hover:bg-zinc-600"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onClusterChange([]);
              }}
              title="Clear cluster"
            >
              ×
            </button>
          </div>
          <div
            {...bindBottomHandle()}
            className={
              "absolute left-0 right-0 z-10 flex cursor-ns-resize items-center border-y border-emerald-500 px-2 transition-colors select-none " +
              (dragging === "bottom" ? "bg-emerald-500/70" : "bg-emerald-700/50 hover:bg-emerald-600/60")
            }
            style={{
              top: handleY.bottom - HANDLE_HEIGHT / 2,
              height: HANDLE_HEIGHT,
              touchAction: "none",
            }}
            aria-label="Drag to move bottom of cluster"
          >
            <span className="text-[10px] leading-none text-emerald-100">⋮⋮</span>
          </div>
        </>
      )}

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
