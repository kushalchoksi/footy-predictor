import type { Competition } from "@/types";
import CompetitionCard from "@/components/CompetitionCard";

interface Props {
  competitions: Competition[];
  /** Codes of competitions whose season has fully finished. */
  completeCodes?: string[];
}

export default function HomeGrid({ competitions, completeCodes = [] }: Props) {
  const complete = new Set(completeCodes);
  const leagues = competitions.filter((c) => c.format === "league");
  const tournaments = competitions.filter((c) => c.format === "tournament");

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-faint">Leagues</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((c) => <CompetitionCard key={c.code} competition={c} complete={complete.has(c.code)} />)}
        </div>
      </section>

      {tournaments.length > 0 && (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-faint">Tournaments</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((c) => <CompetitionCard key={c.code} competition={c} complete={complete.has(c.code)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
