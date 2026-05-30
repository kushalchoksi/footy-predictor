"use client";

import type { BracketTie, TeamId, TournamentStage } from "@/types";
import TeamCrest from "@/components/TeamCrest";

interface Props {
  ties: BracketTie[];
  choices: Record<string, TeamId>;
  onPick: (tieId: string, teamId: TeamId) => void;
}

const STAGE_ORDER: TournamentStage[] = [
  "PLAYOFFS", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL",
];

const STAGE_LABEL: Record<TournamentStage, string> = {
  PLAYOFFS: "Playoffs",
  LEAGUE_STAGE: "League phase",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  FINAL: "Final",
  GROUP_STAGE: "Group stage",
  THIRD_PLACE: "3rd-place playoff",
};

export default function Bracket({ ties, choices, onPick }: Props) {
  const stages = STAGE_ORDER.filter((s) => ties.some((t) => t.stage === s));
  if (stages.length === 0) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
        No knockout bracket available for this competition.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit gap-4 p-2">
        {stages.map((stage) => (
          <div key={stage} className="flex min-w-[200px] flex-col gap-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {STAGE_LABEL[stage]}
            </h3>
            {ties.filter((t) => t.stage === stage).map((tie) => (
              <BracketTieCard
                key={tie.id}
                tie={tie}
                winnerId={choices[tie.id]}
                onPick={onPick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketTieCard({
  tie, winnerId, onPick,
}: {
  tie: BracketTie;
  winnerId: TeamId | undefined;
  onPick: (tieId: string, teamId: TeamId) => void;
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950">
      <Slot tie={tie} team={tie.homeTeam} feeder={tie.feederHome} winnerId={winnerId} onPick={onPick} />
      <div className="border-t border-zinc-800" />
      <Slot tie={tie} team={tie.awayTeam} feeder={tie.feederAway} winnerId={winnerId} onPick={onPick} />
    </div>
  );
}

function Slot({
  tie, team, feeder, winnerId, onPick,
}: {
  tie: BracketTie;
  team: BracketTie["homeTeam"];
  feeder: string | undefined;
  winnerId: TeamId | undefined;
  onPick: (tieId: string, teamId: TeamId) => void;
}) {
  const isWinner = team && winnerId === team.id;
  const clickable = !!team;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => team && onPick(tie.id, team.id)}
      className={
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition " +
        (clickable ? "hover:bg-zinc-900 " : "cursor-not-allowed text-zinc-600 ") +
        (isWinner ? "bg-emerald-950/40 font-semibold text-emerald-200" : "text-zinc-300")
      }
    >
      {team ? (
        <>
          <TeamCrest team={team} size={14} />
          <span className="truncate">{team.shortName}</span>
        </>
      ) : (
        <span className="italic text-zinc-500">Winner of {feeder ?? "TBD"}</span>
      )}
    </button>
  );
}
