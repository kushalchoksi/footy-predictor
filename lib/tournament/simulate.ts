import type { Competition, Fixture, OutcomeMap, Standing, TeamId } from "@/types";
import { defaultRng, type RNG } from "@/lib/rng";
import { simulate, type SimStrategy } from "@/lib/simulate";
import { projectTournament } from "@/lib/tournament/projection";

/** "groups" — only the group/league phase scores. "all" — groups then the whole
 *  knockout bracket, auto-picking a winner for every tie through to the final. */
export type SimScope = "groups" | "all";

export interface TournamentSimRequest {
  strategy: SimStrategy;
  scope: SimScope;
  /** true → "Simulate all" (replace unlocked picks); false → "Simulate rest" (keep the user's picks). */
  overwrite: boolean;
  rng?: RNG;
}

export interface TournamentSimResult {
  outcomes: OutcomeMap;
  bracketChoices: Record<string, TeamId>;
}

// Logistic spread (in rating points) for knockout win probability. A ~5-point
// rating edge ≈ a 73% favourite; equal ratings ≈ a coin flip.
const KNOCKOUT_K = 5;

function isGroupFixture(f: Fixture): boolean {
  return (f.group != null && f.group.length > 0) || f.stage === "LEAGUE_STAGE";
}

/** simulate() reads scoring rates from the base standings, but tournament rosters
 *  often aren't in there pre-kickoff. Add a zeroed row for every group team so each
 *  group fixture actually gets scored. */
function baseWithGroupTeams(base: Standing[], groupFixtures: Fixture[]): Standing[] {
  const have = new Set(base.map((s) => s.team.id));
  const out = [...base];
  for (const f of groupFixtures) {
    for (const t of [f.homeTeam, f.awayTeam]) {
      if (have.has(t.id)) continue;
      have.add(t.id);
      out.push({
        team: t, position: 0, playedGames: 0,
        won: 0, draw: 0, lost: 0, points: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      });
    }
  }
  return out;
}

/** A coarse strength score from a team's (projected) group performance. Used to
 *  weight knockout picks under the "market" strategy. */
function ratingsFrom(groupStandings: Map<string, Standing[]>): Map<TeamId, number> {
  const ratings = new Map<TeamId, number>();
  for (const standings of groupStandings.values()) {
    for (const s of standings) {
      ratings.set(s.team.id, s.points + 0.45 * s.goalDifference + 0.05 * s.goalsFor);
    }
  }
  return ratings;
}

function winProbHome(ratings: Map<TeamId, number>, home: TeamId, away: TeamId): number {
  const diff = (ratings.get(home) ?? 0) - (ratings.get(away) ?? 0);
  return 1 / (1 + Math.exp(-diff / KNOCKOUT_K));
}

/**
 * Simulate a tournament: fill in group/league-phase scores, then (for the "all"
 * scope) walk the knockout rounds picking a winner for every resolved tie until a
 * champion is crowned. Group scores reuse the shared match model; knockout picks
 * are weighted by simulated group form ("market") or a coin flip ("random").
 *
 * Honours the user's existing picks: locked outcomes are always kept, and
 * "Simulate rest" (overwrite=false) only fills fixtures/ties the user left unset.
 */
export function simulateTournament(
  competition: Competition,
  base: Standing[],
  fixtures: Fixture[],
  current: { outcomes: OutcomeMap; bracketChoices?: Record<string, TeamId> },
  req: TournamentSimRequest,
): TournamentSimResult {
  const rng = req.rng ?? defaultRng;
  const groupFixtures = fixtures.filter(isGroupFixture);

  // 1. Group / league-phase scores.
  const simBase = baseWithGroupTeams(base, groupFixtures);
  const outcomes = simulate(simBase, groupFixtures, current.outcomes, {
    overwriteUnlocked: req.overwrite,
    strategy: req.strategy,
    rng,
  });

  // 2. Knockout bracket. "groups" scope leaves bracket picks untouched; stale ones
  //    are harmlessly ignored by the projection if seeding changed.
  if (req.scope !== "all") {
    return { outcomes, bracketChoices: current.bracketChoices ?? {} };
  }

  // "Simulate all" starts the bracket fresh; "Simulate rest" keeps the user's picks.
  const choices: Record<string, TeamId> = req.overwrite ? {} : { ...(current.bracketChoices ?? {}) };

  // Resolve round by round: each pass advances winners into the next round's ties,
  // which become pickable on the following pass. Bounded by the number of rounds.
  for (let pass = 0; pass < 8; pass++) {
    const projection = projectTournament(competition, base, fixtures, outcomes, choices);
    const ratings = ratingsFrom(projection.groupStandings);
    let picked = 0;
    for (const tie of projection.bracket) {
      if (!tie.homeTeam || !tie.awayTeam) continue;
      // A tie that's already been played carries its fixture and is locked to the
      // real winner by the projection — never overwrite it with a simulated pick.
      if (tie.fixtures.some((f) => f.status === "FINISHED")) continue;
      const existing = choices[tie.id];
      // Keep a valid existing pick; drop one that no longer names either team here.
      if (existing !== undefined) {
        if (existing === tie.homeTeam.id || existing === tie.awayTeam.id) continue;
        delete choices[tie.id];
      }
      const pHome = req.strategy === "market"
        ? winProbHome(ratings, tie.homeTeam.id, tie.awayTeam.id)
        : 0.5;
      choices[tie.id] = rng() < pHome ? tie.homeTeam.id : tie.awayTeam.id;
      picked++;
    }
    if (picked === 0) break;
  }

  return { outcomes, bracketChoices: choices };
}
