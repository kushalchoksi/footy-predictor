import Link from "next/link";
import type { Competition } from "@/types";

export default function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Link
      href={`/competition/${competition.code}`}
      className="group flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={competition.emblem}
          alt=""
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">{competition.name}</div>
          <div className="truncate text-xs text-zinc-500">{competition.country}</div>
        </div>
      </div>
      <div className="text-xs text-zinc-500">{competition.season.label}</div>
    </Link>
  );
}
