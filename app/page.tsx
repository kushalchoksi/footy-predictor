import ScenarioBuilder from "@/components/ScenarioBuilder";
import { getFixtures, getStandings } from "@/lib/footballData";

export const revalidate = 120;

export default async function Page() {
  let standings, fixtures;
  try {
    [standings, fixtures] = await Promise.all([getStandings(), getFixtures()]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Footy Scenarios — EPL</h1>
        <div className="mt-6 rounded border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
          <p className="font-semibold">Data fetch failed.</p>
          <p className="mt-2">{message}</p>
          <p className="mt-2 text-red-300">
            Make sure <code className="rounded bg-black/40 px-1">FOOTBALL_DATA_API_KEY</code> is set
            in <code className="rounded bg-black/40 px-1">.env.local</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ScenarioBuilder
      standings={standings}
      fixtures={fixtures}
      fetchedAt={new Date().toISOString()}
    />
  );
}
