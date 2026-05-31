"use client";

import type { Fixture, Outcome, OutcomeMap, Standing, Team } from "@/types";
import TeamCrest from "@/components/TeamCrest";
import FlipClockDigit from "@/components/FlipClockDigit";
import { LEAGUE_PHASE_GROUP } from "@/lib/tournament/groupStage";

interface Props {
  groupName: string;
  fixtures: Fixture[];
  standings: Standing[];
  qualified: Team[];
  outcomes: OutcomeMap;
  onSetScore: (fixtureId: number, homeScore: number, awayScore: number) => void;
  onClear: (fixtureId: number) => void;
}

function displayGroupName(raw: string): string {
  if (raw === LEAGUE_PHASE_GROUP) return "League phase";
  return raw.replace(/_/g, " ");
}

export default function GroupCard({
  groupName, fixtures, standings, qualified, outcomes,
  onSetScore, onClear,
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
            onSetScore={(h, a) => onSetScore(fix.id, h, a)}
            onClear={() => onClear(fix.id)}
          />
        ))}
      </ul>
    </div>
  );
}

/** Default scoreline shown when a scheduled match has no scoreline yet. Derived
 *  from the pick's result kind (so a kind-only pick reads as 1–0 / 0–0) or 0–0. */
function defaultScores(outcome: Outcome | undefined): { home: number; away: number } {
  return {
    home: outcome?.homeScore ?? (outcome?.kind === "H" ? 1 : 0),
    away: outcome?.awayScore ?? (outcome?.kind === "A" ? 1 : 0),
  };
}

function FixtureRow({
  fixture, outcome, onSetScore, onClear,
}: {
  fixture: Fixture;
  outcome: Outcome | undefined;
  onSetScore: (homeScore: number, awayScore: number) => void;
  onClear: () => void;
}) {
  const finished = fixture.status === "FINISHED";
  const homeScore = finished ? (fixture.homeGoals ?? 0) : defaultScores(outcome).home;
  const awayScore = finished ? (fixture.awayGoals ?? 0) : defaultScores(outcome).away;
  const hasPick = !finished && outcome !== undefined;

  return (
    <li className="flex items-center gap-1.5 rounded bg-surface-2/40 px-2 py-1 text-[11px]">
      <TeamCrest team={fixture.homeTeam} size={16} />
      <span className="flex-1 truncate text-right">{fixture.homeTeam.shortName}</span>

      <FlipClockDigit
        value={homeScore}
        onChange={(n) => onSetScore(n, awayScore)}
        disabled={finished}
        size={26}
        label={`${fixture.homeTeam.shortName} goals`}
      />
      <span className="font-mono text-faint">–</span>
      <FlipClockDigit
        value={awayScore}
        onChange={(n) => onSetScore(homeScore, n)}
        disabled={finished}
        size={26}
        label={`${fixture.awayTeam.shortName} goals`}
      />

      <span className="flex-1 truncate">{fixture.awayTeam.shortName}</span>
      <TeamCrest team={fixture.awayTeam} size={16} />

      <button
        type="button"
        onClick={onClear}
        className={"text-faint hover:text-fg " + (hasPick ? "" : "invisible")}
        aria-label="Clear pick"
      >
        ×
      </button>
    </li>
  );
}
