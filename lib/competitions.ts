import type { Competition } from "@/types";
import { WC_BRACKET_TEMPLATE } from "@/lib/tournament/worldCup2026";

export const COMPETITIONS: Competition[] = [
  {
    code: "PL",
    name: "Premier League",
    country: "England",
    emblem: "https://crests.football-data.org/PL.png",
    accent: "#a6228e",
    flagUrl: "https://flagcdn.com/w1280/gb-eng.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/9a6kw51689108793.png",
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
  {
    code: "PD",
    name: "La Liga",
    country: "Spain",
    emblem: "https://crests.football-data.org/PD.png",
    accent: "#ee2737",
    flagUrl: "https://flagcdn.com/w1280/es.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/vc2z6q1684416521.png",
    format: "league",
    tiebreaker: "laLiga",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [18, 19, 20],  label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "BL1",
    name: "Bundesliga",
    country: "Germany",
    emblem: "https://crests.football-data.org/BL1.png",
    accent: "#e2001a",
    flagUrl: "https://flagcdn.com/w1280/de.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/0o56hs1684416407.png",
    format: "league",
    tiebreaker: "bundesliga",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [16],          label: "Relegation playoff", color: "playoff" },
      { positions: [17, 18],      label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "SA",
    name: "Serie A",
    country: "Italy",
    emblem: "https://crests.football-data.org/SA.png",
    accent: "#1273c7",
    flagUrl: "https://flagcdn.com/w1280/it.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/83l94y1684416466.png",
    format: "league",
    tiebreaker: "serieA",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3, 4], label: "Champions League", color: "ucl" },
      { positions: [5, 6],        label: "Europa League",    color: "uel" },
      { positions: [7],           label: "Conference League",color: "uecl" },
      { positions: [18, 19, 20],  label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "FL1",
    name: "Ligue 1",
    country: "France",
    emblem: "https://crests.football-data.org/FL1.png",
    accent: "#1a73d6",
    flagUrl: "https://flagcdn.com/w1280/fr.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/ygfgeq1684416349.png",
    format: "league",
    tiebreaker: "ligue1",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2, 3],    label: "Champions League", color: "ucl" },
      { positions: [4, 5],        label: "Europa League",    color: "uel" },
      { positions: [6],           label: "Conference League",color: "uecl" },
      { positions: [16],          label: "Relegation playoff", color: "playoff" },
      { positions: [17, 18],      label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "DED",
    name: "Eredivisie",
    country: "Netherlands",
    emblem: "/competitions/DED.png",
    accent: "#ff6a13",
    flagUrl: "https://flagcdn.com/w1280/nl.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/wx9n831722781060.png",
    format: "league",
    tiebreaker: "eredivisie",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2],    label: "Champions League", color: "ucl" },
      { positions: [3, 4],    label: "Europa League",    color: "uel" },
      { positions: [5, 6, 7], label: "Conference League",color: "uecl" },
      { positions: [17],      label: "Relegation playoff", color: "playoff" },
      { positions: [18],      label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "PPL",
    name: "Primeira Liga",
    country: "Portugal",
    emblem: "https://crests.football-data.org/PPL.png",
    accent: "#1f9d55",
    flagUrl: "https://flagcdn.com/w1280/pt.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/3v5npc1726462062.png",
    format: "league",
    tiebreaker: "primeira",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2],    label: "Champions League", color: "ucl" },
      { positions: [3, 4],    label: "Europa League",    color: "uel" },
      { positions: [5],       label: "Conference League",color: "uecl" },
      { positions: [17, 18],  label: "Relegation",       color: "relegation" },
    ],
  },
  {
    code: "ELC",
    name: "Championship",
    country: "England",
    emblem: "https://crests.football-data.org/ELC.png",
    accent: "#e4022d",
    flagUrl: "https://flagcdn.com/w1280/gb-eng.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/dl1l3m1688629871.png",
    format: "league",
    tiebreaker: "championship",
    season: { startYear: 2025, label: "2025/26" },
    bands: [
      { positions: [1, 2],          label: "Promotion to Premier League", color: "promotion" },
      { positions: [3, 4, 5, 6],    label: "Playoff for promotion",       color: "playoff" },
      { positions: [22, 23, 24],    label: "Relegation",                  color: "relegation" },
    ],
  },
  {
    code: "BSA",
    name: "Brasileirão",
    country: "Brazil",
    emblem: "/competitions/BSA.svg",
    accent: "#13a64a",
    flagUrl: "https://flagcdn.com/w1280/br.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/02ftjh1684945323.png",
    format: "league",
    tiebreaker: "brasileirao",
    season: { startYear: 2025, label: "2025" },
    bands: [
      { positions: [1, 2, 3, 4, 5, 6], label: "Copa Libertadores",  color: "ucl" },
      { positions: [7, 8, 9, 10, 11, 12], label: "Copa Sudamericana", color: "uel" },
      { positions: [17, 18, 19, 20],   label: "Relegation",         color: "relegation" },
    ],
  },
  {
    code: "CL",
    name: "UEFA Champions League",
    country: "Europe",
    emblem: "https://crests.football-data.org/CL.png",
    accent: "#1f3fa3",
    flagUrl: "https://flagcdn.com/w1280/eu.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/31y13d1747884950.png",
    format: "tournament",
    tiebreaker: "uefa",
    season: { startYear: 2025, label: "2025/26" },
    groupCount: 8,
    bracketTemplate: {
      rounds: {
        PLAYOFFS: [
          { id: "PO1" }, { id: "PO2" }, { id: "PO3" }, { id: "PO4" },
          { id: "PO5" }, { id: "PO6" }, { id: "PO7" }, { id: "PO8" },
        ],
        LAST_16: [
          { id: "R16-1", feederAway: "PO1" }, { id: "R16-2", feederAway: "PO2" },
          { id: "R16-3", feederAway: "PO3" }, { id: "R16-4", feederAway: "PO4" },
          { id: "R16-5", feederAway: "PO5" }, { id: "R16-6", feederAway: "PO6" },
          { id: "R16-7", feederAway: "PO7" }, { id: "R16-8", feederAway: "PO8" },
        ],
        QUARTER_FINALS: [
          { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
          { id: "QF2", feederHome: "R16-3", feederAway: "R16-4" },
          { id: "QF3", feederHome: "R16-5", feederAway: "R16-6" },
          { id: "QF4", feederHome: "R16-7", feederAway: "R16-8" },
        ],
        SEMI_FINALS: [
          { id: "SF1", feederHome: "QF1", feederAway: "QF2" },
          { id: "SF2", feederHome: "QF3", feederAway: "QF4" },
        ],
        FINAL: [
          { id: "F1", feederHome: "SF1", feederAway: "SF2" },
        ],
      },
    },
  },
  {
    code: "EC",
    name: "European Championship",
    country: "International",
    emblem: "/competitions/EC.svg",
    accent: "#1f9d55",
    flagUrl: "https://flagcdn.com/w1280/eu.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/zaomgo1549535961.png",
    format: "tournament",
    tiebreaker: "uefa",
    season: { startYear: 2024, label: "Euro 2024" },
    groupCount: 6,
    bracketTemplate: {
      rounds: {
        LAST_16: [
          { id: "R16-1" }, { id: "R16-2" }, { id: "R16-3" }, { id: "R16-4" },
          { id: "R16-5" }, { id: "R16-6" }, { id: "R16-7" }, { id: "R16-8" },
        ],
        QUARTER_FINALS: [
          { id: "QF1", feederHome: "R16-1", feederAway: "R16-2" },
          { id: "QF2", feederHome: "R16-3", feederAway: "R16-4" },
          { id: "QF3", feederHome: "R16-5", feederAway: "R16-6" },
          { id: "QF4", feederHome: "R16-7", feederAway: "R16-8" },
        ],
        SEMI_FINALS: [
          { id: "SF1", feederHome: "QF1", feederAway: "QF2" },
          { id: "SF2", feederHome: "QF3", feederAway: "QF4" },
        ],
        FINAL: [
          { id: "F1", feederHome: "SF1", feederAway: "SF2" },
        ],
      },
    },
  },
  {
    code: "WC",
    name: "FIFA World Cup",
    country: "International",
    emblem: "/competitions/WC.svg",
    accent: "#c89b3c",
    flagUrl: "https://flagcdn.com/w1280/un.png",
    trophyUrl: "https://r2.thesportsdb.com/images/media/league/trophy/mmyv4f1724782185.png",
    format: "tournament",
    tiebreaker: "fifa",
    season: { startYear: 2026, label: "World Cup 2026" },
    groupCount: 12,
    // Official fixed round-of-32 (top two per group + the eight best thirds via
    // FIFA's combination table), not generic high-vs-low reseeding. See
    // lib/tournament/worldCup2026.ts.
    bracketTemplate: WC_BRACKET_TEMPLATE,
  },
];

export function getCompetition(code: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.code === code);
}

/**
 * Derive the relegation and top-qualification cuts from a competition's bands so
 * the decided-status chips use each league's real thresholds instead of a fixed
 * 17/4 (wrong for 18-team and 24-team leagues).
 *
 * - relegationCut: the last safe position = one above the direct relegation band.
 *   Infinity when a competition has no relegation band (no team can be "relegated").
 * - topNCut: the deepest position of the top qualifying band (UCL / Libertadores,
 *   or promotion in second tiers). 0 when there is no such band.
 */
export function qualificationCuts(competition: Competition): { relegationCut: number; topNCut: number } {
  const bands = competition.bands ?? [];
  const relBand = bands.find((b) => b.color === "relegation");
  const relegationCut = relBand ? Math.min(...relBand.positions) - 1 : Number.POSITIVE_INFINITY;
  const topBand = bands.find((b) => b.color === "ucl") ?? bands.find((b) => b.color === "promotion");
  const topNCut = topBand ? Math.max(...topBand.positions) : 0;
  return { relegationCut, topNCut };
}
