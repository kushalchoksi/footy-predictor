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

export type TournamentStage =
  | "LEAGUE_STAGE"
  | "GROUP_STAGE"
  | "LAST_32" | "LAST_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "FINAL"
  | "THIRD_PLACE"
  | "PLAYOFFS";

export interface Fixture {
  id: FixtureId;
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  status: FixtureStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  utcDate: string;
  group?: string;
  stage?: TournamentStage;
  legNumber?: number;
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

// ──────────────────────────────────────────────────────────────────────────
// Multi-competition types (added 2026-05-29)
// ──────────────────────────────────────────────────────────────────────────

export type CompetitionFormat = "league" | "tournament";

export type TiebreakerChainId =
  | "epl" | "laLiga" | "bundesliga" | "serieA" | "ligue1"
  | "eredivisie" | "primeira" | "championship" | "brasileirao"
  | "uefa" | "fifa";

export type TiebreakerRuleId =
  | "points" | "goalDifference" | "goalsFor" | "goalsAway"
  | "wins" | "headToHead" | "headToHeadGD" | "headToHeadGoals"
  | "playoffFlag";

export interface TiebreakerChain {
  id: TiebreakerChainId;
  rules: TiebreakerRuleId[];
}

export type BandColor = "ucl" | "uel" | "uecl" | "relegation" | "promotion" | "playoff";

export interface QualificationBand {
  positions: number[];
  label: string;
  color: BandColor;
}

export interface BracketTemplateRound {
  id: string;             // synthetic, e.g. "QF1"
  feederHome?: string;    // tie id whose winner fills the home slot
  feederAway?: string;
}

export interface BracketTemplate {
  rounds: Partial<Record<TournamentStage, BracketTemplateRound[]>>;
}

export interface Competition {
  code: string;
  name: string;
  country: string;
  emblem: string;
  format: CompetitionFormat;
  tiebreaker: TiebreakerChainId;
  season: { startYear: number; label: string };
  bands?: QualificationBand[];
  groupCount?: number;
  bracketTemplate?: BracketTemplate;
}

export interface BracketTie {
  id: string;
  stage: TournamentStage;
  homeTeam?: Team;
  awayTeam?: Team;
  feederHome?: string;
  feederAway?: string;
  fixtures: Fixture[];
}
