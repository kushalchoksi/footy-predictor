"use client";

import type { Standing, TeamId } from "@/types";
import { suggestClusters, type Cluster } from "@/lib/clusters";
import { useMemo } from "react";

interface Props {
  standings: Standing[];
  cluster: TeamId[];
  onChange: (cluster: TeamId[]) => void;
}

export default function ClusterPicker({ standings, cluster, onChange }: Props) {
  const suggestions = useMemo(() => suggestClusters(standings, 38), [standings]);

  function applySuggestion(s: Cluster) {
    onChange([...s.teamIds]);
  }

  return (
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
  );
}
