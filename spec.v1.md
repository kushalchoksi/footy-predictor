# PRD: Footy Scenarios — End-of-Season League Simulator

| Field | Value |
|---|---|
| Status | Draft v0.1 |
| Owner | _TBD_ |
| Last updated | 2026-05-13 |

---

## 1. Summary

Footy Scenarios is a lightweight web and mobile app that lets fans, journalists, and bettors explore "what if" outcomes for the closing weeks of any football league season. Users pick a league, pick a *cluster* of teams competing for the same prize (title, European spot, relegation), and then toggle each remaining fixture as a Win / Draw / Loss to see how the final table reshapes in real time — fully respecting that league's tiebreaker rules.

The product turns conversations like *"if City drop points at Spurs and Arsenal win out, who finishes top?"* from group-chat napkin math into a shareable, accurate model.

## 2. Problem & opportunity

In April and May, league tables become combinatorial puzzles. Existing tools fall into two buckets:

- **Static tables** on broadcaster sites — show what *has* happened, not what *could*.
- **Full-season Monte Carlo predictors** (FiveThirtyEight-style, Opta supercomputer) — show probabilities but don't let users *drive* the scenario themselves.

Nothing on the market lets a user say "give me the four teams fighting for top four, show me their remaining fixtures, and let me click through outcomes." Fans want agency, not just a probability. Journalists want a fast way to publish "scenarios" pieces. Sports bettors want a sanity-check tool for permutation bets.

## 3. Target users

**Primary — The engaged fan ("Arsenal Dan").** Watches every match-week, argues in group chats, wants to settle "what does my team need to do" with a tool rather than a spreadsheet.

**Secondary — The football journalist.** Needs to produce "X scenarios for the title race" pieces quickly with accurate tiebreaker handling.

**Tertiary — The bettor / fantasy player.** Uses scenarios to evaluate accumulator bets, mini-league standings, and Champions League qualification odds.

## 4. Goals & non-goals

**Goals**

1. Let a user model the remaining games of any supported league in under 30 seconds from app open.
2. Always show a correct final table given user-set results, including league-specific tiebreakers.
3. Make the experience natural on mobile (one-thumb fixture toggling).
4. Make any scenario shareable via link or image.

**Non-goals (v1)**

- Predicting probabilities or odds for outcomes.
- Modeling goal differences beyond user input (no xG simulation).
- Cup competitions or knockout tournaments.
- Transfer / squad-level simulation.

**Success metrics**

- D1 retention from organic traffic during final 6 weeks of a season ≥ 35%.
- Median scenarios created per session ≥ 3.
- Share rate per session ≥ 8%.
- Tiebreaker correctness: 100% on a regression test set of historic edge cases.

## 5. Core concepts

A small shared vocabulary the rest of the doc assumes:

- **League** — A round-robin competition with a points table (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga, MLS, etc.).
- **Cluster** — A user-selected subset of teams competing for the same outcome. Examples: title race, top-four race, Europa qualification, relegation battle. The app suggests clusters but the user can edit them.
- **Fixture grid** — The matrix of remaining matches involving any team in the cluster, including matches against teams *outside* the cluster.
- **Scenario** — A complete assignment of W/D/L to every fixture in the grid, plus the resulting final table.
- **Tiebreaker chain** — The ordered list of rules a league uses to separate teams level on points (varies by league — see §10).

## 6. Functional requirements

### 6.1 League selection

- F1. User can pick a league from a searchable list grouped by country and tier.
- F2. App fetches current standings, remaining fixtures, head-to-head results so far, goal difference, goals scored.
- F3. App displays last-updated timestamp; data refresh is automatic on app open and manual via pull-to-refresh.

### 6.2 Cluster selection

- F4. App auto-suggests clusters based on table position and points gaps. Default suggestions:
  - **Title race** — leader plus any team within a points gap that can still mathematically catch them.
  - **Champions League race** — teams competing for that league's UCL allocation.
  - **Europa / Conference League race** — teams competing for UEL and UECL spots.
  - **Relegation battle** — teams in or within reach of the drop zone.
- F5. User can multi-select teams to build a custom cluster, regardless of suggestions.
- F6. Each cluster shows the prize at stake (e.g., "1st place — Premier League title", "17th — final safe position").
- F7. If teams in the user's cluster have remaining matches against each other, those head-to-head fixtures are flagged in the grid (they carry double weight for the outcome).

### 6.3 Fixture grid & scenario controls

- F8. Fixture grid lists every remaining match involving a cluster team, ordered by matchweek.
- F9. Each fixture has three tap targets: home win, draw, away win. Default state is "unset" (not yet decided).
- F10. User can lock a fixture (e.g., "City must win this") to force it in any aggregate view.
- F11. User can quickly set a team's full run: "Team wins out", "Team draws every match", "Team loses out".
- F12. User can clear all picks or revert to last saved scenario.
- F13. Optional advanced: user can specify a scoreline (not just W/D/L) to influence goal difference. Default is +1 GD for a win, 0 for a draw, both reasonable defaults overridable.

### 6.4 Live table

- F14. As the user toggles outcomes, the projected final table updates instantly with no submit step.
- F15. Each row shows: team, played, won, drawn, lost, GF, GA, GD, points, projected final position.
- F16. Position color-coding follows the league's actual qualification bands (UCL green, UEL blue, UECL teal, relegation red, etc.).
- F17. If any fixtures remain unset, the table shows the *minimum-points* and *maximum-points* range for each cluster team alongside the current projection.

### 6.5 Outcome summaries

- F18. For each cluster prize, the app shows a plain-language summary: "Arsenal win the title if they beat Spurs and City lose at Anfield" or "Forest are safe in any scenario."
- F19. When a team is mathematically guaranteed a position (champion, qualified, relegated) regardless of remaining results, the app surfaces this prominently as a "decided" badge.

### 6.6 Sharing & saving

- F20. User can save a scenario locally and reopen it.
- F21. User can copy a deep link encoding the league, cluster, and all toggled outcomes.
- F22. User can export the projected table as a PNG card sized for social media.

## 7. Key user flows

**Flow A — The engaged fan, two matchweeks left.**
Opens app → app defaults to user's favorite league (set in onboarding) → taps the "Title race" suggested cluster → sees 6 fixtures laid out → taps "win" on every Arsenal game → reads the summary: "Arsenal win the title unless City win both remaining matches" → shares the table to WhatsApp.

**Flow B — The journalist building a relegation explainer.**
Opens app → picks Premier League → picks the "Relegation battle" cluster (5 teams) → spends 2 minutes clicking through scenarios → uses the saved-scenarios feature to bookmark "Luton survive" and "Luton go down" → exports both tables as images for the article.

**Flow C — The bettor evaluating a top-four accumulator.**
Opens app → picks La Liga → custom-selects the 3rd–6th place teams → locks the fixtures their bet depends on → toggles the rest to see whether the bet is alive in all combinations.

## 8. Data model (rough sketch)

- `League` — id, name, country, season, tiebreaker chain (ordered), qualification bands.
- `Team` — id, name, crest, league_id.
- `Fixture` — id, league_id, matchweek, home_team, away_team, kickoff, status (played/upcoming), result (if played).
- `Standing` — league_id, team_id, P/W/D/L/GF/GA/GD/Pts as of last completed matchweek.
- `Scenario` — owner, league_id, cluster (team_ids), per-fixture chosen outcome and optional scoreline, created/updated.
- `HeadToHead` — pairwise record between teams this season (needed for some tiebreakers).

## 9. Technical considerations

- **Data source.** Need a reliable football data API with fixtures, results, and standings across the supported leagues. Candidates: Opta (premium, most accurate), API-Football, Sportradar, football-data.org. v1 likely uses two providers — a primary with broad coverage and a fallback for verification.
- **Refresh cadence.** During a matchweek, fixtures and standings should refresh every minute. Outside matchdays, hourly is fine.
- **Tiebreaker engine.** Each league has its own tiebreaker chain that must be modeled as a pluggable function. This is the highest-correctness-bar component of the system and the most common source of bugs in competitor products. Build a regression suite of historic edge cases (e.g., 2011–12 Premier League title decided on GD).
- **Calculation cost.** A naive recompute on every tap is fine for v1 — clusters are small (typically 2–6 teams) and fixtures are few (≤ 5 per team).
- **Offline mode.** Should work without network once data is loaded; toggling is local.

## 10. League-specific tiebreakers (v1 reference)

| League | Tiebreaker chain |
|---|---|
| Premier League | GD → Goals scored → Head-to-head → Playoff |
| La Liga | Head-to-head → Head-to-head GD → Overall GD → Goals scored |
| Bundesliga | GD → Goals scored → Head-to-head |
| Serie A | Head-to-head → Head-to-head GD → Overall GD → Goals scored |
| Ligue 1 | GD → Goals scored → Goals scored away |
| Eredivisie | GD → Goals scored |
| MLS | Wins → GD → Goals scored |

Each chain must be re-verified against the current season's official competition rules before launch, since these change.

## 11. UX principles

- **Toggle, don't type.** Everything should be tap-driven. No keyboards on the scenario screen.
- **Always show the consequence.** The table must update in real time as the user toggles. No "Calculate" button.
- **Be explicit about what's decided.** When the math is settled, say so plainly ("Already champions", "Cannot finish top four").
- **Respect ambiguity.** When fixtures are unset, show ranges, not just point estimates.
- **Mobile-first.** The fixture list and table should fit on a single mobile screen with minimal scrolling, since this is heavily used during live matches.

## 12. Edge cases

- A cluster team plays a non-cluster team — outcome still matters for the table; non-cluster opponents' final positions update too but are de-emphasized in the UI.
- Two clusters overlap (e.g., a team that's both in the UEL race and the relegation battle in a wild season) — user can choose how to view, app handles correctly either way.
- A fixture is in progress during use — show its live score with a clear "in progress" indicator; allow user to override but warn.
- League uses playoff rules for a final tiebreaker (Premier League, MLS) — flag scenarios that would trigger a playoff rather than silently picking a winner.
- Mid-season points deduction (Everton, Forest precedents) — the app must respect these and explain them on hover.

## 13. Risks

- **Tiebreaker accuracy.** Getting any tiebreaker wrong, even in an edge case, damages trust quickly. Mitigation: comprehensive regression tests and a public correctness changelog.
- **Data licensing cost.** Reliable football data is expensive. Mitigation: start with a single league (likely Premier League) to validate before expanding.
- **Seasonality.** App usage will spike in April–May and crater in summer. Mitigation: expand to leagues with offset calendars (MLS summer, Brasileirão, J.League) and lean into cup competitions as a future scope item.

## 14. Out of scope for v1, candidates for v2+

- Cup competitions, knockout simulators (Champions League bracket, World Cup).
- Probability layer ("based on form, Arsenal win the title in 62% of remaining scenarios").
- Aggregate scenario counting ("Arsenal win the title in 14 of 27 possible outcomes").
- Multi-season historical mode ("recreate the 2011-12 Premier League final day").
- Native push notifications when a real result locks in a scenario the user saved.
- Public scenario gallery / leaderboard of community-shared scenarios.

## 15. Open questions

- Should the v1 launch league be Premier League only or include the big five from day one?
- How is "cluster" surfaced to users who don't know that word — "race", "battle", "group"?
- Do we let users adjust scorelines for the purpose of GD, or assume +1/0 and call it good enough for v1?
- Pricing model: free with sponsorship, freemium with paid leagues, or fully free as a marketing front for a parent product?
