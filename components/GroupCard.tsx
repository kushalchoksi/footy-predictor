"use client";

import type { Fixture, Outcome, OutcomeKind, OutcomeMap, Standing, Team } from "@/types";
import TeamCrest from "@/components/TeamCrest";
import { LEAGUE_PHASE_GROUP } from "@/lib/tournament/groupStage";

interface Props {
  groupName: string;
  fixtures: Fixture[];
  standings: Standing[];
  qualified: Team[];
  outcomes: OutcomeMap;
  onPickOutcome: (fixtureId: number, kind: OutcomeKind) => void;
  onClear: (fixtureId: number) => void;
}

function displayGroupName(raw: string): string {
  if (raw === LEAGUE_PHASE_GROUP) return "League phase";
  return raw.replace(/_/g, " ");
}

export default function GroupCard({
  groupName, fixtures, standings, qualified, outcomes,
  onPickOutcome, onClear,
}: Props) {
  const qualifiedIds = new Set(qualified.map((t) => t.id));
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <h3 className="text-sm font-semibold text-fg">{displayGroupName(groupName)}</h3>

      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-faint">
          <tr>
            <th className="text-left">Team</th>
            <th className="text-right">P</th>
            <th className="text-right">GD</th>
            <th className="text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.team.id} className={qualifiedIds.has(row.team.id) ? "bg-emerald-100 dark:bg-emerald-950/30" : ""}>
              <td className="py-1">
                <div className="flex items-center gap-2">
                  <TeamCrest team={row.team} size={14} />
                  <span className="truncate">{row.team.shortName}</span>
                </div>
              </td>
              <td className="text-right">{row.playedGames}</td>
              <td className="text-right">{row.goalDifference}</td>
              <td className="text-right font-semibold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="space-y-1">
        {fixtures.map((fix) => (
          <FixtureRow
            key={fix.id}
            fixture={fix}
            outcome={outcomes[fix.id]}
            onPickOutcome={(kind) => onPickOutcome(fix.id, kind)}
            onClear={() => onClear(fix.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function FixtureRow({
  fixture, outcome, onPickOutcome, onClear,
}: {
  fixture: Fixture;
  outcome: Outcome | undefined;
  onPickOutcome: (kind: OutcomeKind) => void;
  onClear: () => void;
}) {
  const finished = fixture.status === "FINISHED";
  const finalKind: OutcomeKind | null = finished
    ? (fixture.homeGoals ?? 0) > (fixture.awayGoals ?? 0) ? "H"
    : (fixture.homeGoals ?? 0) < (fixture.awayGoals ?? 0) ? "A" : "D"
    : null;
  const activeKind = outcome?.kind ?? finalKind;

  return (
    <li className="flex items-center gap-2 rounded bg-surface-2/40 px-2 py-1 text-[11px]">
      <span className="flex-1 truncate text-right">{fixture.homeTeam.shortName}</span>

      <Pick label="1" active={activeKind === "H"} disabled={finished} onClick={() => onPickOutcome("H")} />
      <Pick label="X" active={activeKind === "D"} disabled={finished} onClick={() => onPickOutcome("D")} />
      <Pick label="2" active={activeKind === "A"} disabled={finished} onClick={() => onPickOutcome("A")} />

      <span className="flex-1 truncate">{fixture.awayTeam.shortName}</span>

      {!finished && outcome && (
        <button
          type="button"
          onClick={onClear}
          className="text-faint hover:text-fg"
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </li>
  );
}

function Pick({
  label, active, disabled, onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "h-5 w-5 rounded text-[10px] font-semibold transition " +
        (active
          ? "bg-emerald-700 text-white"
          : disabled
            ? "bg-surface-2 text-faint"
            : "bg-surface-2 text-muted hover:bg-surface-3")
      }
    >
      {label}
    </button>
  );
}
