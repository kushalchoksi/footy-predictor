import { pairKey, type BracketTemplate, type BracketTie, type Fixture, type TeamId, type TournamentStage } from "@/types";

const ROUND_ORDER: TournamentStage[] = [
  "PLAYOFFS", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL",
];

/**
 * The winning team id of a FINISHED knockout fixture, or undefined when it isn't
 * finished or the winner can't be determined. Knockouts can't end level, so a draw
 * after extra time is decided by the penalty shoot-out score; if a tie is level with
 * no shoot-out data, we return undefined rather than guess.
 */
export function finishedWinnerId(f: Fixture): TeamId | undefined {
  if (f.status !== "FINISHED" || f.homeGoals === null || f.awayGoals === null) return undefined;
  if (f.homeGoals > f.awayGoals) return f.homeTeam.id;
  if (f.awayGoals > f.homeGoals) return f.awayTeam.id;
  const hp = f.homePenalties, ap = f.awayPenalties;
  if (hp != null && ap != null && hp !== ap) return hp > ap ? f.homeTeam.id : f.awayTeam.id;
  return undefined;
}

/** Key a finished knockout fixture by stage + its unordered team pair, so a tie only
 *  locks to a result when its resolved matchup IS that exact real match. */
function finishedKey(stage: TournamentStage, a: TeamId, b: TeamId): string {
  return `${stage}|${pairKey(a, b)}`;
}

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
 *
 * `finishedFixtures` are real, completed knockout matches. Once a tie's matchup is
 * resolved, if it exactly equals a finished fixture (same stage + same two teams,
 * in either order) the fixture is attached and that tie is LOCKED to the real
 * winner — overriding any user pick and propagating the actual winner forward. This
 * only fires when the (possibly simulated) projection lands on the real matchup, so
 * simulating different group results still yields a fully editable bracket.
 */
export function resolveBracket(
  ties: BracketTie[],
  choices: Record<string, TeamId>,
  finishedFixtures: Fixture[] = [],
): BracketTie[] {
  const byId = new Map(ties.map((t) => [t.id, { ...t }]));

  // Real finished knockout results, keyed by stage + unordered team pair.
  const finishedByKey = new Map<string, Fixture>();
  for (const f of finishedFixtures) {
    if (f.status !== "FINISHED" || f.stage === undefined) continue;
    finishedByKey.set(finishedKey(f.stage, f.homeTeam.id, f.awayTeam.id), f);
  }

  // tieId -> winner forced by a real result; consulted ahead of the user's pick.
  const locked: Record<string, TeamId> = {};

  function winnerOf(tieId: string) {
    const t = byId.get(tieId);
    if (!t) return undefined;
    const winnerId = locked[tieId] ?? choices[tieId];
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
      // Lock to a real result when this exact pairing has been played.
      if (t.homeTeam && t.awayTeam) {
        const fix = finishedByKey.get(finishedKey(t.stage, t.homeTeam.id, t.awayTeam.id));
        const winnerId = fix && finishedWinnerId(fix);
        if (fix && winnerId !== undefined) {
          t.fixtures = [fix];
          locked[t.id] = winnerId;
        }
      }
    }
  }

  return [...byId.values()];
}
