"use client";

import Image from "next/image";
import type { Fixture, Outcome, OutcomeKind } from "@/types";

interface Props {
  fixture: Fixture;
  outcome: Outcome | undefined;
  intraCluster: boolean;
  onSet: (kind: OutcomeKind) => void;
  onToggleLock: () => void;
}

const KINDS: { kind: OutcomeKind; label: string }[] = [
  { kind: "H", label: "Home" },
  { kind: "D", label: "Draw" },
  { kind: "A", label: "Away" },
];

export default function FixtureRow({ fixture, outcome, intraCluster, onSet, onToggleLock }: Props) {
  const locked = outcome?.locked ?? false;

  return (
    <div className={
      "flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:gap-4 " +
      (intraCluster ? "border-amber-700/60 bg-amber-950/10" : "border-zinc-800")
    }>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <TeamCell team={fixture.homeTeam} align="left" />
        <span className="text-zinc-500">vs</span>
        <TeamCell team={fixture.awayTeam} align="right" />
      </div>
      <div className="flex items-center gap-1">
        {KINDS.map(({ kind, label }) => {
          const active = outcome?.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              disabled={locked && !active}
              onClick={() => onSet(kind)}
              className={
                "min-w-[56px] rounded px-3 py-2 text-xs font-medium " +
                (active
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700") +
                (locked && !active ? " opacity-30" : "")
              }
              title={label}
            >
              {kind}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onToggleLock}
          aria-label={locked ? "Unlock fixture" : "Lock fixture"}
          className={
            "ml-1 rounded px-2 py-2 text-xs " +
            (locked ? "bg-amber-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")
          }
          title={locked ? "Locked" : "Lock"}
        >
          {locked ? "🔒" : "🔓"}
        </button>
      </div>
    </div>
  );
}

function TeamCell({ team, align }: { team: Fixture["homeTeam"]; align: "left" | "right" }) {
  return (
    <div className={"flex flex-1 items-center gap-2 min-w-0 " + (align === "right" ? "justify-end" : "")}>
      {align === "left" && team.crest && (
        <Image src={team.crest} alt="" width={20} height={20} unoptimized suppressHydrationWarning />
      )}
      <span className="truncate text-sm">{team.shortName}</span>
      {align === "right" && team.crest && (
        <Image src={team.crest} alt="" width={20} height={20} unoptimized suppressHydrationWarning />
      )}
    </div>
  );
}
