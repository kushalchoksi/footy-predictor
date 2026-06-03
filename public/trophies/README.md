# Trophy hero renders

Drop a **transparent PNG** here per competition, named by its competition **code**:

| File              | Competition           |
| ----------------- | --------------------- |
| `PL.png`          | Premier League        |
| `PD.png`          | La Liga               |
| `BL1.png`         | Bundesliga            |
| `SA.png`          | Serie A               |
| `FL1.png`         | Ligue 1               |
| `DED.png`         | Eredivisie            |
| `PPL.png`         | Primeira Liga         |
| `ELC.png`         | Championship          |
| `BSA.png`         | Brasileirão           |
| `CL.png`          | UEFA Champions League |
| `EC.png`          | European Championship |
| `WC.png`          | FIFA World Cup        |

Names are **case-sensitive** (uppercase, matching the code) — `PL.png`, not `pl.png`.

## How it's used

The home-page hover takeover (`components/TrophyImage.tsx`) loads `/trophies/<CODE>.png`
first. If a file is missing it silently falls back to the TheSportsDB image, then the
emblem — so you can add renders one at a time and each one takes over as it lands.

## Render specs (for best fit)

- **Transparent background** (alpha), no baked-in shadow/reflection/backdrop — the app
  adds its own drop-shadow and glow.
- **Tall portrait**, roughly **2:3** (e.g. **1024×1536**). The slot is portrait and the
  image is `object-contain`, **bottom-aligned**, so make the trophy fill most of the
  frame and sit on the bottom edge (it "stands" in the corner).
- Single trophy, centered horizontally, front-on, studio-lit — to match the cinematic
  flag/banner backdrop behind it.
