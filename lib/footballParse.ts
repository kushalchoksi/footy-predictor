import { z } from "zod";
import type { Standing, Team } from "@/types";

// Pure parsing / normalization for football-data.org responses. Kept free of
// `server-only`/`next/cache` imports so the transforms are unit-testable; the
// fetch + caching wrappers live in footballData.ts.

export const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().nullable(),
  tla: z.string().nullable(),
  crest: z.string().nullable(),
});

export const standingsResponseSchema = z.object({
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

export function normalizeTeam(t: z.infer<typeof teamSchema>): Team {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? t.name,
    tla: t.tla ?? t.name.slice(0, 3).toUpperCase(),
    crest: t.crest ?? "",
  };
}

/**
 * Flatten the standings response into a single Standing[].
 *
 * Leagues return ONE table per type (TOTAL/HOME/AWAY). Tournaments with a group
 * stage return one entry PER GROUP, each with `type: "TOTAL"` (GROUP_A, GROUP_B,
 * …). We must include EVERY TOTAL table, not just the first — otherwise only the
 * first group keeps its real played games and every other group looks like it has
 * yet to play a match.
 */
export function standingsFromResponse(
  parsed: z.infer<typeof standingsResponseSchema>,
): Standing[] {
  const totals = parsed.standings.filter((s) => s.type === "TOTAL");
  if (totals.length === 0) throw new Error("No TOTAL standings stage in response");
  return totals.flatMap((s) => s.table).map((row) => ({
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
}
