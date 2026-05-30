import type { Competition } from "@/types";

export const COMPETITIONS: Competition[] = [
  {
    code: "PL",
    name: "Premier League",
    country: "England",
    emblem: "https://crests.football-data.org/PL.png",
    format: "league",
    tiebreaker: "epl",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [18, 19, 20],  label: "Relegation",       color: "relegation" },
    ],
  },
];

export function getCompetition(code: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.code === code);
}
