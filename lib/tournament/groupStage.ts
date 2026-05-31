import type { Fixture, OutcomeMap, Standing, Team, TiebreakerChain } from "@/types";
import { projectStandings } from "@/lib/scenario";
import { sortByChain } from "@/lib/tiebreakers";

export const LEAGUE_PHASE_GROUP = "LEAGUE_PHASE";

export interface GroupStageResult {
  groupStandings: Map<string, Standing[]>;
  qualified: Map<string, Team[]>;
}

/**
 * Partitions group-stage / league-phase fixtures by group, projects mini-standings per group,
 * and returns the top N teams in each group as 'qualified'.
 *
 * Inclusion rule for a fixture:
 *   - has a non-empty `group` (traditional GROUP_STAGE), OR
 *   - has `stage === "LEAGUE_STAGE"` (UCL Swiss model — synthetic group LEAGUE_PHASE).
 * Knockout fixtures (stage set, not LEAGUE_STAGE, no group) are skipped.
 */
export function projectGroups(
  baseStandings: Standing[],
  fixtures: Fixture[],
  outcomes: OutcomeMap,
  chain: TiebreakerChain,
  topN = 2,
): GroupStageResult {
  const byGroup = new Map<string, Fixture[]>();
  for (const fix of fixtures) {
    const key =
      fix.group && fix.group.length > 0 ? fix.group :
      fix.stage === "LEAGUE_STAGE" ? LEAGUE_PHASE_GROUP :
      undefined;
    if (!key) continue;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(fix);
  }

  const groupStandings = new Map<string, Standing[]>();
  const qualified = new Map<string, Team[]>();

  for (const [group, groupFixtures] of byGroup) {
    const groupTeamIds = new Set<number>();
    for (const f of groupFixtures) {
      groupTeamIds.add(f.homeTeam.id);
      groupTeamIds.add(f.awayTeam.id);
    }
    const groupBase = baseStandings.filter((s) => groupTeamIds.has(s.team.id));

    // Synthesize zeroed standings for any group team not in the base array.
    // (Tournaments often have no pre-existing standings before the first match.)
    const haveIds = new Set(groupBase.map((s) => s.team.id));
    for (const f of groupFixtures) {
      for (const t of [f.homeTeam, f.awayTeam]) {
        if (haveIds.has(t.id)) continue;
        haveIds.add(t.id);
        groupBase.push({
          team: t, position: 0, playedGames: 0,
          won: 0, draw: 0, lost: 0, points: 0,
          goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
        });
      }
    }

    const projected = projectStandings(groupBase, groupFixtures, outcomes);
    const { sorted } = sortByChain(projected.standings, projected.h2h, chain);
    groupStandings.set(group, sorted);
    qualified.set(group, sorted.slice(0, topN).map((s) => s.team));
  }

  return { groupStandings, qualified };
}
