import type { BracketTemplate, Competition, SeedSlot, Standing, Team, TeamId, TournamentStage } from "@/types";
import { LEAGUE_PHASE_GROUP } from "@/lib/tournament/groupStage";
import { assignThirdPlaced } from "@/lib/tournament/worldCup2026";

/** Team assignments for a single first-round tie. A slot left undefined is filled
 *  later from a feeder tie's winner (used by the Champions League playoff round). */
export interface FirstRoundSeed {
  home?: Team;
  away?: Team;
}

export interface SeedingResult {
  /** tieId -> seeded teams for first-round ties. */
  seeds: Record<string, FirstRoundSeed>;
  /** Every team that reaches the knockout/playoff phase (used for group highlights). */
  qualifiedIds: Set<TeamId>;
}

const EMPTY: SeedingResult = { seeds: {}, qualifiedIds: new Set() };

/** Group/league-phase ranking comparator: points, then GD, then GF, then a stable
 *  id tiebreak so seeding is deterministic even with zeroed (pre-tournament) data. */
function compareStanding(a: Standing, b: Standing): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.id - b.team.id;
}

/**
 * Seed a tournament's first knockout round from the projected group standings.
 *
 * Traditional group tournaments (Euro, World Cup): qualify the top two of each
 * group plus the best third-placed teams needed to fill the bracket, then pair
 * them by standard high-vs-low seeding (1 v 16, 2 v 15, ...). This is a pragmatic,
 * deterministic seeding — not the official combination-table pairing.
 *
 * Champions League (single Swiss league phase): ranks 1–8 are seeded directly into
 * the Round of 16 home slots; ranks 9–24 contest the playoff round (9 v 24, 10 v 23,
 * ...), whose winners feed the R16 away slots via the template's feeders.
 */
export function seedBracket(competition: Competition, groupStandings: Map<string, Standing[]>): SeedingResult {
  const template = competition.bracketTemplate;
  if (!template) return EMPTY;

  if (groupStandings.has(LEAGUE_PHASE_GROUP)) {
    return seedLeaguePhase(competition, groupStandings.get(LEAGUE_PHASE_GROUP)!);
  }
  if (hasSlotSpecs(template)) {
    return seedFromSlots(competition, groupStandings);
  }
  return seedTraditional(competition, groupStandings);
}

function firstKnockoutStage(competition: Competition): TournamentStage | undefined {
  const order: TournamentStage[] = ["LAST_32", "LAST_16"];
  return order.find((s) => competition.bracketTemplate?.rounds[s]?.length);
}

/** A template seeds via fixed group-position slots (e.g. the World Cup's official
 *  round of 32) when its first knockout round declares homeSlot/awaySlot. */
function hasSlotSpecs(template: BracketTemplate): boolean {
  const order: TournamentStage[] = ["LAST_32", "LAST_16"];
  const stage = order.find((s) => template.rounds[s]?.length);
  const ties = stage ? template.rounds[stage] : undefined;
  return Boolean(ties?.some((t) => t.homeSlot || t.awaySlot));
}

/**
 * Seed a fixed group-position bracket (the World Cup's official round of 32):
 * winners and runners-up drop into their predetermined slots, and the eight best
 * third-placed teams are allocated to specific winners via FIFA's combination
 * table — NOT generic high-vs-low reseeding. Returns EMPTY if the group data is
 * incomplete (so the bracket falls back to the API-resolved one).
 */
function seedFromSlots(competition: Competition, groupStandings: Map<string, Standing[]>): SeedingResult {
  const stage = firstKnockoutStage(competition);
  const ties = stage ? competition.bracketTemplate?.rounds[stage] : undefined;
  if (!stage || !ties || ties.length === 0) return EMPTY;

  // Per-group winner / runner-up / third from the projected standings.
  const winnerOf = new Map<string, Team>();
  const runnerOf = new Map<string, Team>();
  const thirdOf = new Map<string, Standing>();
  for (const [key, rows] of groupStandings) {
    const letter = key.startsWith("GROUP_") ? key.slice("GROUP_".length) : key;
    if (rows[0]) winnerOf.set(letter, rows[0].team);
    if (rows[1]) runnerOf.set(letter, rows[1].team);
    if (rows[2]) thirdOf.set(letter, rows[2]);
  }

  // Rank all third-placed teams and take as many as there are third-place slots
  // (8 for the World Cup), then look up which winner each one faces.
  const thirdSlots = ties.reduce(
    (n, t) => n + (isThirdSlot(t.homeSlot) ? 1 : 0) + (isThirdSlot(t.awaySlot) ? 1 : 0),
    0,
  );
  let thirdAssignment: Record<string, string> | null = null;
  if (thirdSlots > 0) {
    const ranked = [...thirdOf.entries()].sort((a, b) => compareStanding(a[1], b[1]));
    if (ranked.length < thirdSlots) return EMPTY;
    const bestThirdGroups = ranked.slice(0, thirdSlots).map(([letter]) => letter);
    thirdAssignment = assignThirdPlaced(bestThirdGroups);
    if (!thirdAssignment) return EMPTY;
  }

  const resolve = (slot: SeedSlot | undefined): Team | undefined => {
    if (!slot) return undefined;
    if ("winner" in slot) return winnerOf.get(slot.winner);
    if ("runnerUp" in slot) return runnerOf.get(slot.runnerUp);
    const thirdGroup = thirdAssignment?.[slot.thirdFor];
    return thirdGroup ? thirdOf.get(thirdGroup)?.team : undefined;
  };

  const seeds: Record<string, FirstRoundSeed> = {};
  const qualifiedIds = new Set<TeamId>();
  for (const tie of ties) {
    const home = resolve(tie.homeSlot);
    const away = resolve(tie.awaySlot);
    if (!home || !away) return EMPTY;
    seeds[tie.id] = { home, away };
    qualifiedIds.add(home.id);
    qualifiedIds.add(away.id);
  }
  return { seeds, qualifiedIds };
}

function isThirdSlot(slot: SeedSlot | undefined): boolean {
  return Boolean(slot && "thirdFor" in slot);
}

function seedTraditional(competition: Competition, groupStandings: Map<string, Standing[]>): SeedingResult {
  const stage = firstKnockoutStage(competition);
  const ties = stage ? competition.bracketTemplate?.rounds[stage] : undefined;
  if (!stage || !ties || ties.length === 0) return EMPTY;

  const slots = ties.length * 2;
  const groupKeys = [...groupStandings.keys()].filter((k) => k !== LEAGUE_PHASE_GROUP).sort();

  const winners: Standing[] = [];
  const runners: Standing[] = [];
  const thirds: Standing[] = [];
  for (const key of groupKeys) {
    const rows = groupStandings.get(key)!;
    if (rows[0]) winners.push(rows[0]);
    if (rows[1]) runners.push(rows[1]);
    if (rows[2]) thirds.push(rows[2]);
  }

  const thirdsNeeded = slots - winners.length - runners.length;
  const bestThirds = [...thirds].sort(compareStanding).slice(0, Math.max(0, thirdsNeeded));
  const seedOrder = [...winners, ...runners, ...bestThirds];

  // Only seed when we can fill every slot; otherwise leave the bracket empty
  // (matches prior behaviour when group data is incomplete).
  if (seedOrder.length !== slots) return EMPTY;

  const seeds: Record<string, FirstRoundSeed> = {};
  const qualifiedIds = new Set<TeamId>();
  for (let i = 0; i < ties.length; i++) {
    const home = seedOrder[i].team;
    const away = seedOrder[slots - 1 - i].team;
    seeds[ties[i].id] = { home, away };
    qualifiedIds.add(home.id);
    qualifiedIds.add(away.id);
  }
  return { seeds, qualifiedIds };
}

function seedLeaguePhase(competition: Competition, league: Standing[]): SeedingResult {
  const r16 = competition.bracketTemplate?.rounds.LAST_16 ?? [];
  const playoffs = competition.bracketTemplate?.rounds.PLAYOFFS ?? [];
  if (league.length < 24 || r16.length < 8 || playoffs.length < 8) return EMPTY;

  const seeds: Record<string, FirstRoundSeed> = {};
  const qualifiedIds = new Set<TeamId>();

  // Ranks 1–8: byes straight into the Round of 16 (home slot). The away slot is
  // filled from the matching playoff tie's winner via the template feeder.
  const top8 = league.slice(0, 8);
  for (let i = 0; i < 8; i++) {
    seeds[r16[i].id] = { home: top8[i].team };
    qualifiedIds.add(top8[i].team.id);
  }

  // Ranks 9–24: playoff round, paired 9 v 24, 10 v 23, ... 16 v 17.
  const playoffTeams = league.slice(8, 24);
  for (let i = 0; i < 8; i++) {
    const home = playoffTeams[i].team;
    const away = playoffTeams[15 - i].team;
    seeds[playoffs[i].id] = { home, away };
    qualifiedIds.add(home.id);
    qualifiedIds.add(away.id);
  }

  return { seeds, qualifiedIds };
}
