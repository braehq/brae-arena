-- 021_css_golf.sql
-- CSS Golf engine: new challenge_type + 5 seeded challenges (all active=false).
-- challenge_type CHECK extended additively; live engines are untouched.

-- Extend the CHECK constraint to include css_golf
ALTER TABLE arena_challenges DROP CONSTRAINT IF EXISTS arena_challenges_challenge_type_check;
ALTER TABLE arena_challenges ADD CONSTRAINT arena_challenges_challenge_type_check
  CHECK (challenge_type IN ('url_submit','code_duel','css_battle','bug_hunt_code','regex_duel','css_golf'));

-- ── Challenges ────────────────────────────────────────────────────────────────
-- mode='clone_battle' so these join the clone-battle matchmaking pool once activated.
-- solution_code = reference implementation used ONLY server-side to compute par length.
-- target_image_url = public SVG served from /css-golf/<slug>.svg.
-- All active=false until Harvey reviews and flips them on.

INSERT INTO arena_challenges
  (slug, title, description, mode, challenge_type, difficulty, time_limit_mins,
   language, starter_code, solution_code, test_cases, target_image_url, active)
VALUES

-- 1. Red Circle (easy)
(
  $c$css-golf-red-circle$c$,
  $c$Red Circle$c$,
  $c$Reproduce a bright red circle (#ef4444) perfectly centred on a dark (#0a0a0f) canvas.
The circle should be roughly 180×180px.
Canvas is exactly 400×300px. Fewer characters = higher golf bonus.$c$,
  $c$clone_battle$c$, $c$css_golf$c$, $c$easy$c$, 10, $c$html$c$,
  $c$<!-- 400×300px canvas — reproduce the target in as few characters as possible -->
<style>
  /* your styles */
</style>$c$,
  $c$<style>body{margin:0;width:400px;height:300px;background:#0a0a0f;display:flex;align-items:center;justify-content:center}.c{width:180px;height:180px;background:#ef4444;border-radius:50%}</style><div class=c>$c$,
  $j$[
    {"label":"has a circular element","input":"document.body.innerHTML.includes('border-radius')","expected":"true"},
    {"label":"has a red fill colour","input":"document.body.innerHTML.includes('ef4444') || document.body.innerHTML.includes('dc2626') || document.body.innerHTML.includes('ff0000') || document.body.innerHTML.includes('red')","expected":"true"},
    {"label":"has a dark background","input":"document.body.innerHTML.includes('0a0a0f') || document.body.innerHTML.includes('#000') || document.body.innerHTML.includes('#111')","expected":"true"}
  ]$j$::jsonb,
  $c$/css-golf/red-circle.svg$c$,
  false
),

-- 2. Tricolor (easy)
(
  $c$css-golf-tricolor$c$,
  $c$Tricolor Flag$c$,
  $c$Reproduce three equal vertical stripes left-to-right: blue (#3b82f6), white (#ffffff), red (#ef4444).
Stripes should fill the entire 400×300px canvas with no gaps.
Fewer characters = higher golf bonus.$c$,
  $c$clone_battle$c$, $c$css_golf$c$, $c$easy$c$, 10, $c$html$c$,
  $c$<!-- 400×300px canvas — reproduce the target in as few characters as possible -->
<style>
  /* your styles */
</style>$c$,
  $c$<style>body{margin:0;display:flex;width:400px;height:300px}.a{flex:1;background:#3b82f6}.b{flex:1;background:#fff}.c{flex:1;background:#ef4444}</style><div class=a><div class=b><div class=c>$c$,
  $j$[
    {"label":"has a blue section","input":"document.body.innerHTML.includes('3b82f6') || document.body.innerHTML.includes('1d4ed8') || document.body.innerHTML.includes('2563eb') || document.body.innerHTML.includes('blue')","expected":"true"},
    {"label":"has a red section","input":"document.body.innerHTML.includes('ef4444') || document.body.innerHTML.includes('dc2626') || document.body.innerHTML.includes('ff0000') || document.body.innerHTML.includes('red')","expected":"true"},
    {"label":"has a white section","input":"document.body.innerHTML.includes('#fff') || document.body.innerHTML.includes('ffffff') || document.body.innerHTML.includes('white')","expected":"true"},
    {"label":"has at least three coloured sections","input":"document.querySelectorAll('div,span,section,td').length >= 3 || document.body.innerHTML.includes('linear-gradient')","expected":"true"}
  ]$j$::jsonb,
  $c$/css-golf/tricolor.svg$c$,
  false
),

-- 3. Bullseye (medium)
(
  $c$css-golf-bullseye$c$,
  $c$Bullseye$c$,
  $c$Reproduce a classic bullseye on a dark (#0a0a0f) canvas: three concentric circles alternating red (#ef4444) and white, outermost-to-innermost: red (r≈120) → white (r≈80) → red (r≈40).
Canvas is exactly 400×300px. Fewer characters = higher golf bonus.$c$,
  $c$clone_battle$c$, $c$css_golf$c$, $c$medium$c$, 15, $c$html$c$,
  $c$<!-- 400×300px canvas — reproduce the target in as few characters as possible -->
<style>
  /* your styles */
</style>$c$,
  $c$<style>body{margin:0;width:400px;height:300px;background:#0a0a0f;display:flex;align-items:center;justify-content:center}.b{width:80px;height:80px;background:#ef4444;border-radius:50%;box-shadow:0 0 0 40px #fff,0 0 0 80px #ef4444}</style><div class=b>$c$,
  $j$[
    {"label":"has circular element(s)","input":"document.body.innerHTML.includes('border-radius')","expected":"true"},
    {"label":"has a red fill","input":"document.body.innerHTML.includes('ef4444') || document.body.innerHTML.includes('dc2626') || document.body.innerHTML.includes('red')","expected":"true"},
    {"label":"has a white ring","input":"document.body.innerHTML.includes('#fff') || document.body.innerHTML.includes('ffffff') || document.body.innerHTML.includes('white')","expected":"true"},
    {"label":"has a dark background","input":"document.body.innerHTML.includes('0a0a0f') || document.body.innerHTML.includes('#000') || document.body.innerHTML.includes('#111')","expected":"true"}
  ]$j$::jsonb,
  $c$/css-golf/bullseye.svg$c$,
  false
),

-- 4. Sunrise (medium)
(
  $c$css-golf-sunrise$c$,
  $c$Sunrise$c$,
  $c$Reproduce a sunrise scene on a 400×300px canvas.
Sky: solid blue (#0ea5e9) filling the background.
Ground: a dark (#0f172a) horizontal strip along the bottom ~100px tall.
Sun: a yellow (#fbbf24) circle (≈180px diameter) centred horizontally, its centre sitting on the horizon line so the lower portion is hidden behind the ground.
Fewer characters = higher golf bonus.$c$,
  $c$clone_battle$c$, $c$css_golf$c$, $c$medium$c$, 15, $c$html$c$,
  $c$<!-- 400×300px canvas — reproduce the target in as few characters as possible -->
<style>
  /* your styles */
</style>$c$,
  $c$<style>body{margin:0;width:400px;height:300px;background:#0ea5e9;overflow:hidden;position:relative}.g{position:absolute;bottom:0;width:400px;height:100px;background:#0f172a}.s{position:absolute;bottom:60px;left:110px;width:180px;height:180px;background:#fbbf24;border-radius:50%}</style><div class=g><div class=s>$c$,
  $j$[
    {"label":"has a circular element (the sun)","input":"document.body.innerHTML.includes('border-radius')","expected":"true"},
    {"label":"has a yellow or orange sun colour","input":"document.body.innerHTML.includes('fbbf24') || document.body.innerHTML.includes('f59e0b') || document.body.innerHTML.includes('fcd34d') || document.body.innerHTML.includes('yellow') || document.body.innerHTML.includes('orange')","expected":"true"},
    {"label":"has a sky-blue background","input":"document.body.innerHTML.includes('0ea5e9') || document.body.innerHTML.includes('38bdf8') || document.body.innerHTML.includes('7dd3fc') || document.body.innerHTML.includes('blue')","expected":"true"},
    {"label":"has a dark ground strip","input":"document.body.innerHTML.includes('0f172a') || document.body.innerHTML.includes('1e293b') || document.body.innerHTML.includes('#000') || document.body.innerHTML.includes('#111')","expected":"true"}
  ]$j$::jsonb,
  $c$/css-golf/sunrise.svg$c$,
  false
),

-- 5. Spinner (medium)
(
  $c$css-golf-spinner$c$,
  $c$Loading Spinner$c$,
  $c$Reproduce a loading-ring indicator on a dark (#0a0a0f) canvas.
A circular ring, roughly 120×120px, with a dark grey track (#1f2937) and an indigo arc (#6366f1) covering roughly three-quarters of the ring, leaving a gap of about 90°.
Canvas is exactly 400×300px. Fewer characters = higher golf bonus.$c$,
  $c$clone_battle$c$, $c$css_golf$c$, $c$medium$c$, 15, $c$html$c$,
  $c$<!-- 400×300px canvas — reproduce the target in as few characters as possible -->
<style>
  /* your styles */
</style>$c$,
  $c$<style>body{margin:0;width:400px;height:300px;background:#0a0a0f;display:flex;align-items:center;justify-content:center}.s{width:120px;height:120px;border-radius:50%;border:16px solid #6366f1;border-top-color:#1f2937;transform:rotate(45deg)}</style><div class=s>$c$,
  $j$[
    {"label":"has a circular element","input":"document.body.innerHTML.includes('border-radius')","expected":"true"},
    {"label":"uses indigo as the ring colour","input":"document.body.innerHTML.includes('6366f1') || document.body.innerHTML.includes('indigo')","expected":"true"},
    {"label":"uses a border to form the ring","input":"document.body.innerHTML.includes('border')","expected":"true"},
    {"label":"has a dark background","input":"document.body.innerHTML.includes('0a0a0f') || document.body.innerHTML.includes('#000') || document.body.innerHTML.includes('#111')","expected":"true"}
  ]$j$::jsonb,
  $c$/css-golf/spinner.svg$c$,
  false
)

ON CONFLICT (slug) DO NOTHING;
