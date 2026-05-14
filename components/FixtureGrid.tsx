"use client";

import type { Fixture, OutcomeKind, OutcomeMap, Standing, TeamId } from "@/types";
import FixtureRow from "@/components/FixtureRow";

interface Props {
  fixtures: Fixture[];
  cluster: TeamId[];
  outcomes: OutcomeMap;
  standings: Standing[];
  onChange: (outcomes: OutcomeMap) => void;
}

export default function FixtureGrid({ fixtures, cluster, outcomes, standings, onChange }: Props) {
  const teamName = (id: TeamId) => standings.find((s) => s.team.id === id)?.team.shortName ?? `Team #${id}`;
  const clusterSet = new Set(cluster);
  const relevant = fixtures.filter(
    (f) => clusterSet.has(f.homeTeam.id) || clusterSet.has(f.awayTeam.id),
  );

  if (cluster.length === 0) {
    return <p className="text-sm text-zinc-500">Pick a cluster above to see fixtures.</p>;
  }

  if (relevant.length === 0) {
    return <p className="text-sm text-zinc-500">No remaining fixtures for this cluster.</p>;
  }

  const byMatchday = new Map<number, Fixture[]>();
  for (const fix of relevant) {
    const list = byMatchday.get(fix.matchday) ?? [];
    list.push(fix);
    byMatchday.set(fix.matchday, list);
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  function setOutcome(id: number, kind: OutcomeKind) {
    const prev = outcomes[id];
    const next: OutcomeMap = {
      ...outcomes,
      [id]: { kind, locked: prev?.locked ?? false },
    };
    onChange(next);
  }

  function toggleLock(id: number) {
    const prev = outcomes[id];
    if (!prev) return;
    const next: OutcomeMap = { ...outcomes, [id]: { ...prev, locked: !prev.locked } };
    onChange(next);
  }

  function setRun(teamId: TeamId, kind: OutcomeKind) {
    const next: OutcomeMap = { ...outcomes };
    for (const fix of relevant) {
      const isHome = fix.homeTeam.id === teamId;
      const isAway = fix.awayTeam.id === teamId;
      if (!isHome && !isAway) continue;
      const code: OutcomeKind = kind === "D" ? "D" : isHome ? kind : (kind === "H" ? "A" : "H");
      const prev = next[fix.id];
      if (prev?.locked) continue;
      next[fix.id] = { kind: code, locked: false };
    }
    onChange(next);
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {cluster.map((id) => (
          <div key={id} className="flex items-center gap-2 rounded border border-zinc-800 px-2 py-1">
            <span className="font-medium text-zinc-200">{teamName(id)}</span>
            <button type="button" className="text-emerald-400 hover:underline" onClick={() => setRun(id, "H")}>Wins out</button>
            <button type="button" className="text-zinc-400 hover:underline" onClick={() => setRun(id, "D")}>Draws out</button>
            <button type="button" className="text-rose-400 hover:underline" onClick={() => setRun(id, "A")}>Loses out</button>
          </div>
        ))}
        {Object.keys(outcomes).length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto rounded border border-zinc-800 px-3 py-1 text-zinc-400 hover:border-rose-500 hover:text-rose-300"
          >
            Clear all picks
          </button>
        )}
      </div>

      {matchdays.map((md) => (
        <div key={md}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Matchweek {md}
          </h3>
          <div className="space-y-2">
            {byMatchday.get(md)!.map((fix) => {
              const intra = clusterSet.has(fix.homeTeam.id) && clusterSet.has(fix.awayTeam.id);
              return (
                <FixtureRow
                  key={fix.id}
                  fixture={fix}
                  outcome={outcomes[fix.id]}
                  intraCluster={intra}
                  onSet={(kind) => setOutcome(fix.id, kind)}
                  onToggleLock={() => toggleLock(fix.id)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
