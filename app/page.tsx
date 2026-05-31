import { COMPETITIONS } from "@/lib/competitions";
import { getFixtures } from "@/lib/footballData";
import { isSeasonComplete } from "@/lib/seasonStatus";
import HomeGrid from "@/components/HomeGrid";

export const revalidate = 120;

/**
 * Determine which competitions have finished their season so the grid can flag
 * them. Each fixture fetch is cached (unstable_cache, 120s) and isolated with
 * allSettled, so a single rate-limited or failed competition degrades to "no
 * chip" rather than breaking the whole page.
 */
async function getCompleteCodes(): Promise<string[]> {
  const results = await Promise.allSettled(
    COMPETITIONS.map(async (c) => ({
      code: c.code,
      complete: isSeasonComplete(await getFixtures(c.code)),
    })),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ code: string; complete: boolean }> => r.status === "fulfilled")
    .filter((r) => r.value.complete)
    .map((r) => r.value.code);
}

export default async function Page() {
  const completeCodes = await getCompleteCodes();
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-fg">Footy Scenarios</h1>
        <p className="text-sm text-muted">Pick a competition to simulate.</p>
      </header>
      <HomeGrid competitions={COMPETITIONS} completeCodes={completeCodes} />
    </main>
  );
}
