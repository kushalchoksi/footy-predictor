import Link from "next/link";
import type { Competition } from "@/types";
import CompetitionEmblem from "@/components/CompetitionEmblem";

export default function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Link
      href={`/competition/${competition.code}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <CompetitionEmblem src={competition.emblem} size={40} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-fg">{competition.name}</div>
          <div className="truncate text-xs text-muted">{competition.country}</div>
        </div>
      </div>
      <div className="text-xs text-faint">{competition.season.label}</div>
    </Link>
  );
}
