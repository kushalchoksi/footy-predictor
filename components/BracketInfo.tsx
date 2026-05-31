import type { Competition, TournamentStage } from "@/types";

const FIRST_ROUND_LABEL: Partial<Record<TournamentStage, string>> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
};

function firstRound(competition: Competition): { stage: TournamentStage; slots: number } | null {
  const order: TournamentStage[] = ["LAST_32", "LAST_16"];
  for (const stage of order) {
    const ties = competition.bracketTemplate?.rounds[stage];
    if (ties?.length) return { stage, slots: ties.length * 2 };
  }
  return null;
}

/**
 * Explains how teams get into the knockout bracket — in particular the
 * best-third-placed qualifiers (Euro/World Cup) and the Champions League playoff
 * path — since that's the non-obvious part of the seeding.
 */
export default function BracketInfo({ competition }: { competition: Competition }) {
  const isLeaguePhase = Boolean(competition.bracketTemplate?.rounds.PLAYOFFS);

  if (isLeaguePhase) {
    return (
      <Panel>
        <strong className="font-semibold text-fg">Top 8</strong> of the league phase go straight to the
        Round of 16. Teams finishing <strong className="font-semibold text-fg">9th–24th</strong> enter the
        playoff round (9 v 24, 10 v 23, … 16 v 17); the 8 winners take the remaining Round of 16 places.
        Teams ranked 25th and below are eliminated.
      </Panel>
    );
  }

  const fr = firstRound(competition);
  const groups = competition.groupCount ?? 0;
  if (!fr || groups === 0) return null;

  const direct = groups * 2;
  const thirds = fr.slots - direct;
  const roundLabel = FIRST_ROUND_LABEL[fr.stage] ?? "knockout round";

  return (
    <Panel>
      The <strong className="font-semibold text-fg">top two</strong> from each of the {groups} groups qualify
      for the {roundLabel} ({direct} teams)
      {thirds > 0 ? (
        <>
          , joined by the <strong className="font-semibold text-fg">{thirds} best third-placed teams</strong>{" "}
          across all groups — ranked by points, then goal difference, then goals scored.
        </>
      ) : (
        <>.</>
      )}
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-muted">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
        How teams qualify
      </div>
      <p>{children}</p>
    </div>
  );
}
