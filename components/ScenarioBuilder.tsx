"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, Outcome, OutcomeMap, Scenario, Standing, TeamId } from "@/types";
import { decodeScenario, encodeScenario } from "@/lib/urlState";
import { simulate } from "@/lib/simulate";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import SimulationBoard from "@/components/SimulationBoard";
import ProjectedTable from "@/components/ProjectedTable";
import ShareBar from "@/components/ShareBar";
import SavedScenarios, { loadSaved, persistSaved } from "@/components/SavedScenarios";

interface Props {
  standings: Standing[];
  fixtures: Fixture[];
  fetchedAt: string;
}

export default function ScenarioBuilder({ standings, fixtures, fetchedAt }: Props) {
  const [scenario, setScenario] = useState<Scenario>({ cluster: [], outcomes: {} });
  const [savedRefresh, setSavedRefresh] = useState(0);

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

  function setCluster(cluster: TeamId[]) {
    updateScenario({ ...scenario, cluster });
  }

  function setOutcomeFor(fixtureId: number, mut: (prev: Outcome | undefined) => Outcome | undefined) {
    const prev = scenario.outcomes[fixtureId];
    const next = mut(prev);
    const outcomes: OutcomeMap = { ...scenario.outcomes };
    if (next === undefined) delete outcomes[fixtureId];
    else outcomes[fixtureId] = next;
    updateScenario({ ...scenario, outcomes });
  }

  function handleSetScore(fixtureId: number, homeScore: number, awayScore: number) {
    setOutcomeFor(fixtureId, (prev) => ({
      kind: homeScore > awayScore ? "H" : homeScore < awayScore ? "A" : "D",
      locked: prev?.locked ?? false,
      homeScore,
      awayScore,
    }));
  }

  function handleToggleLock(fixtureId: number) {
    setOutcomeFor(fixtureId, (prev) => prev ? { ...prev, locked: !prev.locked } : prev);
  }

  function handleClearFixture(fixtureId: number) {
    setOutcomeFor(fixtureId, () => undefined);
  }

  function handleClearTeam(teamId: TeamId) {
    const outcomes: OutcomeMap = { ...scenario.outcomes };
    for (const fix of fixtures) {
      if (fix.status !== "SCHEDULED") continue;
      if (fix.homeTeam.id !== teamId && fix.awayTeam.id !== teamId) continue;
      const o = outcomes[fix.id];
      if (!o || o.locked) continue;
      delete outcomes[fix.id];
    }
    updateScenario({ ...scenario, outcomes });
  }

  function handleResetPicks() {
    const outcomes: OutcomeMap = {};
    for (const [id, o] of Object.entries(scenario.outcomes)) {
      if (o.locked) outcomes[Number(id)] = o;
    }
    updateScenario({ ...scenario, outcomes });
  }

  function handleSimulateAll() {
    const next = simulate(standings, fixtures, scenario.outcomes);
    updateScenario({ ...scenario, outcomes: next });
  }

  function handleSimulateTeam(teamId: TeamId) {
    const next = simulate(standings, fixtures, scenario.outcomes, { teamScope: [teamId] });
    updateScenario({ ...scenario, outcomes: next });
  }

  function handleSave(name: string) {
    const items = loadSaved();
    const hash = encodeScenario(scenario);
    const next = [{ name, hash, savedAt: new Date().toISOString() }, ...items.filter((i) => i.name !== name)].slice(0, 20);
    persistSaved(next);
    setSavedRefresh((r) => r + 1);
  }

  const totalScheduled = useMemo(() => fixtures.filter((f) => f.status === "SCHEDULED").length, [fixtures]);
  const fixturesLeft = totalScheduled - Object.keys(scenario.outcomes).length;

  const hasCluster = scenario.cluster.length > 0;

  return (
    <div className="min-h-screen">
      <TopBar
        fetchedAt={fetchedAt}
        fixturesLeft={Math.max(0, fixturesLeft)}
        onResetPicks={handleResetPicks}
        onSimulateAll={handleSimulateAll}
      />
      {hasCluster ? (
        <div className="flex">
          <Sidebar
            standings={standings}
            cluster={scenario.cluster}
            onClusterChange={setCluster}
          />
          <main className="min-w-0 flex-1 space-y-6 p-4">
            <SimulationBoard
              standings={standings}
              fixtures={fixtures}
              outcomes={scenario.outcomes}
              cluster={scenario.cluster}
              onSetScore={handleSetScore}
              onToggleLock={handleToggleLock}
              onClear={handleClearFixture}
              onClearTeam={handleClearTeam}
              onSimulateTeam={handleSimulateTeam}
            />

            <section className="space-y-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Selected — projected</h2>
              <ProjectedTable
                base={standings}
                fixtures={fixtures}
                outcomes={scenario.outcomes}
                cluster={scenario.cluster}
                filterTeamIds={scenario.cluster}
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Share</h2>
              <ShareBar scenario={scenario} onSave={handleSave} />
            </section>

            <section className="space-y-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Saved scenarios</h2>
              <SavedScenarios refreshKey={savedRefresh} />
            </section>
          </main>
        </div>
      ) : (
        <main className="mx-auto max-w-6xl space-y-6 p-4">
          <section className="space-y-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Projected table</h2>
            <p className="text-xs text-zinc-500">Hover a row to see who it competes with, then click to start comparing.</p>
            <ProjectedTable
              base={standings}
              fixtures={fixtures}
              outcomes={scenario.outcomes}
              cluster={scenario.cluster}
              onClusterChange={setCluster}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Share</h2>
            <ShareBar scenario={scenario} onSave={handleSave} />
          </section>

          <section className="space-y-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Saved scenarios</h2>
            <SavedScenarios refreshKey={savedRefresh} />
          </section>
        </main>
      )}
    </div>
  );
}
