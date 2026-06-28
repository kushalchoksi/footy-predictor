import type {
  BracketTie, Competition, Fixture, OutcomeMap, Standing, Team, TeamId, TournamentStage,
} from "@/types";
import { CHAINS } from "@/lib/tiebreakers";
import { projectGroups, type GroupStageResult } from "@/lib/tournament/groupStage";
import { buildBracket, finishedWinnerId, resolveBracket } from "@/lib/tournament/bracket";
import { seedBracket } from "@/lib/tournament/seeding";

export interface TournamentProjection {
  groupStandings: Map<string, Standing[]>;
  qualified: Map<string, Team[]>;
  bracket: BracketTie[];
  /** User picks plus winners forced by real FINISHED knockout results. Drives the
   *  bracket's winner highlight; finished ties are locked to their real winner. */
  bracketChoices: Record<string, TeamId>;
  finishingPositions: Map<TeamId, string>;
}

const STAGE_LABEL: Record<TournamentStage, string> = {
  PLAYOFFS: "Playoffs",
  LEAGUE_STAGE: "League phase",
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  FINAL: "Final",
  GROUP_STAGE: "Group stage",
  THIRD_PLACE: "3rd-place playoff",
};

const KNOCKOUT_ORDER: TournamentStage[] = [
  "PLAYOFFS", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL",
];

export function projectTournament(
  competition: Competition,
  baseStandings: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
  bracketChoices: Record<string, TeamId>,
): TournamentProjection {
  const chain = CHAINS[competition.tiebreaker];

  const groupFixtures = fixtures.filter((f) =>
    (f.group && f.group.length > 0) || f.stage === "LEAGUE_STAGE"
  );
  const knockoutFixtures = fixtures.filter((f) =>
    f.stage !== undefined && f.stage !== "GROUP_STAGE" && f.stage !== "LEAGUE_STAGE"
  );

  const groups: GroupStageResult = projectGroups(baseStandings, groupFixtures, outcomes, chain);

  // Seed the first knockout round from the projected group standings so the bracket
  // reflects the (possibly simulated) group results, then resolve later rounds from
  // their feeders + the user's winner picks.
  const { seeds, qualifiedIds } = seedBracket(competition, groups.groupStandings);
  const seedingActive = qualifiedIds.size > 0;

  // When seeding is active we ignore the API's resolved knockout fixtures for the
  // bracket skeleton — otherwise later rounds would show the real historical teams,
  // which wouldn't follow from the simulated first round. Only when we can't seed (no
  // group data) do we fall back to the API-attached bracket.
  //
  // Either way, real FINISHED knockout results are overlaid by resolveBracket: a tie
  // whose projected matchup IS a completed match gets locked to its real winner. This
  // surfaces results like a played Round-of-32 game while keeping a fully-simulated
  // bracket editable (a different group sim simply won't match the real matchup).
  const finishedKnockout = knockoutFixtures.filter((f) => f.status === "FINISHED");
  const ties = competition.bracketTemplate
    ? resolveBracket(
        buildBracket(competition.bracketTemplate, seedingActive ? [] : knockoutFixtures).map((t) => {
          const seed = seeds[t.id];
          if (!seed) return t;
          return { ...t, homeTeam: seed.home ?? t.homeTeam, awayTeam: seed.away ?? t.awayTeam };
        }),
        bracketChoices,
        finishedKnockout,
      )
    : [];

  // User picks overlaid with winners forced by real results. A locked tie carries its
  // finished fixture; its actual winner overrides any user pick and feeds the rest of
  // the projection (winner highlight, advancement, finishing positions).
  const effectiveChoices: Record<string, TeamId> = { ...bracketChoices };
  for (const t of ties) {
    const fix = t.fixtures.find((f) => f.status === "FINISHED");
    const winnerId = fix && finishedWinnerId(fix);
    if (winnerId !== undefined) effectiveChoices[t.id] = winnerId;
  }

  // Per-group qualifier highlight derived from the seeding (top two + best thirds,
  // or top 24 for the Champions League league phase), not just the raw top two.
  const qualified = new Map<string, Team[]>();
  for (const [groupName, standings] of groups.groupStandings) {
    qualified.set(groupName, standings.filter((s) => qualifiedIds.has(s.team.id)).map((s) => s.team));
  }

  const finishingPositions = new Map<TeamId, string>();

  // 1. Everyone who appears in groupStandings starts at "Group stage" (or "League phase" for UCL).
  for (const [groupName, standings] of groups.groupStandings) {
    const label = groupName === "LEAGUE_PHASE" ? "League phase" : "Group stage";
    for (const s of standings) finishingPositions.set(s.team.id, label);
  }

  // 1b. Qualified teams have at minimum reached the first knockout round.
  //     Determine the first knockout stage present in the bracket template.
  const firstKnockoutStage = competition.bracketTemplate
    ? KNOCKOUT_ORDER.find((s) => competition.bracketTemplate!.rounds[s]?.length)
    : undefined;
  if (firstKnockoutStage) {
    for (const qualifiedTeams of qualified.values()) {
      for (const t of qualifiedTeams) {
        finishingPositions.set(t.id, STAGE_LABEL[firstKnockoutStage]);
      }
    }
  }

  // 2. Anyone with a resolved homeTeam/awayTeam in a bracket tie has reached AT LEAST that round.
  const tiesByStage = new Map<TournamentStage, BracketTie[]>();
  for (const t of ties) {
    if (!tiesByStage.has(t.stage)) tiesByStage.set(t.stage, []);
    tiesByStage.get(t.stage)!.push(t);
  }

  for (const stage of KNOCKOUT_ORDER) {
    const stageTies = tiesByStage.get(stage);
    if (!stageTies) continue;
    for (const tie of stageTies) {
      if (tie.homeTeam) finishingPositions.set(tie.homeTeam.id, STAGE_LABEL[stage]);
      if (tie.awayTeam) finishingPositions.set(tie.awayTeam.id, STAGE_LABEL[stage]);
    }
  }

  // 3. Walk forward through rounds — for each tie with a chosen winner:
  //    - winner advances to next stage label (or "Winner" at FINAL).
  //    - loser stays at the current stage label.
  for (let i = 0; i < KNOCKOUT_ORDER.length; i++) {
    const stage = KNOCKOUT_ORDER[i];
    const stageTies = tiesByStage.get(stage);
    if (!stageTies) continue;
    const nextStage = KNOCKOUT_ORDER.slice(i + 1).find((s) => tiesByStage.get(s)?.length);
    for (const tie of stageTies) {
      const winnerId = effectiveChoices[tie.id];
      if (winnerId === undefined) continue;
      const home = tie.homeTeam;
      const away = tie.awayTeam;
      const loserId = home?.id === winnerId ? away?.id : home?.id;
      if (stage === "FINAL") {
        finishingPositions.set(winnerId, "Winner");
        if (loserId !== undefined) finishingPositions.set(loserId, "Runner-up");
      } else if (nextStage) {
        finishingPositions.set(winnerId, STAGE_LABEL[nextStage]);
      }
    }
  }

  return {
    groupStandings: groups.groupStandings,
    qualified,
    bracket: ties,
    bracketChoices: effectiveChoices,
    finishingPositions,
  };
}
