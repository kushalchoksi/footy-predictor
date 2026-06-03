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
  // HomeGrid owns the page chrome (masthead + grid) so the hover takeover can
  // whiten the heading in step with the scene.
  return <HomeGrid competitions={COMPETITIONS} completeCodes={completeCodes} />;
}
