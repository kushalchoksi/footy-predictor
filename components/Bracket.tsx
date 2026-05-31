"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BracketTie, TeamId, TournamentStage } from "@/types";
import TeamCrest from "@/components/TeamCrest";

interface Props {
  ties: BracketTie[];
  choices: Record<string, TeamId>;
  onPick: (tieId: string, teamId: TeamId) => void;
}

const STAGE_ORDER: TournamentStage[] = [
  "PLAYOFFS", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL",
];

const STAGE_LABEL: Record<TournamentStage, string> = {
  PLAYOFFS: "Playoffs",
  LEAGUE_STAGE: "League phase",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  FINAL: "Final",
  GROUP_STAGE: "Group stage",
  THIRD_PLACE: "3rd-place playoff",
};

export default function Bracket({ ties, choices, onPick }: Props) {
  const stages = STAGE_ORDER.filter((s) => ties.some((t) => t.stage === s));

  const contentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [paths, setPaths] = useState<string[]>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Draw an elbow connector from each feeder tie's right edge to the tie it feeds,
  // measured from the real card positions so it stays correct as teams resolve and
  // as the layout reflows. Feeder-aware (not just "pair up adjacent cards"), which
  // is what makes the Champions League playoff→R16 links and seeded byes render right.
  const recompute = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const base = content.getBoundingClientRect();
    const next: string[] = [];
    for (const tie of ties) {
      const toEl = cardRefs.current.get(tie.id);
      if (!toEl) continue;
      const to = toEl.getBoundingClientRect();
      const toX = to.left - base.left;
      const toY = to.top - base.top + to.height / 2;
      for (const feeder of [tie.feederHome, tie.feederAway]) {
        if (!feeder) continue;
        const fromEl = cardRefs.current.get(feeder);
        if (!fromEl) continue;
        const from = fromEl.getBoundingClientRect();
        const fromX = from.right - base.left;
        const fromY = from.top - base.top + from.height / 2;
        const midX = (fromX + toX) / 2;
        next.push(`M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`);
      }
    }
    setPaths(next);
    setSize({ w: content.scrollWidth, h: content.scrollHeight });
  }, [ties]);

  useEffect(() => {
    recompute();
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(content);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  if (stages.length === 0) {
    return (
      <div className="rounded border border-border bg-surface p-4 text-sm text-muted">
        No knockout bracket available for this competition.
      </div>
    );
  }

  const setCardRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  return (
    <div className="w-full">
      <div ref={contentRef} className="relative flex w-full gap-4 p-2 sm:gap-6">
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={size.w}
          height={size.h}
          aria-hidden="true"
        >
          {paths.map((d, i) => (
            <path key={i} d={d} fill="none" strokeWidth={1.5} style={{ stroke: "var(--border-strong)" }} />
          ))}
        </svg>

        {stages.map((stage, si) => {
          const stageTies = ties.filter((t) => t.stage === stage);
          // The first (tallest) column stacks naturally and sets the bracket height;
          // later columns stretch to it and space-around, centering each tie between
          // its feeders.
          const bodyClass = si === 0
            ? "flex flex-col gap-3"
            : "flex flex-1 flex-col justify-around gap-3";
          return (
            <div key={stage} className="flex min-w-0 flex-1 flex-col">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {STAGE_LABEL[stage]}
              </h3>
              <div className={bodyClass}>
                {stageTies.map((tie) => (
                  <div key={tie.id} ref={setCardRef(tie.id)} className="relative z-10">
                    <BracketTieCard tie={tie} winnerId={choices[tie.id]} onPick={onPick} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketTieCard({
  tie, winnerId, onPick,
}: {
  tie: BracketTie;
  winnerId: TeamId | undefined;
  onPick: (tieId: string, teamId: TeamId) => void;
}) {
  return (
    <div className="rounded border border-border bg-surface shadow-sm">
      <Slot tie={tie} team={tie.homeTeam} feeder={tie.feederHome} winnerId={winnerId} onPick={onPick} />
      <div className="border-t border-border" />
      <Slot tie={tie} team={tie.awayTeam} feeder={tie.feederAway} winnerId={winnerId} onPick={onPick} />
    </div>
  );
}

function Slot({
  tie, team, feeder, winnerId, onPick,
}: {
  tie: BracketTie;
  team: BracketTie["homeTeam"];
  feeder: string | undefined;
  winnerId: TeamId | undefined;
  onPick: (tieId: string, teamId: TeamId) => void;
}) {
  const isWinner = team && winnerId === team.id;
  const clickable = !!team;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => team && onPick(tie.id, team.id)}
      className={
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition " +
        (clickable ? "hover:bg-surface-2 " : "cursor-not-allowed text-faint ") +
        (isWinner ? "bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "text-muted")
      }
    >
      {team ? (
        <>
          <TeamCrest team={team} size={14} />
          <span className="min-w-0 truncate">{team.shortName}</span>
        </>
      ) : (
        <span className="min-w-0 truncate italic text-faint">Winner of {feeder ?? "TBD"}</span>
      )}
    </button>
  );
}
