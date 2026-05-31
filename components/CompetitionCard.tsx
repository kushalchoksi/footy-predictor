import Link from "next/link";
import type { Competition } from "@/types";
import CompetitionEmblem from "@/components/CompetitionEmblem";

export default function CompetitionCard({ competition, complete = false }: { competition: Competition; complete?: boolean }) {
  return (
    <Link
      href={`/competition/${competition.code}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <CompetitionEmblem src={competition.emblem} alt={competition.name} size={40} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-fg">{competition.name}</div>
          <div className="truncate text-xs text-muted">{competition.country}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-faint">{competition.season.label}</span>
        {complete && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Complete
          </span>
        )}
      </div>
    </Link>
  );
}
