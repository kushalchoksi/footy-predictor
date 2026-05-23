"use client";

import type { Standing, TeamId } from "@/types";
import TeamList from "@/components/TeamList";

interface Props {
  standings: Standing[];
  cluster: TeamId[];
  onClusterChange: (cluster: TeamId[]) => void;
}

export default function Sidebar({ standings, cluster, onClusterChange }: Props) {
  function toggle(teamId: TeamId) {
    if (cluster.includes(teamId)) {
      onClusterChange(cluster.filter((id) => id !== teamId));
    } else {
      onClusterChange([...cluster, teamId]);
    }
  }

  return (
    <aside className="sticky top-[64px] flex max-h-[calc(100vh-64px)] w-64 shrink-0 flex-col gap-3 border-r border-zinc-800 bg-zinc-950/40 p-3">
      <button
        type="button"
        onClick={() => onClusterChange([])}
        className="flex items-center gap-2 self-start rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
      >
        ← Back to table
      </button>
      <div className="-mx-3 h-px shrink-0 bg-zinc-800" />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Teams</h2>
        <TeamList standings={standings} cluster={cluster} onToggle={toggle} />
      </div>
    </aside>
  );
}
