"use client";

import type { Standing, TeamId } from "@/types";
import { suggestClusters, type Cluster } from "@/lib/clusters";
import { useMemo } from "react";
import Image from "next/image";

interface Props {
  standings: Standing[];
  cluster: TeamId[];
  onChange: (cluster: TeamId[]) => void;
}

export default function ClusterPicker({ standings, cluster, onChange }: Props) {
  const suggestions = useMemo(() => suggestClusters(standings, 38), [standings]);
  const clusterSet = new Set(cluster);

  function applySuggestion(s: Cluster) {
    onChange([...s.teamIds]);
  }

  function toggleTeam(id: TeamId) {
    if (clusterSet.has(id)) {
      onChange(cluster.filter((t) => t !== id));
    } else {
      onChange([...cluster, id]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.kind}
            type="button"
            onClick={() => applySuggestion(s)}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
            title={s.prizeLabel}
          >
            {s.label} ({s.teamIds.length})
          </button>
        ))}
        {cluster.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {standings.map((s) => {
          const active = clusterSet.has(s.team.id);
          return (
            <button
              key={s.team.id}
              type="button"
              onClick={() => toggleTeam(s.team.id)}
              className={
                "flex items-center gap-2 rounded border px-2 py-1 text-left text-sm " +
                (active
                  ? "border-emerald-500 bg-emerald-950/30 text-emerald-100"
                  : "border-zinc-800 text-zinc-300 hover:border-zinc-600")
              }
            >
              {s.team.crest && (
                <Image src={s.team.crest} alt="" width={20} height={20} unoptimized />
              )}
              <span className="truncate">{s.team.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
