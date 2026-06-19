import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import type { Fixture, Standing } from "@/types";
import { normalizeTeam, standingsFromResponse, standingsResponseSchema } from "@/lib/footballParse";

// ──────────────────────────────────────────────────────────────────────────
// Discovered tournament fixture shape (football-data.org v4, verified 2026-05-29):
//
// CL (Champions League): NEW SWISS FORMAT — `stage: "LEAGUE_STAGE"`, `group: null`.
//   A single 36-team league phase with 8 matches per team. Knockout stages:
//   LEAGUE_STAGE, PLAYOFFS, LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL.
//   → No groups. The group-stage projection will return an empty map.
//
// EC (Euro 2024): TRADITIONAL — `stage: "GROUP_STAGE"`, `group: "GROUP_A".."GROUP_F"`.
//   Knockout stages: GROUP_STAGE, LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL.
//
// WC (World Cup 2026): TRADITIONAL — `stage: "GROUP_STAGE"`, `group: "GROUP_A".."GROUP_L"`.
//   Knockout stages: GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS,
//                    THIRD_PLACE, FINAL.
//   → LAST_32 (R32) feeds LAST_16. THIRD_PLACE is a separate one-off tie.
// ──────────────────────────────────────────────────────────────────────────

const BASE = "https://api.football-data.org/v4";
const REVALIDATE_SECONDS = 120;

// Knockout fixtures in tournaments can have unresolved teams (placeholders for
// winners of feeder ties). The API returns all team fields as null in that case.
const maybeTeamSchema = z.object({
  id: z.number().nullable(),
  name: z.string().nullable(),
  shortName: z.string().nullable(),
  tla: z.string().nullable(),
  crest: z.string().nullable(),
});

const matchSchema = z.object({
  id: z.number(),
  matchday: z.number().nullable(),
  homeTeam: maybeTeamSchema,
  awayTeam: maybeTeamSchema,
  status: z.string(),
  utcDate: z.string(),
  stage: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  score: z.object({
    fullTime: z.object({
      home: z.number().nullable(),
      away: z.number().nullable(),
    }),
  }),
});

const matchesResponseSchema = z.object({
  matches: z.array(matchSchema),
});

const competitionsListSchema = z.object({
  competitions: z.array(
    z.object({
      code: z.string(),
      currentSeason: z
        .object({
          endDate: z.string().nullable().optional(),
          currentMatchday: z.number().nullable().optional(),
          winner: z.object({ id: z.number() }).nullable().optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
});

export interface CompetitionMeta {
  code: string;
  seasonEndDate: string | null;
  hasWinner: boolean;
}

function normalizeStage(s: string | null | undefined): import("@/types").TournamentStage | undefined {
  if (!s) return undefined;
  switch (s) {
    case "LEAGUE_STAGE":
    case "GROUP_STAGE":
    case "LAST_32":
    case "LAST_16":
    case "QUARTER_FINALS":
    case "SEMI_FINALS":
    case "FINAL":
    case "THIRD_PLACE":
    case "PLAYOFFS":
      return s;
    default:
      return undefined;
  }
}

async function fetchFromApi(path: string): Promise<unknown> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set. Copy .env.local.example to .env.local and add your key.");
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} returned ${res.status}`);
  }
  return res.json();
}

/**
 * Season metadata for every competition in the plan, in ONE request. Used by the
 * home grid to flag completed seasons without firing a fixtures call per
 * competition (which blows the free tier's 10-requests/minute limit). Returns a
 * plain array (not a Map) so it survives unstable_cache's JSON serialization.
 */
export function getCompetitionsMeta(): Promise<CompetitionMeta[]> {
  return unstable_cache(
    async (): Promise<CompetitionMeta[]> => {
      const raw = await fetchFromApi(`/competitions`);
      const parsed = competitionsListSchema.parse(raw);
      return parsed.competitions.map((c) => ({
        code: c.code,
        seasonEndDate: c.currentSeason?.endDate ?? null,
        hasWinner: Boolean(c.currentSeason?.winner),
      }));
    },
    ["competitions-meta"],
    { revalidate: REVALIDATE_SECONDS },
  )();
}

export function getStandings(code: string): Promise<Standing[]> {
  return unstable_cache(
    async (): Promise<Standing[]> => {
      const raw = await fetchFromApi(`/competitions/${code}/standings`);
      const parsed = standingsResponseSchema.parse(raw);
      return standingsFromResponse(parsed);
    },
    [`${code}-standings`],
    { revalidate: REVALIDATE_SECONDS },
  )();
}

export function getFixtures(code: string): Promise<Fixture[]> {
  return unstable_cache(
    async (): Promise<Fixture[]> => {
      const raw = await fetchFromApi(`/competitions/${code}/matches`);
      const parsed = matchesResponseSchema.parse(raw);
      return parsed.matches
        .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED" || m.status === "FINISHED")
        .filter((m) => m.homeTeam.id !== null && m.awayTeam.id !== null && m.homeTeam.name !== null && m.awayTeam.name !== null)
        .map((m) => ({
          id: m.id,
          matchday: m.matchday ?? 0,
          homeTeam: normalizeTeam({
            id: m.homeTeam.id!,
            name: m.homeTeam.name!,
            shortName: m.homeTeam.shortName,
            tla: m.homeTeam.tla,
            crest: m.homeTeam.crest,
          }),
          awayTeam: normalizeTeam({
            id: m.awayTeam.id!,
            name: m.awayTeam.name!,
            shortName: m.awayTeam.shortName,
            tla: m.awayTeam.tla,
            crest: m.awayTeam.crest,
          }),
          status: m.status === "FINISHED" ? "FINISHED" as const : "SCHEDULED" as const,
          homeGoals: m.score.fullTime.home,
          awayGoals: m.score.fullTime.away,
          utcDate: m.utcDate,
          group: m.group ?? undefined,
          stage: normalizeStage(m.stage),
        }));
    },
    [`${code}-fixtures`],
    { revalidate: REVALIDATE_SECONDS },
  )();
}
