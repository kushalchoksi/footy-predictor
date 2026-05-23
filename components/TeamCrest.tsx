"use client";

import Image from "next/image";
import type { Team } from "@/types";
import MonogramCrest from "@/components/MonogramCrest";

interface Props {
  team: Team;
  size?: number;
  className?: string;
}

export default function TeamCrest({ team, size = 24, className }: Props) {
  if (!team.crest) {
    return <MonogramCrest team={team} size={size} className={className} />;
  }
  return (
    <Image
      src={team.crest}
      alt={team.name}
      width={size}
      height={size}
      unoptimized
      suppressHydrationWarning
      className={"inline-block shrink-0 object-contain " + (className ?? "")}
      style={{ width: size, height: size }}
    />
  );
}
