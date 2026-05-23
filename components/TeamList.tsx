"use client";

import type { Standing, TeamId } from "@/types";
import TeamCrest from "@/components/TeamCrest";
import { getTeamPalette } from "@/lib/teamColors";

interface Props {
  standings: Standing[];
  cluster: TeamId[];
  onToggle: (teamId: TeamId) => void;
}

export default function TeamList({ standings, cluster, onToggle }: Props) {
  const clusterSet = new Set(cluster);
  const sorted = [...standings].sort((a, b) => b.points - a.points);
  const anyActive = cluster.length > 0;

  return (
    <ul className="space-y-0.5">
      {sorted.map((s) => {
        const active = clusterSet.has(s.team.id);
        const palette = getTeamPalette(s.team);
        const dim = anyActive && !active;
        return (
          <li key={s.team.id}>
            <button
              type="button"
              onClick={() => onToggle(s.team.id)}
              className={
                "group flex w-full items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-left transition-colors " +
                (active
                  ? "bg-zinc-900 text-zinc-100"
                  : "border-transparent text-zinc-300 hover:bg-zinc-900/50 ") +
                (dim ? " opacity-40 hover:opacity-100" : "")
              }
              style={{ borderLeftColor: active ? palette.primary : "transparent" }}
            >
              <TeamCrest team={s.team} size={20} />
              <span className="flex-1 truncate text-sm">{s.team.shortName}</span>
              <span className="font-mono text-xs text-zinc-500">{s.points}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
