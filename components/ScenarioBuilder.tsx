"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, Scenario, Standing } from "@/types";
import { decodeScenario, encodeScenario } from "@/lib/urlState";
import ClusterPicker from "@/components/ClusterPicker";

interface Props {
  standings: Standing[];
  fixtures: Fixture[];
  fetchedAt: string;
}

export default function ScenarioBuilder({ standings, fixtures, fetchedAt }: Props) {
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
        <p className="text-sm text-zinc-500">FixtureGrid goes here (Task 14).</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Projected table
        </h2>
        <p className="text-sm text-zinc-500">LiveTable goes here (Task 15).</p>
      </section>

      <pre className="overflow-auto rounded bg-zinc-900 p-3 text-xs">
        {JSON.stringify(scenario, null, 2)}
      </pre>
    </div>
  );
}
