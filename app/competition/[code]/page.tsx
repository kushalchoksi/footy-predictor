import { notFound } from "next/navigation";
import { getCompetition } from "@/lib/competitions";
import { getFixtures, getStandings } from "@/lib/footballData";
import ScenarioBuilder from "@/components/ScenarioBuilder";

export const revalidate = 120;

interface Params {
  code: string;
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { code } = await params;
  const competition = getCompetition(code);
  if (!competition) notFound();

  if (competition.format === "tournament") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">{competition.name}</h1>
        <div className="mt-6 rounded border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
          Tournament UI coming in the next phase. The data layer is wired; the bracket UI hasn't shipped yet.
        </div>
      </main>
    );
  }

  let standings, fixtures;
  try {
    [standings, fixtures] = await Promise.all([
      getStandings(competition.code),
      getFixtures(competition.code),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">{competition.name}</h1>
        <div className="mt-6 rounded border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
          <p className="font-semibold">Data fetch failed.</p>
          <p className="mt-2">{message}</p>
        </div>
      </main>
    );
  }

  return (
    <ScenarioBuilder
      competition={competition}
      standings={standings}
      fixtures={fixtures}
      fetchedAt={new Date().toISOString()}
    />
  );
}
