"use client";

import { useMemo } from "react";
import type { Fixture, OutcomeKind, OutcomeMap, Standing, TeamId } from "@/types";
import TeamCrest from "@/components/TeamCrest";
import FixtureCard from "@/components/FixtureCard";
import { getTeamPalette } from "@/lib/teamColors";
import { projectStandings } from "@/lib/scenario";
import Sparkline from "@/components/Sparkline";
import { computeSparkline } from "@/lib/sparklineData";

interface Props {
  team: Standing;
  fixtures: Fixture[];
  outcomes: OutcomeMap;
  base: Standing[];
  cluster: TeamId[];
  onSetScore: (fixtureId: number, homeScore: number, awayScore: number) => void;
  onToggleLock: (fixtureId: number) => void;
  onClear: (fixtureId: number) => void;
  onClearAll: () => void;
  onSimulate: () => void;
}

function deriveKind(homeScore: number, awayScore: number): OutcomeKind {
  if (homeScore > awayScore) return "H";
  if (homeScore < awayScore) return "A";
  return "D";
}

export default function TeamColumn({
  team, fixtures, outcomes, base, cluster,
  onSetScore, onToggleLock, onClear, onClearAll, onSimulate,
}: Props) {
  const palette = getTeamPalette(team.team);
  const remaining = useMemo(
    () => fixtures.filter(
      (f) => f.status === "SCHEDULED" && (f.homeTeam.id === team.team.id || f.awayTeam.id === team.team.id),
    ),
    [fixtures, team.team.id],
  );

  // Projected pts for this team given current outcomes.
  const projected = useMemo(() => projectStandings(base, fixtures, outcomes), [base, fixtures, outcomes]);
  const projectedSelf = projected.standings.find((s) => s.team.id === team.team.id)!;

  let picked = 0;
  let wins = 0, draws = 0, losses = 0;
  for (const fix of remaining) {
    const o = outcomes[fix.id];
    if (!o) continue;
    picked++;
    const isHome = fix.homeTeam.id === team.team.id;
    if (o.kind === "D") draws++;
    else if ((o.kind === "H" && isHome) || (o.kind === "A" && !isHome)) wins++;
    else losses++;
  }
  const unpicked = remaining.length - picked;
  const delta = projectedSelf.points - team.points;

  const clusterSet = new Set(cluster);

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div
        className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
        style={{ borderTop: `3px solid ${palette.primary}` }}
      >
        <div className="flex items-center gap-2">
          <TeamCrest team={team.team} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{team.team.shortName}</div>
            <div className="font-mono text-[11px] text-zinc-500">
              {team.points} → <span className="text-zinc-100">{projectedSelf.points}</span>
              <span className={delta > 0 ? "ml-1 text-emerald-400" : delta < 0 ? "ml-1 text-rose-400" : "ml-1 text-zinc-500"}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-y-0.5 font-mono text-[10px] text-zinc-400">
          <div>Picked: <span className="text-zinc-200">{picked}/{remaining.length}</span></div>
          <div>GD: <span className="text-zinc-200">{projectedSelf.goalDifference}</span></div>
          <div>W/D/L (picked): <span className="text-zinc-200">{wins}/{draws}/{losses}</span></div>
          <div>Unpicked: <span className="text-zinc-200">{unpicked}</span></div>
        </div>
        <div className="mt-2">
          {(() => {
            const s = computeSparkline(team.team.id, fixtures, outcomes);
            return <Sparkline history={s.history} projection={s.projection} color={palette.primary} />;
          })()}
        </div>
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={onSimulate}
            title="Simulate (coming in Phase 5)"
            className="flex-1 rounded-md bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
          >
            Simulate
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="flex-1 rounded-md bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {remaining.map((fix) => {
          const opponent = fix.homeTeam.id === team.team.id ? fix.awayTeam : fix.homeTeam;
          const mirrored = clusterSet.has(opponent.id);
          const outcome = outcomes[fix.id];
          return (
            <FixtureCard
              key={fix.id}
              fixture={fix}
              outcome={outcome}
              perspective={team.team}
              mirrored={mirrored}
              onSetScore={(h, a) => onSetScore(fix.id, h, a)}
              onToggleLock={() => onToggleLock(fix.id)}
              onClear={() => onClear(fix.id)}
            />
          );
        })}
        {remaining.length === 0 && (
          <p className="rounded border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-500">
            No remaining fixtures.
          </p>
        )}
      </div>
    </div>
  );
}

// Re-export for use elsewhere.
export { deriveKind };
