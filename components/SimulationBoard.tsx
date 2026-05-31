"use client";

import type { Fixture, OutcomeMap, Standing, TeamId } from "@/types";
import TeamColumn from "@/components/TeamColumn";

interface Props {
  standings: Standing[];
  fixtures: Fixture[];
  outcomes: OutcomeMap;
  cluster: TeamId[];
  onSetScore: (fixtureId: number, homeScore: number, awayScore: number) => void;
  onToggleLock: (fixtureId: number) => void;
  onClear: (fixtureId: number) => void;
  onClearTeam: (teamId: TeamId) => void;
  onSimulateTeam: (teamId: TeamId) => void;
}

export default function SimulationBoard(props: Props) {
  const { standings, fixtures, outcomes, cluster, onSetScore, onToggleLock, onClear, onClearTeam, onSimulateTeam } = props;
  const selectedStandings = standings.filter((s) => cluster.includes(s.team.id));
  // Preserve cluster insertion order (so left-to-right matches user picks).
  selectedStandings.sort((a, b) => cluster.indexOf(a.team.id) - cluster.indexOf(b.team.id));

  if (selectedStandings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface/30 p-8 text-center text-sm text-muted">
        Pick a cluster preset or select teams from the sidebar to start comparing scenarios.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {selectedStandings.map((team) => (
        <TeamColumn
          key={team.team.id}
          team={team}
          fixtures={fixtures}
          outcomes={outcomes}
          base={standings}
          cluster={cluster}
          onSetScore={onSetScore}
          onToggleLock={onToggleLock}
          onClear={onClear}
          onClearAll={() => onClearTeam(team.team.id)}
          onSimulate={() => onSimulateTeam(team.team.id)}
        />
      ))}
    </div>
  );
}
