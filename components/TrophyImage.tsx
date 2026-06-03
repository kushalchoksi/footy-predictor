"use client";

import { useState } from "react";
import Image from "next/image";
import type { Competition } from "@/types";

/**
 * The trophy hero render, with a graceful source chain:
 *   1. a hand-made local render at  public/trophies/<CODE>.png  (preferred)
 *   2. the competition's trophyUrl  (TheSportsDB photo cut-out fallback)
 *   3. the competition emblem       (last resort)
 * Each source advances to the next on load error, so a missing local render or
 * a broken third-party asset never shows a broken image. Drop renders into
 * public/trophies and they override automatically — no code/data change needed.
 */
export default function TrophyImage({ competition }: { competition: Competition }) {
  const sources = [`/trophies/${competition.code}.png`, competition.trophyUrl];
  const [idx, setIdx] = useState(0);
  const [emblemFailed, setEmblemFailed] = useState(false);

  if (idx < sources.length) {
    return (
      <Image
        key={sources[idx]}
        src={sources[idx]}
        alt=""
        fill
        sizes="(max-width: 768px) 60vw, 42vw"
        className="object-contain object-left-bottom"
        onError={() => setIdx((i) => i + 1)}
      />
    );
  }

  if (!emblemFailed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={competition.emblem}
        alt=""
        className="h-full w-full object-contain object-left-bottom"
        onError={() => setEmblemFailed(true)}
      />
    );
  }

  return null;
}
