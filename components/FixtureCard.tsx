"use client";

import { Lock, Unlock, X } from "lucide-react";
import type { Fixture, Outcome, Team } from "@/types";
import TeamCrest from "@/components/TeamCrest";
import FlipClockDigit from "@/components/FlipClockDigit";

interface Props {
  fixture: Fixture;
  outcome: Outcome | undefined;
  /** The team this card "belongs to" — used to flip home/away framing and derive the outcome chip. */
  perspective: Team;
  /** True if the opponent is also a cluster team (card mirrored in another column). */
  mirrored: boolean;
  onSetScore: (homeScore: number, awayScore: number) => void;
  onToggleLock: () => void;
  onClear: () => void;
}


function pointsFromPerspective(outcome: Outcome | undefined, perspectiveIsHome: boolean): number | null {
  if (!outcome) return null;
  if (outcome.kind === "D") return 1;
  if (outcome.kind === "H") return perspectiveIsHome ? 3 : 0;
  return perspectiveIsHome ? 0 : 3;
}

export default function FixtureCard({
  fixture, outcome, perspective, mirrored, onSetScore, onToggleLock, onClear,
}: Props) {
  const perspectiveIsHome = fixture.homeTeam.id === perspective.id;
  const opponent = perspectiveIsHome ? fixture.awayTeam : fixture.homeTeam;
  const venue = perspectiveIsHome ? "H" : "A";

  const homeScore = outcome?.homeScore ?? (outcome?.kind === "H" ? 1 : outcome?.kind === "A" ? 0 : outcome?.kind === "D" ? 0 : 0);
  const awayScore = outcome?.awayScore ?? (outcome?.kind === "A" ? 1 : outcome?.kind === "H" ? 0 : outcome?.kind === "D" ? 0 : 0);
  const hasPick = outcome !== undefined;

  const locked = outcome?.locked ?? false;
  const pts = pointsFromPerspective(outcome, perspectiveIsHome);

  return (
    <div className={
      "rounded-lg border p-2.5 text-sm " +
      (mirrored ? "border-amber-700/50 bg-amber-950/10" : "border-zinc-800 bg-zinc-950/30") +
      (locked ? " ring-1 ring-emerald-600/40" : "")
    }>
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
        <span>MW {fixture.matchday} · {venue}</span>
        <div className="flex items-center gap-1">
          {mirrored && <span className="text-amber-400">H2H</span>}
          <button
            type="button"
            onClick={onToggleLock}
            className={"flex items-center justify-center rounded p-0.5 " + (locked ? "bg-emerald-700 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200")}
            title={locked ? "Unlock" : "Lock"}
            aria-label={locked ? "Unlock" : "Lock"}
          >
            {locked ? <Lock size={12} aria-hidden="true" /> : <Unlock size={12} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TeamCrest team={opponent} size={20} />
        <span className="flex-1 truncate text-sm">{opponent.shortName}</span>
        <span className={
          "rounded-md px-1.5 py-0.5 font-mono text-[10px] " +
          (pts === 3 ? "bg-emerald-700/60 text-emerald-100" :
           pts === 1 ? "bg-zinc-700 text-zinc-100" :
           pts === 0 ? "bg-rose-800/60 text-rose-100" :
           "bg-zinc-900 text-zinc-500")
        }>
          {pts === null ? "—" : `+${pts}`}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500">
            {perspectiveIsHome ? "You" : opponent.shortName.slice(0, 3)}
          </span>
          <FlipClockDigit
            value={homeScore}
            onChange={(n) => onSetScore(n, awayScore)}
            disabled={locked}
            label="Home goals"
          />
        </div>
        <span className="font-mono text-xs text-zinc-500">–</span>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500">
            {perspectiveIsHome ? opponent.shortName.slice(0, 3) : "You"}
          </span>
          <FlipClockDigit
            value={awayScore}
            onChange={(n) => onSetScore(homeScore, n)}
            disabled={locked}
            label="Away goals"
          />
        </div>
        {hasPick && !locked && (
          <button
            type="button"
            onClick={onClear}
            className="ml-1 flex items-center justify-center rounded p-0.5 text-zinc-500 hover:text-rose-400"
            title="Clear pick"
            aria-label="Clear pick"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

