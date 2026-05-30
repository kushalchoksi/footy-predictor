import type { Competition } from "@/types";
import CompetitionCard from "@/components/CompetitionCard";

interface Props {
  competitions: Competition[];
}

export default function HomeGrid({ competitions }: Props) {
  const leagues = competitions.filter((c) => c.format === "league");
  const tournaments = competitions.filter((c) => c.format === "tournament");

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Leagues</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((c) => <CompetitionCard key={c.code} competition={c} />)}
        </div>
      </section>

      {tournaments.length > 0 && (
        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Tournaments</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((c) => <CompetitionCard key={c.code} competition={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}
