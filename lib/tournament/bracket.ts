import type { BracketTemplate, BracketTie, Fixture, TeamId, TournamentStage } from "@/types";

const ROUND_ORDER: TournamentStage[] = [
  "PLAYOFFS", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL",
];

/**
 * Build the bracket skeleton from the template and attach any fixtures from the API
 * whose stage matches a round. Fixtures are attached in array order: the i-th
 * fixture of a stage attaches to the i-th tie of that stage's template.
 *
 * If a fixture has known teams (the API already resolved them — real result or
 * a published draw), the tie's homeTeam/awayTeam are seeded from the fixture.
 */
export function buildBracket(template: BracketTemplate, fixtures: Fixture[]): BracketTie[] {
  const ties: BracketTie[] = [];
  for (const stage of ROUND_ORDER) {
    const round = template.rounds[stage];
    if (!round) continue;
    const stageFixtures = fixtures.filter((f) => f.stage === stage);
    round.forEach((r, idx) => {
      const fix = stageFixtures[idx];
      ties.push({
        id: r.id,
        stage,
        feederHome: r.feederHome,
        feederAway: r.feederAway,
        homeTeam: fix?.homeTeam,
        awayTeam: fix?.awayTeam,
        fixtures: fix ? [fix] : [],
      });
    });
  }
  return ties;
}

/**
 * Walk the bracket in template order, filling each tie's home/away from its
 * feeder ties' chosen winners.
 */
export function resolveBracket(
  ties: BracketTie[],
  choices: Record<string, TeamId>,
): BracketTie[] {
  const byId = new Map(ties.map((t) => [t.id, { ...t }]));

  function winnerOf(tieId: string) {
    const t = byId.get(tieId);
    if (!t) return undefined;
    const winnerId = choices[tieId];
    if (winnerId === undefined) return undefined;
    if (t.homeTeam?.id === winnerId) return t.homeTeam;
    if (t.awayTeam?.id === winnerId) return t.awayTeam;
    return undefined;
  }

  for (const stage of ROUND_ORDER) {
    for (const t of byId.values()) {
      if (t.stage !== stage) continue;
      if (!t.homeTeam && t.feederHome) t.homeTeam = winnerOf(t.feederHome);
      if (!t.awayTeam && t.feederAway) t.awayTeam = winnerOf(t.feederAway);
    }
  }

  return [...byId.values()];
}
