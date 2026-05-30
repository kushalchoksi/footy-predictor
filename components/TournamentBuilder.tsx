"use client";

import { useEffect, useMemo, useState } from "react";
import type { Competition, Fixture, Outcome, OutcomeKind, OutcomeMap, Scenario, Standing } from "@/types";
import { CHAINS } from "@/lib/tiebreakers";
import { projectGroups } from "@/lib/tournament/groupStage";
import { decodeScenario, encodeScenario } from "@/lib/urlState";
import TopBar from "@/components/TopBar";
import GroupCard from "@/components/GroupCard";

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

  const groups = useMemo(
    () => projectGroups(standings, groupFixtures, scenario.outcomes, CHAINS[competition.tiebreaker]),
    [standings, groupFixtures, scenario.outcomes, competition],
  );

  const totalScheduled = useMemo(() => fixtures.filter((f) => f.status === "SCHEDULED").length, [fixtures]);
  const fixturesLeft = totalScheduled - Object.keys(scenario.outcomes).length;

  const groupNames = [...groups.groupStandings.keys()].sort();

  return (
    <div className="min-h-screen">
      <TopBar
        fetchedAt={fetchedAt}
        fixturesLeft={Math.max(0, fixturesLeft)}
        onResetPicks={() => updateScenario({ ...scenario, outcomes: {} })}
        onSimulateAll={() => { /* Simulate-all for tournaments lands later. */ }}
      />
      <main className="mx-auto max-w-6xl space-y-6 p-4">
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-zinc-100">{competition.name}</h1>
          <p className="text-xs text-zinc-500">{competition.season.label} — Group stage</p>
        </header>

        {groupNames.length === 0 ? (
          <section className="rounded border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            No group-stage fixtures available yet for this competition.
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupNames.map((g) => {
              const groupStandings = groups.groupStandings.get(g) ?? [];
              const qualified = groups.qualified.get(g) ?? [];
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

        <section className="rounded border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
          Knockout bracket lands in Phase 4.
        </section>
      </main>
    </div>
  );
}
