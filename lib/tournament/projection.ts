import type {
  BracketTie, Competition, Fixture, OutcomeMap, Standing, Team, TeamId, TournamentStage,
} from "@/types";
import { CHAINS } from "@/lib/tiebreakers";
import { projectGroups, type GroupStageResult } from "@/lib/tournament/groupStage";
import { buildBracket, resolveBracket } from "@/lib/tournament/bracket";

export interface TournamentProjection {
  groupStandings: Map<string, Standing[]>;
  qualified: Map<string, Team[]>;
  bracket: BracketTie[];
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

  const ties = competition.bracketTemplate
    ? resolveBracket(buildBracket(competition.bracketTemplate, knockoutFixtures), bracketChoices)
    : [];

  const finishingPositions = new Map<TeamId, string>();

  // 1. Everyone who appears in groupStandings starts at "Group stage" (or "League phase" for UCL).
  for (const [groupName, standings] of groups.groupStandings) {
    const label = groupName === "LEAGUE_PHASE" ? "League phase" : "Group stage";
    for (const s of standings) finishingPositions.set(s.team.id, label);
  }

  // 1b. Qualified teams (group winners / runners-up) have at minimum reached the first knockout round.
  //     Determine the first knockout stage present in the bracket template.
  const firstKnockoutStage = competition.bracketTemplate
    ? KNOCKOUT_ORDER.find((s) => competition.bracketTemplate!.rounds[s]?.length)
    : undefined;
  if (firstKnockoutStage) {
    for (const qualifiedTeams of groups.qualified.values()) {
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
      const winnerId = bracketChoices[tie.id];
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
    qualified: groups.qualified,
    bracket: ties,
    finishingPositions,
  };
}
