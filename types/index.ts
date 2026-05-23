export type TeamId = number;
export type FixtureId = number;

export interface Team {
  id: TeamId;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Standing {
  team: Team;
  position: number;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export type FixtureStatus = "SCHEDULED" | "FINISHED";

export interface Fixture {
  id: FixtureId;
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  status: FixtureStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  utcDate: string;
}

export type OutcomeKind = "H" | "D" | "A";

export interface Outcome {
  kind: OutcomeKind;
  locked: boolean;
  /** Optional explicit scoreline. When absent, fallback +1/0 GD model is used. */
  homeScore?: number;
  awayScore?: number;
}

// Map fixtureId -> Outcome. Absent entries are "unset".
export type OutcomeMap = Record<FixtureId, Outcome>;

export interface Scenario {
  cluster: TeamId[];
  outcomes: OutcomeMap;
}

// Pair key for H2H. Always sorted ascending: `${min}|${max}`.
export type PairKey = string;

export interface H2HEntry {
  // Points and goals from the perspective of the lower-id team.
  lowPts: number;
  highPts: number;
  lowGoals: number;
  highGoals: number;
}

export type H2HMap = Record<PairKey, H2HEntry>;

export function pairKey(a: TeamId, b: TeamId): PairKey {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
