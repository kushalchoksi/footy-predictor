"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, Scenario, Standing } from "@/types";
import { decodeScenario, encodeScenario } from "@/lib/urlState";
import ClusterPicker from "@/components/ClusterPicker";
import FixtureGrid from "@/components/FixtureGrid";
import LiveTable from "@/components/LiveTable";
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

  function handleSave(name: string) {
    const items = loadSaved();
    const hash = encodeScenario(scenario);
    const next = [{ name, hash, savedAt: new Date().toISOString() }, ...items.filter((i) => i.name !== name)].slice(0, 20);
    persistSaved(next);
    setSavedRefresh((r) => r + 1);
  }

  function updateScenario(next: Scenario) {
    setScenario(next);
    const encoded = encodeScenario(next);
    const url = encoded ? `#${encoded}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  const remainingFixtures = useMemo(
    () => fixtures.filter((f) => f.status === "SCHEDULED"),
    [fixtures],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Premier League — Scenarios</h1>
          <p className="text-xs text-zinc-500">
            Data fetched {new Date(fetchedAt).toLocaleString()} ·
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </p>
        </div>
        <div className="text-sm text-zinc-400">
          {remainingFixtures.length} fixtures remaining
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Cluster
        </h2>
        <ClusterPicker
          standings={standings}
          cluster={scenario.cluster}
          onChange={(cluster) => updateScenario({ ...scenario, cluster })}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Fixtures
        </h2>
        <FixtureGrid
          fixtures={remainingFixtures}
          cluster={scenario.cluster}
          outcomes={scenario.outcomes}
          standings={standings}
          onChange={(outcomes) => updateScenario({ ...scenario, outcomes })}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Projected table
        </h2>
        <LiveTable
          base={standings}
          fixtures={fixtures}
          outcomes={scenario.outcomes}
          cluster={scenario.cluster}
          onClusterChange={(cluster) => updateScenario({ ...scenario, cluster })}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Share</h2>
        <ShareBar scenario={scenario} onSave={handleSave} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Saved scenarios</h2>
        <SavedScenarios refreshKey={savedRefresh} />
      </section>
    </div>
  );
}
