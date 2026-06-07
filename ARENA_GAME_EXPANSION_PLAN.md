# Brae Arena — Game Expansion Master Plan

> Single source of truth for new game types, game content, and the novel UI concepts
> that make Arena feel unlike any other coding-battle platform.
> Created 2026-06-06. Owner: Harvey. Status: **living document.**

---

## 0. TL;DR / what to read first

- **§1** — how Arena games actually work today (so the rest makes sense).
- **§2** — the "add a game type" recipe: every file you touch, and the one safety rule.
- **§3** — the **new game type catalogue** (12 concepts, tiered by effort/risk).
- **§4** — the **unique UI concept library** (cross-cutting ideas that give Arena its identity).
- **§5** — content expansion (what's being seeded now).
- **§6** — phased rollout.
- **§7** — open questions for the morning.
- **§8** — execution log (what got built overnight).

---

## 1. How games work today (ground truth)

There are **two independent axes** people conflate. Keep them separate:

### Axis A — `game_type` (what the player picks in the lobby)
`speed_build` · `clone_battle` · `bug_hunt` (+ `any`). Lives in `arena_queue.game_type`
and `arena_matches.game_type`. This is a **matchmaking bucket**, nothing more.

### Axis B — `challenge_type` (the engine that renders + scores a match)
`url_submit` · `code_duel` · `css_battle` · `bug_hunt_code`. Lives in
`arena_challenges.challenge_type`. This decides **which room component loads** and
**how scoring works**.

### How A maps to B (live data, 2026-06-06)
| game_type (lobby) | `arena_challenges.mode` | challenge_type(s) actually in that pool | count |
|---|---|---|---|
| `speed_build` | `speed_build` | `code_duel` (37), `url_submit` (4) | 41 |
| `clone_battle` | `clone_battle` | `css_battle` (5), `url_submit` (2) | 7 |
| `bug_hunt` | `bug_hunt` | `bug_hunt_code` (5), `url_submit` (1) | 6 |

So when you queue **speed_build**, matchmaking picks a random *active* challenge whose
`mode='speed_build'` — usually an in-browser `code_duel` JS puzzle. The lobby label and
the engine are only loosely coupled through the `mode` column.

### The two rendering engines
- **`url_submit` → `MatchRoom`** (`app/(arena)/match/[id]/_components/match-room.tsx`)
  Build externally, paste a deployed URL. Scored by Lighthouse via `/api/arena/score`
  (Deployment 30 + Perf 20 + A11y 15 + BestPractices 15 + SEO 10 + Speed ≤10 = 100).
- **everything else → `MatchRoomCode`** (`components/arena/match-room-code.tsx`)
  Monaco editor + test panel (+ live HTML preview when `language='html'`). Scored
  80% tests / 20% speed (speed bonus only on 100% pass) via `/api/arena/submit-code`.

The match page (`app/(arena)/match/[id]/page.tsx`) is the switch:
```ts
const isCodeChallenge = challenge_type && challenge_type !== 'url_submit'
isCodeChallenge ? <MatchRoomCode/> : <MatchRoom/>
```

### Test format (in-browser engines)
`arena_challenges.test_cases` = `[{ label, input, expected }]`.
- **code_duel / bug_hunt_code**: `input` is the literal arg list spliced into `fn(<input>)`;
  `expected` is a JSON string of the return value. Runner auto-detects the first function
  name. Client runs in `new Function` (`lib/test-runner/run-tests-client.ts`); server
  re-runs in a `vm` sandbox (`/api/arena/submit-code`) for anti-cheat.
- **css_battle**: `input` is a JS DOM expression evaluated inside a sandboxed iframe of the
  player's HTML; `expected` is always `"\"true\""`. Runs client-side
  (`lib/css-battle-runner.ts`); the server trusts client results (no headless browser).

### Other surfaces
- **Daily** (`/daily`): solo, deterministic pick from the active `code_duel` pool, own
  leaderboard (`arena_daily_attempts`). No matchmaking.
- **Agents / Agent Battles**, **Tournaments**, **Teams**, **Seasons**, **Spectate**,
  **Replay** — all build on the same `arena_matches` / `arena_submissions` spine.

---

## 2. The "add a game type" recipe

### 2a. Add **content** to an existing engine (zero code, lowest risk)
Just insert `arena_challenges` rows with an existing `challenge_type`. Routes through the
existing room + scoring automatically. **This is how we grow the library.**
→ Seed with `active=false` if you want to review before it hits live matchmaking/daily.

### 2b. Add a **new engine** (`challenge_type`) — the touch points
1. **DB**: extend the `arena_challenges.challenge_type` CHECK constraint.
2. **Types**: `types/arena.ts` — add to a `ChallengeType` union + any label maps.
3. **Routing**: `app/(arena)/match/[id]/page.tsx` — add a branch that renders a **new,
   self-contained room component** for the new `challenge_type`.
4. **Room component**: build it new under `_components/` or `components/arena/`.
5. **Runner**: client validator (+ server re-validation route if the result must be
   trusted for ranked play).
6. **Scoring**: a scoring function (reuse 80/20, or custom).
7. **Content**: seed rows (`active=false` until tested end-to-end).

### 2c. Add a **new lobby category** (`game_type`) — extra touch points
8. `arena_queue.game_type` CHECK + `arena_challenges.mode` CHECK.
9. Lobby (`lobby-client.tsx`): `QUEUE_GAME_TYPES`, labels, descriptions.
10. Matchmaking (`lib/actions/queue.ts`): `gameTypeFilter` arrays + the `resolvedGameType`
    random pool + the `mode` challenge query.

### ⚠️ The one safety rule
**A new `challenge_type` must (a) route to its own NEW component, and (b) stay `active=false`
until its runner + routing are live.** Two reasons:
- Routing to a new component means you physically cannot break `MatchRoom` /
  `MatchRoomCode` (the live match UIs) — they are untouched.
- An `active=true` challenge of an unknown `challenge_type` could be served by matchmaking
  to a real player whose client can't render/score it → a dead match. `active=false` keeps
  it out of the matchmaking + daily pools until you flip it on.

---

## 3. New game type catalogue

Each entry: **concept · why it's unique · UI · scoring · feasibility/deps · effort · risk.**
Effort = rough build size. Risk = chance of disrupting live play.

### TIER 1 — ship-ready (extend existing engines, self-contained, low risk)

#### 3.1 Regex Duel — `regex_duel`  ★ flagship, building tonight
- **Concept**: write a regex that MATCHES every string in a green corpus and REJECTS every
  string in a red corpus. Optional golf: shortest correct pattern wins ties.
- **Unique**: nobody ships a polished live-highlighting regex 1v1. Native `RegExp` → zero deps.
- **UI**: two stacked corpora ("Should match" / "Should reject"); as you type, every row
  live-recolours pass/fail and **highlights the matched substring** inside each string; a
  flags toggle (`g i m s`); a **character-count "par" meter**; opponent's live pass-count +
  char-count as a race bar (never their pattern).
- **Scoring**: correctness gate (all green match + all red reject) → 80; brevity bonus (≤ par)
  → up to 20; submit-time tiebreak.
- **Feasibility**: HIGH — client-only, new self-contained room + tiny runner. **Effort: S. Risk: none** (new component, content `active=false`).

#### 3.2 CSS Golf — `css_golf`
- **Concept**: cssbattle.dev-style — reproduce a target with the LEAST code.
- **Unique**: the **onion-skin overlay slider** (drag to blend your render over the target)
  is the signature interaction.
- **UI**: target image left; live render right; opacity slider that superimposes them;
  char-count vs par; (v2) pixel-diff %.
- **Scoring**: v1 = permissive DOM checks (reuse css_battle runner) + char golf. v2 = real
  visual diff (see 3.6).
- **Feasibility**: MED — reuses the css_battle iframe; new component adds the slider + counter.
  True pixel diff deferred. **Effort: M. Risk: low.**

#### 3.3 Refactor Rumble — `refactor_rumble`
- **Concept**: given ugly-but-passing code, refactor to keep tests green while minimising a
  **code-health score** (lines, token count, a cheap cyclomatic-complexity heuristic).
- **Unique**: you compete on *quality delta*, not just correctness. Live health gauge.
- **UI**: original (read-only) with a radial health gauge; your editor with the same gauge
  updating as you type; red banner the instant a test breaks; "−42% lines · −3 complexity"
  delta chips.
- **Scoring**: tests pass = gate; score = improvement vs the original baseline; brevity tiebreak.
- **Feasibility**: MED — reuses code_duel runner for the gate; metrics computed client-side.
  **Effort: M. Risk: low.**

### TIER 2 — next (new engines / new deps, moderate build)

#### 3.4 SQL Showdown — `sql_duel`  ★ very on-brand (Supabase/Postgres)
- **Concept**: given a schema + question, write SQL returning the exact expected rows.
- **Unique**: real query editor with a live result grid and row-level diff — feels pro.
- **UI**: schema sidebar (tables/columns, expandable); Monaco `sql`; "Run" → result table;
  expected-vs-actual row diff (missing rows red, extra rows amber); query length tiebreak.
- **Scoring**: exact row-set match (order-insensitive unless the prompt requires `ORDER BY`).
- **Feasibility**: MED-HIGH — runs entirely client-side via **pglite** (`@electric-sql/pglite`,
  WASM Postgres). Each challenge seeds its own schema+data. No production-DB risk.
  **Effort: M-L. Risk: low** (sandboxed in browser). New dep (~WASM bundle).

#### 3.5 Prompt Golf / AI Whisperer — `prompt_golf`  ★ on-brand for an AI company
- **Concept**: write the SHORTEST prompt that makes the model reproduce a target output
  (within a similarity threshold).
- **Unique**: a coding-arena game about *prompting* — perfectly Brae. Token-golf meta.
- **UI**: target panel; prompt box + live token counter; "Run" → model output + similarity
  meter (normalised Levenshtein or embedding cosine); opponent's best-similarity race bar.
- **Scoring**: similarity ≥ threshold = gate; fewest tokens wins; submit-time tiebreak.
- **Feasibility**: MED — needs an LLM endpoint, temp=0 for determinism, **rate-limit + cost
  control + abuse guardrails**. **Effort: M. Risk: low to play, but $$ + abuse surface — discuss.**

#### 3.6 Pixel-Perfect Clone Pro — upgrade to `clone_battle` (`css_battle` v2)
- **Concept**: real visual-diff scoring for clone battles instead of loose DOM checks.
- **Unique**: live pixel-match % + magenta diff overlay — the marquee mode finally feels exact.
- **UI**: onion-skin slider + live match %; "diff view" toggle highlighting mismatched regions.
- **Scoring**: pixel-match % is the score.
- **Feasibility**: MED-HARD — must rasterise the player's render. Most reliable via a
  **server screenshot** service (same shape as the PageSpeed call) then pixel-compare; a
  client-only `foreignObject`→canvas path is flaky with external assets. **Effort: L. Risk: low.**

### TIER 3 — ambitious / signature

#### 3.7 Sabotage — `sabotage` (asymmetric, two-phase PvP)  ★ signature
- **Concept**: Phase 1 — both get the same working code and inject up to N hidden bugs
  (within a "bug budget"; code must still parse). Phase 2 — players SWAP files and race to
  find+fix the opponent's bugs, validated by a hidden test suite.
- **Unique**: genuinely novel competitive loop; high drama; very shareable.
- **UI**: saboteur phase = editor + "bugs: 2/3" budget + "still parses ✓"; fixer phase =
  editor + test panel + "bugs remaining: ?".
- **Scoring**: fewer opponent-bugs-surviving / faster fixes.
- **Feasibility**: HARD — two-phase match state machine; validation that injected code still
  parses and that the seed originally passed. **Effort: L. Risk: med (new match lifecycle).**

#### 3.8 Optimize / Lighthouse Race — `optimize`
- **Concept**: given a deliberately slow page, optimise it; highest perf score wins.
- **UI**: live metric gauges (LCP/CLS/bundle) climbing; before/after bars.
- **Feasibility**: MED — could be just a **perf-weighted `scoring_weights` variant of
  `url_submit`** + a starter repo, rather than a whole new engine. **Effort: S-M. Risk: low.**

#### 3.9 A11y Audit Duel — `a11y_duel`
- **Concept**: fix accessibility violations in a given page; fewest remaining axe-core
  violations wins.
- **UI**: live violations list that shrinks as you fix; severity badges.
- **Feasibility**: MED — run **axe-core** against the iframe client-side. Educational + unique.
  **Effort: M. Risk: low.**

#### 3.10 Type Tactician — `type_duel` (TypeScript type puzzles)
- **Concept**: make the types compile / satisfy `Expect<Equal<…>>` assertions (type-challenges style).
- **UI**: Monaco TS with live diagnostics; "0 type errors = solved"; assertions panel.
- **Feasibility**: HARD — needs the TS language service in-browser (`@typescript/vfs` + monaco
  worker). Niche but beloved by devs. **Effort: L. Risk: low.**

#### 3.11 Build Relay — `relay` (meta-format)
- **Concept**: one match = 3 micro-rounds across different engines (e.g. regex → CSS golf →
  JS duel); cumulative score.
- **UI**: round stepper, running scoreboard, between-round transitions.
- **Feasibility**: MED — orchestration over existing engines. Great for variety/tournaments.
  **Effort: M. Risk: med (match orchestration).**

#### 3.12 Boss Battle — `boss` (PvE / co-op)
- **Concept**: solo or co-op vs escalating challenge tiers; a **boss HP bar** depletes as test
  suites pass; leaderboard by clear time.
- **UI**: boss sprite + HP bar, combo meter, phase transitions.
- **Feasibility**: MED — reuses the code_duel runner; new framing + progression. Strong solo
  retention loop. **Effort: M. Risk: low.**

### Catalogue at a glance
| # | Game | id | Tier | Effort | Risk | New dep? |
|---|---|---|---|---|---|---|
| 3.1 | Regex Duel | `regex_duel` | 1 | S | none | no |
| 3.2 | CSS Golf | `css_golf` | 1 | M | low | no |
| 3.3 | Refactor Rumble | `refactor_rumble` | 1 | M | low | no |
| 3.4 | SQL Showdown | `sql_duel` | 2 | M-L | low | pglite |
| 3.5 | Prompt Golf | `prompt_golf` | 2 | M | low* | LLM API |
| 3.6 | Clone Pro (visual diff) | `css_battle` v2 | 2 | L | low | screenshot svc |
| 3.7 | Sabotage | `sabotage` | 3 | L | med | no |
| 3.8 | Optimize Race | `optimize` | 3 | S-M | low | no |
| 3.9 | A11y Duel | `a11y_duel` | 3 | M | low | axe-core |
| 3.10 | Type Tactician | `type_duel` | 3 | L | low | ts vfs |
| 3.11 | Build Relay | `relay` | 3 | M | med | no |
| 3.12 | Boss Battle | `boss` | 3 | M | low | no |

\* Prompt Golf is cheap to *play* but has real API-cost + abuse considerations.

---

## 4. Unique UI concept library (cross-cutting)

These are the touches that make Arena feel like a *game*, reusable across modes:

1. **Live opponent presence ("ghost")** — stream the opponent's progress % / tests-passed /
   char-count / submit status over Supabase Realtime presence. Tension without revealing code.
   We already broadcast submissions; extend to live progress heartbeats.
2. **Onion-skin overlay slider** — blend your render over the target (clone / CSS golf).
3. **Pixel-diff heat overlay** — magenta-highlight mismatched regions (clone pro).
4. **Code-health radial gauge** — animated complexity/length meter (refactor).
5. **Golf "par" meter** — char/token counter with a par target and birdie/eagle flourishes.
6. **Spec-checklist auto-tick** — detect required features in a build and tick a rubric live
   (great for `speed_build` briefs).
7. **Round stepper + running scoreboard** — relay / tournament multi-stage.
8. **Boss HP bar + combo meter** — PvE juice.
9. **Live result-table row-diff** — SQL expected-vs-actual.
10. **"VS" match-intro splash** — both avatars + ranks + game-type, 2s countdown. Cheap juice
    that applies to *every* mode and makes matches feel like an event.
11. **Replay scrubber upgrade** — timeline of code snapshots/events on the existing
    `/match/[id]/replay` route (we already log `arena_match_events`).
12. **Result-share card** — the OG image route already exists; add a one-tap "share result"
    with the score/ELO delta baked in (partly present in `MatchRoomCode`).

---

## 5. Content expansion (seeded this round)

New `arena_challenges` rows for the **existing** engines, all generated + verified
(solutions executed against their own tests) and inserted **`active=false`** so they do not
touch live matchmaking/daily until reviewed:

- **code_duel** (JS puzzles) — broad algorithm/string/array/object variety, easy→hard.
- **bug_hunt_code** — buggy functions (verified: solution passes all tests AND the buggy
  starter fails ≥1 test, so there's a real bug to find).
- **css_battle** — permissive DOM-checked UI recreations.
- **url_submit** — new build briefs (`speed_build`) + real-site clones (`clone_battle`).

→ See migration `020_*` and §8 for exact counts. **Action for Harvey:** review, then flip the
good ones to `active=true` (one `UPDATE`).

---

## 6. Phased rollout

- **Phase A — content (now)**: 2a seeding above. Doubles the library. Zero risk.
- **Phase B — Regex Duel (now)**: full Tier-1 engine, self-contained, `active=false`.
- **Phase C — Tier 1 finish**: CSS Golf + Refactor Rumble. Add the onion-skin slider + health
  gauge to the UI library.
- **Phase D — Tier 2**: SQL Showdown (pglite) and/or Prompt Golf (pending the cost/abuse
  decision). Pixel-perfect Clone Pro if we want to upgrade the marquee mode.
- **Phase E — lobby surfacing**: decide whether new engines get their own lobby `game_type`
  tiles or stay folded into existing buckets via `mode` (see §7).
- **Phase F — Tier 3 signature**: Sabotage, Build Relay, Boss Battle.

---

## 7. Open questions for the morning

1. **Lobby taxonomy.** New engines currently *can* ride existing buckets via `mode`, but that
   makes the lobby label lie (queue "speed_build", get regex). Do we (a) add first-class lobby
   tiles per engine, or (b) introduce a cleaner two-level picker (category → engine)? My lean:
   give the marquee new modes their own tiles; keep niche ones in an "Arcade/More" group.
2. **Ranked vs casual for new modes.** Roll new engines out as **casual-only** first (no ELO)
   while we tune scoring + anti-cheat, then promote to ranked?
3. **Prompt Golf.** In or out? It's the most on-brand but the only one with per-play API cost
   and an abuse surface. If in: which model, what budget/rate-limit, temp=0?
4. **Visual diff for clones.** Worth standing up a screenshot service to make clone battles
   pixel-exact, or is the onion-skin + DOM-check approach good enough for now?
5. **Content volume target.** How many active challenges per engine do we want before launch?
6. **`mode` naming.** The `arena_challenges.mode` column actually stores the lobby bucket — it's
   confusingly named. Worth a rename to `category` someday (non-urgent, migration cost).

---

## 8. Execution log (overnight 2026-06-06 → 07)

### Done
- [x] **This plan** written (`ARENA_GAME_EXPANSION_PLAN.md`).
- [x] **Regex Duel engine (`regex_duel`)** — a complete, self-contained Tier-1 game type,
      type-checked + lint-clean, wired but inert (no live matchmaking impact):
  - `types/arena.ts` — added `ChallengeType` union (incl. `regex_duel`).
  - `lib/regex-duel-runner.ts` — pure runner + scorer (shared client/server).
  - `lib/actions/finalize-match.ts` — shared score-based match finaliser (reused ELO/XP/
    email pipeline; live `submit-code` left untouched — consolidation noted in §7).
  - `app/api/arena/submit-regex/route.ts` — authoritative server scoring + finalise.
  - `components/arena/match-room-regex.tsx` — the room UI (live corpus highlighting, flag
    chips, golf/par meter, opponent race, result overlay).
  - `app/(arena)/match/[id]/page.tsx` — **additive** branch for `regex_duel` only; strips
    the reference solution before it reaches the client (passes `par` length only).
  - DB: `challenge_type` CHECK extended to include `regex_duel`.
- [x] **Content seeded** — migration `supabase/migrations/020_game_expansion_content.sql`
      (canonical, 46 rows, idempotent `ON CONFLICT DO NOTHING`). Applied live as **`active=false`**.
      Net **40 new** rows inserted (6 code_duel slugs were classics that already existed and
      were correctly skipped):
      | engine | generated | inserted (new, active=false) | note |
      |---|---|---|---|
      | code_duel | 16 | 10 | 6 pre-existing (binary-search, chunk-array, group-by, is-palindrome, two-sum, valid-parentheses) |
      | bug_hunt_code | 10 | 10 | every solution verified passing + every buggy starter verified failing ≥1 test |
      | regex_duel | 6 | 6 | flagship; references verified against corpora |
      | css_battle | 6 | 6 | permissive DOM checks; **needs a visual review** before activating |
      | url_submit | 8 | 8 | 4 build briefs + 4 real-site clones |
- [x] `tsc --noEmit` green; new files lint-clean.

### How content was generated (reproducible)
Three background agents drafted challenge JSON to `.arena-scratch/` (gitignored); a central
verifier (`.arena-scratch/build_migration.cjs`) re-ran every JS solution against its tests
(and every bug-hunt starter to confirm it fails), validated every regex reference against its
corpus, then emitted the migration SQL. Zero challenges failed verification.

### To go live in the morning (one decision + one UPDATE each)
- **Activate content** you like: `UPDATE arena_challenges SET active=true WHERE slug IN (...);`
- **Surface Regex Duel**: it routes correctly the moment any `regex_duel` challenge is
  `active=true` (a `speed_build` queuer can then be served one). For a dedicated lobby tile,
  see §2c — that's the only remaining wiring and it touches live matchmaking, so left for
  discussion (§7 Q1).

### Known content nits (cosmetic, safe — all inert)
- `fix-the-recursive-sum` description says "3 bugs" but effectively has 2; one inline comment
  is misleading. Fully playable (tests are authoritative). Trivial copy edit if desired.
- `css_battle` reference solutions keep styles in `<head>`, so a couple of their own
  `body.innerHTML` DOM checks wouldn't pass the *reference* — irrelevant to scoring (solution
  isn't graded) but worth a glance to confirm the checks are reasonably passable by players.
