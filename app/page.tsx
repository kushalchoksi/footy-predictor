import { COMPETITIONS } from "@/lib/competitions";
import { getCompetitionsMeta } from "@/lib/footballData";
import { isSeasonCompleteFromMeta } from "@/lib/seasonStatus";
import HomeGrid from "@/components/HomeGrid";

export const revalidate = 120;

/**
 * Determine which competitions have finished their season so the grid can flag
 * them — from a single cached /competitions request rather than one fixtures call
 * per competition (which exhausts the free tier's 10-requests/minute limit). If
 * the request fails (e.g. rate-limited), degrade silently to no chips.
 */
async function getCompleteCodes(): Promise<string[]> {
  try {
    const metas = await getCompetitionsMeta();
    const now = new Date();
    return metas.filter((m) => isSeasonCompleteFromMeta(m, now)).map((m) => m.code);
  } catch {
    return [];
  }
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
