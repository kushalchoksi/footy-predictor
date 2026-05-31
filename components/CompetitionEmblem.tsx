interface Props {
  src: string;
  alt?: string;
  /** Outer tile size in px. The emblem sits inside with a little padding. */
  size?: number;
  className?: string;
}

/**
 * League/tournament emblems come from football-data.org as a mix of pure-black
 * line art (Champions League), dark-colored marks (Premier League), colored
 * logos (La Liga), and some already on a white box (Serie A). Rendering each on
 * a near-white "chip" keeps every one legible in both light and dark themes
 * without per-logo color inversion. The faint ring defines the tile's edge
 * against a light page in light mode.
 */
export default function CompetitionEmblem({ src, alt = "", size = 40, className }: Props) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center justify-center rounded-md bg-white p-1 ring-1 ring-black/5 dark:ring-white/10 " +
        (className ?? "")
      }
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </span>
  );
}
