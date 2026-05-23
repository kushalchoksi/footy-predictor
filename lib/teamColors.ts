import type { Team, TeamId } from "@/types";

export interface TeamPalette {
  monogram: string;
  primary: string;
  secondary: string;
}

const PALETTE: Record<TeamId, TeamPalette> = {
  57:   { monogram: "AR", primary: "#EF0107", secondary: "#FFFFFF" }, // Arsenal
  58:   { monogram: "AV", primary: "#670E36", secondary: "#95BFE5" }, // Aston Villa
  61:   { monogram: "CH", primary: "#034694", secondary: "#DBA111" }, // Chelsea
  62:   { monogram: "EV", primary: "#003399", secondary: "#FFFFFF" }, // Everton
  63:   { monogram: "FU", primary: "#000000", secondary: "#CC0000" }, // Fulham
  64:   { monogram: "LI", primary: "#C8102E", secondary: "#F6EB61" }, // Liverpool
  65:   { monogram: "MC", primary: "#6CABDD", secondary: "#1C2C5B" }, // Man City
  66:   { monogram: "MU", primary: "#DA291C", secondary: "#FBE122" }, // Man United
  67:   { monogram: "NE", primary: "#241F20", secondary: "#FFFFFF" }, // Newcastle
  71:   { monogram: "SU", primary: "#EB172B", secondary: "#FFFFFF" }, // Sunderland
  73:   { monogram: "TO", primary: "#132257", secondary: "#FFFFFF" }, // Tottenham
  76:   { monogram: "WO", primary: "#FDB913", secondary: "#231F20" }, // Wolves
  328:  { monogram: "BU", primary: "#6C1D45", secondary: "#99D6EA" }, // Burnley
  341:  { monogram: "LE", primary: "#FFCD00", secondary: "#1D428A" }, // Leeds
  351:  { monogram: "NF", primary: "#DD0000", secondary: "#FFFFFF" }, // Nottingham Forest
  354:  { monogram: "CP", primary: "#1B458F", secondary: "#C4122E" }, // Crystal Palace
  356:  { monogram: "SH", primary: "#EE2737", secondary: "#000000" }, // Sheffield United
  389:  { monogram: "LU", primary: "#FF6900", secondary: "#1D2D5C" }, // Luton
  397:  { monogram: "BR", primary: "#0057B8", secondary: "#FFCD00" }, // Brighton
  402:  { monogram: "BF", primary: "#E30613", secondary: "#FFFFFF" }, // Brentford
  563:  { monogram: "WH", primary: "#7A263A", secondary: "#1BB1E7" }, // West Ham
  1044: { monogram: "BO", primary: "#DA291C", secondary: "#000000" }, // Bournemouth
  338:  { monogram: "LC", primary: "#003090", secondary: "#FDBE11" }, // Leicester
  340:  { monogram: "SO", primary: "#D71920", secondary: "#130C0E" }, // Southampton
  349:  { monogram: "IP", primary: "#3764A8", secondary: "#FFFFFF" }, // Ipswich
};

export function getTeamPalette(team: Team): TeamPalette {
  const hit = PALETTE[team.id];
  if (hit) return hit;
  // Fallback: derive a 2-letter monogram from tla / name and use a neutral palette.
  const mono = (team.tla ?? team.shortName ?? team.name).replace(/[^A-Z]/gi, "").slice(0, 2).toUpperCase() || "??";
  return { monogram: mono, primary: "#27272a", secondary: "#52525b" };
}
