import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import type { Fixture, Standing, Team } from "@/types";

const BASE = "https://api.football-data.org/v4";
const COMP = "PL";
const REVALIDATE_SECONDS = 120;

const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().nullable(),
  tla: z.string().nullable(),
  crest: z.string().nullable(),
});

const standingsResponseSchema = z.object({
  standings: z.array(
    z.object({
      stage: z.string(),
      type: z.string(),
      table: z.array(
        z.object({
          position: z.number(),
          team: teamSchema,
          playedGames: z.number(),
          won: z.number(),
          draw: z.number(),
          lost: z.number(),
          points: z.number(),
          goalsFor: z.number(),
          goalsAgainst: z.number(),
          goalDifference: z.number(),
        }),
      ),
    }),
  ),
});

const matchSchema = z.object({
  id: z.number(),
  matchday: z.number().nullable(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  status: z.string(),
  utcDate: z.string(),
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

function normalizeTeam(t: z.infer<typeof teamSchema>): Team {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? t.name,
    tla: t.tla ?? t.name.slice(0, 3).toUpperCase(),
    crest: t.crest ?? "",
  };
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

export const getStandings = unstable_cache(
  async (): Promise<Standing[]> => {
    const raw = await fetchFromApi(`/competitions/${COMP}/standings`);
    const parsed = standingsResponseSchema.parse(raw);
    const total = parsed.standings.find((s) => s.type === "TOTAL");
    if (!total) throw new Error("No TOTAL standings stage in response");
    return total.table.map((row) => ({
      team: normalizeTeam(row.team),
      position: row.position,
      playedGames: row.playedGames,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      points: row.points,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
    }));
  },
  ["epl-standings"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getFixtures = unstable_cache(
  async (): Promise<Fixture[]> => {
    const raw = await fetchFromApi(`/competitions/${COMP}/matches`);
    const parsed = matchesResponseSchema.parse(raw);
    return parsed.matches
      .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED" || m.status === "FINISHED")
      .map((m) => ({
        id: m.id,
        matchday: m.matchday ?? 0,
        homeTeam: normalizeTeam(m.homeTeam),
        awayTeam: normalizeTeam(m.awayTeam),
        status: m.status === "FINISHED" ? "FINISHED" as const : "SCHEDULED" as const,
        homeGoals: m.score.fullTime.home,
        awayGoals: m.score.fullTime.away,
        utcDate: m.utcDate,
      }));
  },
  ["epl-fixtures"],
  { revalidate: REVALIDATE_SECONDS },
);
