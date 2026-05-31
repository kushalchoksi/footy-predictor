"use client";

import { useEffect, useMemo, useState } from "react";
import type { Competition, Fixture, Outcome, OutcomeKind, OutcomeMap, Scenario, Standing } from "@/types";
import { projectTournament } from "@/lib/tournament/projection";
import { decodeScenario, encodeScenario } from "@/lib/urlState";
import TopBar from "@/components/TopBar";
import GroupCard from "@/components/GroupCard";
import Bracket from "@/components/Bracket";
import SeasonCompleteBanner from "@/components/SeasonCompleteBanner";
import { isSeasonComplete } from "@/lib/seasonStatus";

interface Props {
  competition: Competition;
  standings: Standing[];
  fixtures: Fixture[];
  fetchedAt: string;
}

export default function TournamentBuilder({ competition, standings, fixtures, fetchedAt }: Props) {
  const [scenario, setScenario] = useState<Scenario>({ cluster: [], outcomes: {} });

  useEffect(() => {
    setScenario(decodeScenario(window.location.hash));
    const onHashChange = () => setScenario(decodeScenario(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function updateScenario(next: Scenario) {
    setScenario(next);
    const encoded = encodeScenario(next);
    const url = encoded ? `#${encoded}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  function setOutcomeFor(fixtureId: number, mut: (prev: Outcome | undefined) => Outcome | undefined) {
    const prev = scenario.outcomes[fixtureId];
    const next = mut(prev);
    const outcomes: OutcomeMap = { ...scenario.outcomes };
    if (next === undefined) delete outcomes[fixtureId];
    else outcomes[fixtureId] = next;
    updateScenario({ ...scenario, outcomes });
  }

  function handlePickOutcome(fixtureId: number, kind: OutcomeKind) {
    setOutcomeFor(fixtureId, (prev) => ({
      kind,
      locked: prev?.locked ?? false,
    }));
  }

  function handleClear(fixtureId: number) {
    setOutcomeFor(fixtureId, () => undefined);
  }

  const groupFixtures = useMemo(
    () => fixtures.filter((f) =>
      (f.group && f.group.length > 0) ||
      f.stage === "LEAGUE_STAGE"
    ),
    [fixtures],
  );

  const projection = useMemo(
    () => projectTournament(
      competition,
      standings,
      fixtures,
      scenario.outcomes,
      scenario.bracketChoices ?? {},
    ),
    [competition, standings, fixtures, scenario.outcomes, scenario.bracketChoices],
  );

  const totalScheduled = useMemo(() => fixtures.filter((f) => f.status === "SCHEDULED").length, [fixtures]);
  const fixturesLeft = totalScheduled - Object.keys(scenario.outcomes).length;

  function handlePickWinner(tieId: string, teamId: number) {
    const nextChoices = { ...(scenario.bracketChoices ?? {}), [tieId]: teamId };
    updateScenario({ ...scenario, bracketChoices: nextChoices });
  }

  const groupNames = [...projection.groupStandings.keys()].sort();
  const seasonComplete = useMemo(() => isSeasonComplete(fixtures), [fixtures]);

  return (
    <div className="min-h-screen">
      <TopBar
        fetchedAt={fetchedAt}
        fixturesLeft={Math.max(0, fixturesLeft)}
        competitionName={competition.name}
        onResetPicks={() => updateScenario({ ...scenario, outcomes: {} })}
        onSimulateAll={() => { /* Simulate-all for tournaments lands later. */ }}
      />
      {seasonComplete && <SeasonCompleteBanner seasonLabel={competition.season.label} />}
      <main className="mx-auto max-w-6xl space-y-6 p-4">
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-fg">{competition.name}</h1>
          <p className="text-xs text-faint">{competition.season.label} — Group stage</p>
        </header>

        {groupNames.length === 0 ? (
          <section className="rounded border border-border bg-surface p-4 text-sm text-muted">
            No group-stage fixtures available yet for this competition.
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupNames.map((g) => {
              const groupStandings = projection.groupStandings.get(g) ?? [];
              const qualified = projection.qualified.get(g) ?? [];
              const fixturesForGroup = groupFixtures.filter((f) =>
                (f.group ?? (f.stage === "LEAGUE_STAGE" ? "LEAGUE_PHASE" : "")) === g
              );
              return (
                <GroupCard
                  key={g}
                  groupName={g}
                  fixtures={fixturesForGroup}
                  standings={groupStandings}
                  qualified={qualified}
                  outcomes={scenario.outcomes}
                  onPickOutcome={handlePickOutcome}
                  onClear={handleClear}
                />
              );
            })}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-faint">Knockout bracket</h2>
          <Bracket
            ties={projection.bracket}
            choices={scenario.bracketChoices ?? {}}
            onPick={handlePickWinner}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-faint">Finishing positions</h2>
          <FinishingPositions projection={projection} />
        </section>
      </main>
    </div>
  );
}

function FinishingPositions({ projection }: { projection: ReturnType<typeof projectTournament> }) {
  const entries = [...projection.finishingPositions.entries()];
  // Build a team-id → team lookup from groupStandings (covers every team in the tournament).
  const teams = new Map<number, { id: number; shortName: string; name: string; tla: string; crest: string }>();
  for (const standings of projection.groupStandings.values()) {
    for (const s of standings) teams.set(s.team.id, s.team);
  }
  const order = ["Winner", "Runner-up", "SF", "QF", "R16", "R32", "Playoffs", "League phase", "Group stage"];
  entries.sort((a, b) => {
    const aIdx = order.indexOf(a[1]); const bIdx = order.indexOf(b[1]);
    const aFinal = aIdx === -1 ? order.length : aIdx;
    const bFinal = bIdx === -1 ? order.length : bIdx;
    return aFinal - bFinal;
  });
  return (
    <ul className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
      {entries.map(([id, pos]) => {
        const t = teams.get(id);
        if (!t) return null;
        return (
          <li key={id} className="flex items-center justify-between rounded border border-border bg-surface px-2 py-1">
            <span className="truncate">{t.shortName}</span>
            <span className="text-faint">{pos}</span>
          </li>
        );
      })}
    </ul>
  );
}
