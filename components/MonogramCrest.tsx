import type { Team } from "@/types";
import { getTeamPalette } from "@/lib/teamColors";

interface Props {
  team: Team;
  size?: number;
  className?: string;
}

export default function MonogramCrest({ team, size = 24, className }: Props) {
  const palette = getTeamPalette(team);
  const radius = Math.max(2, Math.round(size * 0.18));
  return (
    <span
      role="img"
      aria-label={team.name}
      className={"inline-flex shrink-0 items-center justify-center font-mono font-bold uppercase tracking-tight text-white select-none " + (className ?? "")}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.42),
        background: `linear-gradient(to right, ${palette.primary} 0%, ${palette.primary} 50%, ${palette.secondary} 50%, ${palette.secondary} 100%)`,
        textShadow: "0 0 1px rgba(0,0,0,0.6), 0 1px 1px rgba(0,0,0,0.45)",
      }}
    >
      {palette.monogram}
    </span>
  );
}
