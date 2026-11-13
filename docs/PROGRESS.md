# Progress & handoff notes

Every session: read this first, and update it before finishing. See `docs/PROMPT.md` → "Handoff notes" for the rules.

## Status
| Milestone | State |
|---|---|
| 0 Plan | **done**, approved by the user 2026-11-11 (`docs/PLAN.md`) |
| 1 Foundation (settings, colours, onboarding, evidence pages) | **done** 2026-11-11 |
| 2 First game (falling blocks, "Tumble Stack") | **done** 2026-11-12 |
| 3 Evidence-based tasks (revised plan, `docs/PLAN-M3.md`) | **done** 2026-11-12 |
| 3a Platform: screen-size check, pattern/image primitives, staircase, active minutes, catch check, eyeMode, contrast policy | **done** 2026-11-12 |
| 3b Adult tasks: Letter Crowd, Stripe Finder, Depth Duel, Watch mode (Quiet Reef + own video), Evidence page | **done** 2026-11-12 |
| 3c Star Patrol, Glow Bounce, Split Lines, weekly goal, today's task, sounds, home grouping | **done** 2026-11-12 |
| 4 Progress & polish (dashboard, PWA) | not started |
| 5 Ship (CI, GitHub Pages, README) | not started |

## Next step
Milestone 3 is done (plan: `docs/PLAN-M3.md`; evidence: `docs/research/TASK-EVIDENCE.md`). Eight activities: Letter Crowd, Stripe Finder, Depth Duel (training); Watch (Quiet Reef or your own video); Star Patrol, Glow Bounce, Tumble Stack (games); Split Lines (reading).

1. **The user's real-glasses test** (checklist at the bottom, now with Milestone 3 items). Fix what it finds first: the new tasks lean on calibration and on the screen-size check.
2. **Watch the new tasks in a visible browser tab.** This session's preview pane was hidden, so no task was played in real time (see Known issues). Play one block of each and look at Stripe Finder's grating and Depth Duel's dots on screen.
3. **Milestone 4** (`docs/PROMPT.md`): progress dashboard with charts and the doctor summary (use the new active minutes, trials and catch fields), PWA install and offline, persistent-storage request and export nudge.

Backlog: snake-like game and Twin Peek matching (no tested design behind them); flanked-Gabor task (Polat 2004, needs sub-8-bit contrast).

What Milestone 3 added that games use (all through `engine/api`):
- `GameDefinition.eyeMode` (`dichoptic` | `weakEyeOnly` | `stereo`), `group`, `evidence { badge, note }`, optional `requiresNoEyeTurn`, `usesVisualAngle`, `passive`; `GameMode.needsVideo`, `riskyWithEyeTurn`.
- `GameContext.saved` / `Game.save()` (numbers only, kept in `profile.gameProgress[gameId]`), `ctx.display` (px per degree), `ctx.media` (the player's video), `ctx.sound(kind)`.
- `GameStatus.catches`, `trials`, `targetMet` (logged per round; `targetMet` drives the optional contrast policy).
- `Renderer.pattern(ch, cx, cy, spec)` (dithered grating/noise, cycles per degree), `Renderer.image(ch, src, x, y, w, h, mask, part)` (video or a game-drawn scene as luminance, split by complementary blob masks), `r.pxPerDegree`, `r.pixelRatio`.
- `Staircase`, `CatchSchedule`, `randomBlobs`, `testGameContext` are exported from `engine/api`.
- `GameInput` `{ kind: 'key', key }` for letters; `ctx.weakEyeSide`; `ctx.text` with `GameMode.needsText`; `Renderer.measure(s, o)`; `TouchButton.group` ('move' | 'act').

How to add a game (everything else comes for free):
- Make `src/games/<id>/` with `logic.ts` (pure, tested), `game.ts` (implements `Game` from `src/engine/api.ts`) and `index.ts` (a `GameDefinition`). Copy the shape of `src/games/falling-blocks/`.
- Add it to `src/games/registry.ts`. The home tile, play screen, pause menu, touch buttons, break overlay, session log, the rule 3 live-colour test and the 60-second flash test then cover it with no other change.
- A game may import only `engine/api` and its own files, never picks a colour, and uses `ctx.rng` instead of `Math.random` (rule 1 test and ESLint enforce this). It must draw something at full intensity in both eye channels within the first seconds of play (rule 3 test).
- Anything a player needs in order to play goes to `weakEye` or `fellowEye`, split so neither eye can play alone. Only frames and grids go to `both`.

Rules from the user so far: update and commit this file after every milestone. On 2026-11-12 the user lifted the earlier "do not push, do not add a remote" rule: the GitHub remote `origin` (https://github.com/SIDLAD/binocular-play, public) is allowed, and `main` deploys to GitHub Pages through `.github/workflows/pages.yml`. Push only `main` changes the user wants live.

## Decisions log
- 2026-11-11: Stack is Vite + TypeScript + Canvas 2D, static site on GitHub Pages, MIT license. No backend, analytics or accounts. (Planning session, Opus 5.5)
- 2026-11-11: Colours go through the `weakEye` / `fellowEye` / `both` channels only. Calibration is a persistent, editable setting per profile and per device. (Planning session)
- 2026-11-11: Build in a few big steps with handoff notes in this file, not one shot. (Planning session)
- 2026-11-11: Milestone 0 plan approved as written, including the "defaults I am choosing" in `docs/PLAN.md` §8. (Fable 5.2)
- 2026-11-11: Fellow-eye contrast is applied in linear light, so 20 % is roughly 20 % luminance. Scaling the stored value would give about 3 %. Why: the CLAUDE.md wording "20–100 % brightness" is ambiguous on a gamma-encoded screen. (Fable 5.2)
- 2026-11-11: Eye channels are drawn with the canvas `lighten` blend mode on dark backgrounds and `darken` on light. Why: with normal drawing, an overlapping shape hides the other eye's shape. (Fable 5.2)
- 2026-11-11: Calibration is stored per lens (red lens, other lens), not per eye. Why: it describes the glasses and screen, so swapping the weak eye or lens side must not lose it. (Fable 5.2)
- 2026-11-11: The landing shadow and "next piece" go to the weak eye, not `both`. Why: in `both` the strong eye could play alone. Only the frame and grid are `both`. (Fable 5.2)
- 2026-11-11: The free colour wheel may produce a colour both eyes can see. Presets and guided calibration stay provably separable; the wheel is an override with a non-blocking warning. Why: real lenses are not ideal, so the user must be able to tune freely. (Fable 5.2)
- 2026-11-11: Light-background mode ships as an advanced setting, off by default, with its own 12 mapping test rows. (Fable 5.2)
- 2026-11-11: App chrome is neutral grey/white on dark; colour appears only through the channels. No UI framework, no runtime dependencies. (Fable 5.2)
- 2026-11-11: Schema additions beyond the plan's §4: `AppData.deviceId`, `Calibration.needsCheck`, `GameDefinition.modes`, `GameContext.mode`. Details in `docs/PLAN.md` §11. (Fable 5.2)

- 2026-11-11: Evidence page numbers were corrected against the PubMed abstracts, and differ from `docs/EVIDENCE.md`: CureSight is 149 children, non-inferior to patching (the "0.28 vs 0.23 logMAR" figures are not in the abstract and are not shown); PMC5145771 is the PEDIG trial in ages 5–12 (22 % did >75 % of play; patching did better); PMC6206863 is the teenager trial (13 %); PMC4549157 is a review, not the patching dose trial; PMC5984723 is a 21-child action-game pilot. The "88 % → 73 % real-world adherence" and "86 % compliance" claims had no source I could confirm, so they are not in the app. (Fable 5.2)
- 2026-11-11: Onboarding has 8 numbered steps: disclaimer, who is playing, safety questions, glasses, lens side, weak eye, colour set-up, balance. The profile is created when the disclaimer is accepted. "Not sure" counts as "yes" for eye turn and double vision, and as "no" for clinician approval. (Fable 5.2)
- 2026-11-11: The guided colour step lowers the brightness of the colour meant for the covered eye until the open eye cannot see it, never below 20 %. The hidden-number check also detects swapped lenses and offers to swap the setting. (Fable 5.2)
- 2026-11-11: Routes that work before onboarding is finished: onboarding, evidence, treatments, players. Everything else redirects to onboarding. (Fable 5.2)
- 2026-11-11: `Math.random` is banned under `src/games/` (games use the seeded `rng` from `GameContext`). Added to the rule 1 scanner. (Fable 5.2)

- 2026-11-11: Rule 3's test expects every game to draw something at full intensity in both eye channels after a few seconds of play, so the live-colour check can find both colours. (Fable 5.2)
- 2026-11-11: Tumble Stack touch controls: drag sideways moves one column per cell, a slow drag down lowers the piece without locking it, a tap turns, a fast flick down drops. Mode order is classic then easy. (Fable 5.2)

- 2026-11-12: The play screen (`src/app/screens/play.ts`) owns everything around the canvas; `GameShell` owns the canvas. A round is logged once, when it ends (`gameOver`, `quit`, `timer`, `doubleVision`); rounds under one second are not logged, except a safety stop, which always is. Session time is saved once a second. (Fable 5.2)
- 2026-11-12: "Adjust colours" in the pause menu opens the colour editor as a bottom sheet and shrinks the paused game into the space above it, so the game itself is the live preview. (Fable 5.2)
- 2026-11-12: On short landscape screens the touch buttons move to the left and right of the game. (Fable 5.2)
- 2026-11-12: The Other treatments page opens with "Is playing these games enough on its own? No." and a list of what else is needed (exam, glasses, patching or drops if prescribed, check-ups, tell the eye doctor). Why: the user asked whether the games are sufficient; the page listed treatments but never answered that directly. It describes standard care in general and sets no dose. (Opus 5.5)

- 2026-11-12: Milestone 3 re-planned around the evidence (`docs/PLAN-M3.md`, `docs/research/TASK-EVIDENCE.md`). Snake and matching moved to the backlog; the flanked-Gabor task is not built. (Opus 5.5)
- 2026-11-12: Pure helpers games need (staircase, catch schedule, blob generator) are re-exported from `engine/api`, so rule 1 ("games import only engine/api") still holds. (Opus 5.5)
- 2026-11-12: Patterns are dithered with Floyd–Steinberg error diffusion done in linear light; a primary the channel colour shares with the background is never touched, so eye separation survives dithering. Unit test: mean and contrast within 1 % down to 3 % contrast. (Opus 5.5)
- 2026-11-12: Without a canvas (tests), the pattern and image primitives draw stand-in bitmaps that carry the channel colour and light coverage, so the live-colour and flash tests still cover them. Video/scene pixels are read from an offscreen canvas at most 480 px on the long side. (Opus 5.5)
- 2026-11-12: Active time = unpaused time minus stretches of more than 10 s with no input (passive games excepted). The break countdown still uses all unpaused time (safer for breaks). Old session records count all their time as active. (Opus 5.5)
- 2026-11-12: Stereo games get a palette with the fellow eye at full brightness (`resolvePalette(p, { fullFellow: true })`), still the one line that reads `fellowContrast`. Why: depth needs matched images (Xi 2014). (Opus 5.5)
- 2026-11-12: "Eye-turn caution" = eye turn or double vision answered anything but a clear "no". It hides `requiresNoEyeTurn` games on home and on the play route, and hides `riskyWithEyeTurn` modes. (Opus 5.5)
- 2026-11-12: Contrast policy (off by default): applied at most once a day, only for dichoptic games, when the day's active minutes first reach 15: +2 points if the round met its target, −5 if not; never above 80 % or the latest balance-check level; "hold" freezes it; every change is logged on the grown-ups page. The weekly balance check (`#/balance`) is offered on home only while the policy is on. (Opus 5.5)
- 2026-11-12: Screen-size check (`#/display`) is per device. Narrow screens (< 600 px) match the card's short edge (53.98 mm), because a card is wider than a phone. Until it is done, sizes use estimates (3.8 px/mm desktop, 6.3 px/mm phone; 60 / 50 cm). (Opus 5.5)
- 2026-11-12: Weekly goal (default 5 days × 20 min) lives in the profile and is set on the grown-ups page; home display is 3c. (Opus 5.5)

- 2026-11-12: `GameInput` gained `{ kind: 'key', key }` for letter keys A–Z (sent as well as any action the key maps to), and `GameContext.weakEyeSide` (not a colour) so Depth Duel can make a patch nearer with crossed disparity. `testGameContext()` lives in `engine/api` so game tests can use it under rule 1. (Opus 5.5)
- 2026-11-12: Letter Crowd: own stroke letters (C D H K N O R S V Z on a 5×5 grid), 4 flankers, spacing staircase 3-down-1-up ×0.92 from 2× to touching, letters shrink 10 % after a block at ≤ 1.2× spacing with ≥ 70 % right (grow 10 % if ≥ 2.3× with < 60 %). Target 300 ms for the first two blocks, then 150 ms; Relaxed is untimed and 1.5× larger. Start size 60 arcmin (deliberately large). Four weak-eye dots are always on screen so the rule 3 test (and the eye) always has a weak-eye target. (Opus 5.5)
- 2026-11-12: Stripe Finder: first block finds the training frequency with a 3-down-1-up staircase on stripe period at 0.5 contrast; later blocks run the contrast staircase (×0.9 / ×1.1) at that frequency and nudge it ±10 % to stay near the cut-off. Capped at 4 device px per cycle. Push mode (noise for the strong eye) is hidden after a risky screening answer. (Opus 5.5)
- 2026-11-12: Depth Duel: random-dot patches; only the weak eye's copy of the nearer patch moves, by whole device pixels (2-down-1-up, ×0.9 / ×1.1, 1–24 px); each patch also jitters sideways by the same amount in both eyes to hide position cues. Starts with a 3-second "if anything looks double, stop" card. (Opus 5.5)
- 2026-11-12: Watch: blobs move every 10 s with a 1 s cross-fade; weak eye gets "inside" at full brightness, strong eye "outside" at the profile's contrast. A weak-eye-only star every 20–40 s is the catch check. Video stays an object URL, freed when the screen closes. (Opus 5.5)
- 2026-11-12: Evidence page: Adults section rewritten (monocular vs dichoptic split, hours, BRAVO null at home, "results vary; none tested this app") and a new "Where each activity comes from" section with "what the studies used" doses. (Opus 5.5)

- 2026-11-12: Star Patrol: the cave and ship go to the strong eye, enemies, pickups, shields and gate stripes to the weak eye. Gate stripes run a 3-down-1-up contrast staircase and count as the catch check; enemy speed/rate adapt every 10 enemies (> 80 % destroyed: ×1.06, < 70 %: ×0.94). Shots fire on their own about 3 times a second; hits fade out over 300 ms (no flashes). (Opus 5.5)
- 2026-11-12: Glow Bounce: ball, paddle and lives to the weak eye, bricks to the strong eye, walls to both (Dig Rush split). A lost ball makes it 10 % slower and 8 % wider; a cleared wall 8 % faster and 4 % narrower; saved per profile. Auto-launch after 3 s. (Opus 5.5)
- 2026-11-12: Split Lines: words alternate eyes across the whole text; three short original passages written for the app (no third-party text), or pasted text kept in memory only. Font 16–48 px (saved). Marked passive, so reading without pressing still counts as active. Background lightness is the existing Settings → Background, not a per-game control. (Opus 5.5)
- 2026-11-12: Home: "Today's pick" rotates by calendar day through the games this player may see; groups Training / Watch / Games / Reading; each tile shows an eye tag and the evidence badge. Stats: active minutes today, goal days this week (goal set on the grown-ups page), weeks in a row with the goal met. (Opus 5.5)
- 2026-11-12: Adult theme: adult profiles get no cartoon avatar in the top bar and a plain greeting ("Glasses on, Sam?"). Settings and the grown-ups page were already ungated for adults. Sound on/off is now in Settings → Play time; Tumble Stack also plays tones on a cleared row and a new level. (Opus 5.5)
- 2026-11-12: The 60-second flash tests got a 30 s timeout; Letter Crowd's many stroke segments took over 5 s on a busy run. (Opus 5.5)
- 2026-11-12: Colour editor reworked after user feedback ("setting this is a huge pain"). Each colour card now has a test patch on the real background, numbered "cover your LEFT/RIGHT eye" steps naming the lens and weak/strong eye, and Red/Green/Blue sliders with number fields (they edit the drawn colour; stored as base + brightness via `lensColourFromDrawn`). The wheel and hex field are folded under "Colour wheel and hex code". The separation note moved from a page-level notice into a reserved line inside each card, shown only after the colour has been still for 1.2 s, and reworded as "fine as long as the patch still vanishes". Why: the old notice popped up and pushed the page around on every drag, the wheel made exact R/G/B hard, and nothing said which eye to cover. (Opus 5.5)
- 2026-11-12: Search engines: the app uses hash routes, which Google treats as one URL, so `scripts/seo-pages.ts` (a Vite plugin) writes plain HTML pages at build time: `about/`, `evidence/`, `treatments/`, plus `sitemap.xml` and `robots.txt`. They are generated from `src/core/content/*` and the game registry, so they cannot drift from the app, and load no scripts. `index.html` has canonical, Open Graph and WebApplication JSON-LD tags; the app footer links to `./about/`. Why: the evidence and treatment pages are the content people search for. Not done: submitting the sitemap in Google Search Console (the user's account). (Opus 5.5)
- 2026-11-13: Training tasks let the player pick how many answers a block lasts, on the start card and the result card: Depth Duel 5/10/20/40, Letter Crowd 10/25/50, Stripe Finder 10/30/60 (the defaults stay 40/50/60). Stored per profile and per game in `profile.blockTrials[gameId]` (new field; old files load with `{}`), declared by `GameDefinition.blockLengths`, read by games as `ctx.blockTrials`. Pause → "End this block now" (`Game.endNow()`, `GameShell.endNow()`) ends the block and logs it through the normal result path (`endedBy: 'gameOver'`, partial trials kept). Why: the user asked that a player for whom Depth Duel "is not working out" can stop short of a full block. (Opus 5.5)
- 2026-11-13: Short blocks and the staircases: a block "settles" at 4 reversals (`Staircase.settled()`); `GameStatus.settled === false` puts a "short block, the level is a rough guide" line on the result card. Between-block changes are damped so short blocks neither race ahead nor drift easier: the start back-off (Depth ×1.5, Stripe ×1.3) shrinks for blocks under 20 (`startBackOff`); an unsettled Depth Duel block moves the saved disparity half way (log steps) by what the answers changed; Letter Crowd's size and Stripe Finder's frequency nudge only after 2 reversals; a Stripe Finder finding block ended before 10 answers keeps finding next time from the period it reached (`saved.period`). (Opus 5.5)
- 2026-11-13: `GameDefinition.notWorkingNote` (Depth Duel only): a gentle line in the pause menu, just above the "I see double / my eyes hurt" button, and on the result card when the block went under 60 % or missed its target: depth does not show up for everyone, pick a shorter block or something else, tell the eye doctor or orthoptist, stop with the double-vision button. No diagnostic claim. (Opus 5.5)

- 2026-11-13: Hidden-number check and guided set-up now show "Cover your LEFT/RIGHT eye" on a blank screen first, with a big "I've covered it, show the numbers/shapes" button; digits and test shapes appear only after that (`coverStep()` in `calibration.ts`). Why: real-glasses test by the user: the old screen showed both digits to both eyes before the eye was covered, which biased the answer. Answer/outcome logic (including swapped-lens detection) unchanged. The colour cards' own test patches stay always visible: they are a tuning aid, not a hidden test. (Opus 5.5)
- 2026-11-13: Glasses type and red-lens side are now on the Colours page and the pause-menu colour sheet too ("Your glasses", open on the page, folded in the sheet), with a "Swap sides" button. One shared component, `src/app/components/glassesControls.ts`, also used by Settings (which gained Swap sides). Changing glasses still asks first and resets the colours to the new preset. The section sits outside the editor's rebuilt area so the button keeps focus; the cards rebuild after every change. Weaker eye stays in Settings (gated for children), linked from the page. Why: the user, on `#/colours`, could not find where to change the glasses. (Opus 5.5)
- 2026-11-13: The intro screens of the guided set-up and the hidden-number check have an optional "Go full screen" button (Fullscreen API on the document element, in try/catch), hidden where `document.fullscreenEnabled` is false (iPhone Safari), with a text tip either way ("make the browser window as big as you can"). Never forced; a refusal does not block the test. Full screen is left again when the flow closes, if it was entered from there. (Opus 5.5)
- 2026-11-13: `Renderer.pattern()` now keys its cache on the rounded device-pixel size `n`, not the raw `spec.size` float. Star Patrol also samples the cave at the gate's own x (not clamped to the screen) and fixes each gate's stripe contrast when it appears (`gateContrast`), so each window is built once, while still off-screen. Why: the user reported Star Patrol going "frame by frame" at the gates. The gate size came from `world + gate.x`, which drifts in about the 13th decimal, so every frame or two missed the cache and rebuilt two ~284 px dithered gratings (~12 ms each at 1280×720). Rule for games: anything passed to `pattern()` should stay fixed while the patch is on screen; a changing contrast or size means a rebuild. (Opus 5.5)

## Known issues / TODOs
- Block lengths (2026-11-13): checked in the browser at desktop and 375×812 (chooser remembered per profile, a 5-answer Depth Duel block ran to its result card and was logged with 5 trials, pause menu with "End this block now" and the note fits, no sideways scroll). The pane was hidden, so animation frames stopped after a while; "End now" after real answers was covered by the jsdom test, not watched live. Not yet tried with real glasses.
- **No task was played in real time in a browser this session** (pane hidden, no animation frames). Verified in the browser: start cards, first frames, canvas colours per channel, layouts at three sizes, video loading, home and grown-ups pages. Not verified in the browser: timing (150 ms letters, 400 ms gratings), staircases moving, gate passes, ball physics, page turns, idle detection, catches. All of these have unit tests.
- Star Patrol's "gates appear every 20–40 s" test only checks the count when the ship survives two minutes without steering, which it may not.
- The Depth Duel intro card cannot be skipped with the keyboard until 0.8 s have passed (stops an accidental tap); it moves on by itself after 3 s.
- Split Lines' own-text mode loses the text on "Play again" after a reload of the page (by design: it is never stored).
- The "Go full screen" button was checked in the in-app preview pane, which refuses full screen (the refusal is handled). Entering and leaving full screen was not seen in a real browser tab.
- In a hidden preview pane the play canvas only resizes on a window `resize` event (animation frames and ResizeObserver do not run). Not a bug in a visible tab, but layouts in this session were checked by firing `resize` by hand.
- Stripe Finder's grating and Depth Duel's dots were checked in the browser only as first frames (pane hidden); the dithered grating itself is covered by unit tests, not looked at on screen.
- Browser checks in this session ran with the preview pane hidden, so animation frames did not run: real-time play (rounds, idle detection, catches) was not watched in the browser. Unit/jsdom tests cover the timing logic.
- Reloading or closing the tab in the middle of a round loses that round's log entry (session time is kept). A `pagehide` handler could save it.
- Touch gestures on the canvas (drag, tap, flick) are covered by the flash test's random pointer input but were not tried with a real finger. The on-screen buttons were only checked for layout.
- The game-over card was reached in the browser but not looked at in a screenshot.
- `startLevel` is always 1; adaptive difficulty is Milestone 3.
- Link check 2026-11-11 (`npm run check-links`): 23 of 25 load. Check by hand, they refuse scripts (HTTP 403): https://ouci.dntb.gov.ua/works/40NpAzy9 and https://core.ac.uk/download/481629086.pdf.
- Evidence text for the AAO, Cochrane, ESCRS and Review of Optometry links repeats the summaries in `docs/EVIDENCE.md`; only the PubMed/PMC abstracts were read in full. Read those pages before Milestone 5.
- The glasses drawing in onboarding shows the lens colours through the channels, which is only right on a dark background (onboarding always is).
- The parent dashboard is a plain table for now; charts and the doctor summary are Milestone 4.
- Auto-contrast and sound settings exist in the schema but have no UI yet (Milestones 3–4).
- Check that every link in docs/EVIDENCE.md loads. The AAPOS, AAO, NEI and PubMed links were added from Gemini research and aren't checked yet.
- The CureSight trial numbers in docs/EVIDENCE.md are not verified (sources disagree: 149 vs 103 children). Read the PubMed abstracts before writing the Evidence page.
- Not yet tested with real anaglyph glasses.
- Safari can delete localStorage after 7 days without a visit unless the site is installed to the home screen. Planned mitigation: request persistent storage, an export nudge, and the PWA install in Milestone 4.
- Night-light / True Tone / auto-brightness change colours after calibration. The calibration screen must say to turn them off.

## How to run
- `npm install` once. Node 26, npm 11.
- `npm run dev`: dev server at http://localhost:5173 (also `.claude/launch.json` → "binocular-play-dev" for the preview pane).
- `npm test`: Vitest. Rule tests are in `tests/rules/` (one file per hard rule, plus `rule5-safety-dom` which runs the real app in jsdom), app tests in `tests/app/`, unit tests next to the code as `*.test.ts`.
- `npm run lint`, `npm run build` (type-check + static build to `dist/`), `npm run check-links` (needs network).
- To start from scratch in the browser: clear site data, or delete the `binocular-play` key in localStorage.

## Repo state
- Remote `origin` = https://github.com/SIDLAD/binocular-play (public). Every push to `main` runs the tests, builds and deploys to GitHub Pages: https://sidlad.github.io/binocular-play/
- A private claude.ai preview of the Milestone 3 build also exists: https://claude.ai/artifact/BNdzmSEPqhog2aHTbJoDY1 (republish from `dist/index.html` + `dist/assets/*`).
- `.claude/settings.local.json` is local-only and is listed in `.gitignore`.

## Session log
- 2026-11-11, Opus 5.5: prior-art research, evidence gathering, wrote CLAUDE.md, PROMPT.md, RESEARCH.md, EVIDENCE.md, and this file. No code yet.
- 2026-11-11, Opus 5.5: added the Gemini deep-research report (docs/research/) and distilled it into docs/USER-FEEDBACK.md. New MUSTs: double-vision safeguards, better calibration UX, adaptive difficulty, countdown and weekly goals, a low-effort mode, a "free forever" statement. Reading mode is a SHOULD.
- 2026-11-11, Fable 5.2: read all docs, wrote the Milestone 0 plan (five hard rules, truth table, schema, `Game` interface, game designs, risks in CLAUDE.md), got it approved, saved it as docs/PLAN.md with implementation notes in §11, ran `git init`. The user moved the build to a fresh session to save tokens, so no code was written. Commit: "Add project docs and approved Milestone 0 plan".
- 2026-11-11, Fable 5.2: Milestone 1. Scaffold, colour maths, channel renderer and recording context, settings store with export/import, safety guards, onboarding, guided colour set-up, Colours page, settings, players, grown-ups page, evidence pages. 249 tests pass; lint and build clean; walked in the browser at desktop, 375×812 and 812×375. Commit: "Milestone 1: foundation".
- 2026-11-11, Fable 5.2: started Milestone 2 and paused at the user's request. Tumble Stack rules, drawing and definition, plus the engine loop, input and shell, are in; the play screen is not. 274 tests pass; lint and build clean; the new engine files are untested in a browser. Commit: "Milestone 2 (part): Tumble Stack rules, drawing and engine shell".
- 2026-11-12, Fable 5.2: finished Milestone 2. Real play screen (start card, score/level/countdown, pause menu with colour sheet and stop button, touch buttons, game-over card, break overlay, session log). 276 tests pass; lint and build clean. In the browser: played a round with the keyboard; canvas pixels matched the palette (weak #ff0000, strong #009595 at 30 %, frame #999999); changing colours from the pause menu changed the pixels with no reload; phone portrait and landscape layouts fit; break overlay appeared at 0:00 and logged the round; no console errors. Commit: "Milestone 2: Tumble Stack playable end to end".
- 2026-11-12, Opus 5.5: progress check against the original "Amblyopia game with red/blue glasses" chat: Milestones 1–2 match the user's stated requirements (gaps that are on the plan: hosting, README, Playwright smoke test, auto-contrast UI). Fast-forwarded `main` to the Milestones 1–2 branch at the user's request. Added the "enough on its own?" box to the Other treatments page. 277 tests pass; lint and build clean; checked the page in the browser.

- 2026-11-12, Opus 5.5: Milestone 3 re-plan landed (`docs/PLAN-M3.md`, `docs/research/TASK-EVIDENCE.md`). Built 3a: visual-angle maths and screen-size check, dithered pattern and masked image primitives, staircase, catch schedule, contrast policy + balance check, active minutes, catch/trial logging, weekly goal data, eyeMode-aware rule 3 test, eye-turn hiding. 319 tests pass; lint and build clean. Browser: screen-size check saves per device; start card shows the evidence badge; grown-ups page shows active minutes, goal and contrast log; settings, display and balance pages fit at 375×812 and 812×375 with no horizontal scroll; no console errors.

- 2026-11-12, Opus 5.5: Milestone 3b. Letter Crowd, Stripe Finder, Depth Duel and Watch (Quiet Reef + your own video), Evidence page Adults and "Where each activity comes from". 358 tests pass; lint and build clean. Browser (pane hidden, so first frames only): start cards show the evidence badge and the sit-this-far note; canvas pixels: Letter Crowd and Stripe Finder red + grey only, Depth Duel red + cyan with cyan at 255 while the profile is at 30 %, Watch weak-eye red up to 254 and strong-eye cyan ≤ 144; a generated local video loaded through the picker and was drawn split between the eyes; every task fits at 375×812 and 812×375 with no horizontal scroll; no console errors.

- 2026-11-12, Opus 5.5: Milestone 3c. Star Patrol, Glow Bounce, Split Lines; home grouping, today's pick, weekly goal and week streak, eye tags and evidence badges on tiles; adult theme; sound toggle; touch-button groups. 385 tests pass (twice in a row); lint and build clean. Browser (pane hidden, first frames only): every new game draws only in its channels (strong eye ≤ 149 at 30 %), fits at 375×812 and 812×375 with no horizontal scroll, touch buttons group as expected; home shows four groups, today's pick and the goal; no console errors. Milestone 3 complete. Nothing pushed; no remote.
- 2026-11-12, Opus 5.5: search-engine pages (see Decisions). 388 tests pass; tsc, lint and build clean; checked `/about/` and `/evidence/` in `vite preview`, the JSON-LD parses and every link resolves. `.claude/launch.json` gained a `binocular-play-preview` config (port 4173) for checking built output.
- 2026-11-13, Opus 5.5: two fixes from the user's real-glasses test (red/green): cover-eye step before the hidden numbers and the guided shapes; "Your glasses" (type, red-lens side, swap) on the Colours page and pause sheet via a shared component. New `tests/app/colours.test.ts` (4 tests). 392 tests pass; lint and build clean. Checked in the browser at desktop and 375×812: onboarding colour set-up and number check show a blank screen with the cover instruction first; swap updates the cards and keeps focus; glasses change shows the confirm dialog and renames the cards; the pause sheet shows the folded section. No console errors. Follow-up the same day: optional "Go full screen" on both intro screens (2 more tests, 394 pass).
- 2026-11-13, Opus 5.5: Star Patrol gate slowdown fixed (see Decisions). Measured render time per frame with the gate on screen, via a script on a real canvas in the dev server. Before, at 1280×720 dpr 1: 6.5 ms average, 11–16 ms on every other pair of frames, pattern cache full (48 entries). After: p50 ≈ 0 ms, p99 ≤ 0.2 ms at 1280×720 dpr 1 and 2, 375×812 dpr 3 and 812×375 dpr 3, with one 12–57 ms build per gate while it is still off-screen. New `src/engine/renderer.test.ts` (3 tests; 2 fail without the fix). 397 tests pass; lint and build clean. Not yet played with glasses on a real phone.

## Real-glasses checklist for the user
Run `npm run dev`, open http://localhost:5173, clear site data first if you want the first-run flow.
1. Onboarding → colour set-up. Cover each eye in turn: does the square vanish when you lower the slider? Note the percentage where it does, and whether a ghost remains at 20 %.
2. Hidden numbers: with one eye covered, do you see exactly one number? Flip the glasses over and check that the app notices and offers to swap the lens sides.
3. Balance screen: with both eyes open, can you see the circle and the square together? Does lowering the slider make the weaker eye's circle easier to hold?
4. Tumble Stack, weaker eye covered: the falling piece, its shadow and the next piece should disappear; the stack, frame and grid stay. Stronger eye covered: the reverse.
5. Both eyes open: can you land a piece in a gap in the stack? Is the grey frame comfortable or too bright (Colours → Frame brightness)?
6. Pause → Adjust colours while a piece is on screen: move a slider and watch the game change behind the sheet.
7. On a phone: are the buttons big enough, and do drag, tap-to-turn and flick-down feel right?
8. Try red/blue or red/green glasses if you have them, and say which colours leak.
9. Anything that flickers, hurts or looks double: stop, and tell me what was on screen.

Milestone 3 additions (do the screen-size check first: Settings → Screen size):
10. Screen-size check: does the box really match your card (or 8.56 cm / 5.4 cm on a ruler)? Is the "sit this far" distance on each training task's start card about right for how you sit?
11. Letter Crowd and Stripe Finder, stronger eye covered: you should see the letters / stripes. Weaker eye covered: they should vanish, leaving only the grey frame and buttons. Is a 150 ms letter readable at all at first? Do the faintest stripes still look like stripes and not like noise or banding?
12. Stripe Finder Push mode (only shown after two clear "no" safety answers): is the grey noise over the stripes comfortable?
13. Depth Duel: with both eyes open, does one square look nearer or farther than the other? Does "nearer" match what the game says? Any double vision or strain: stop and tell me.
14. Watch (Quiet Reef, then a video of your own): is the dimmed picture comfortable to watch for a few minutes? Do the soft patches moving every 10 seconds bother you? Can you see the star with only the weaker eye?
15. Star Patrol: can you see the striped gate windows and tell which way they lean? Is the cave too bright or too dim?
16. Glow Bounce: can you follow the ball with both eyes open? Weaker eye covered, the ball and paddle should vanish.
17. Split Lines: can you read a whole line with both eyes open? With one eye covered, every other word should vanish.
18. Any task: anything that flickers, swims or looks double: stop, and say which task and what was on screen.
- 2026-11-12, Opus 5.5: colour editor usability fix (see Decisions). New `src/app/components/colourControl.test.ts` (RGB round trip; a zero primary stays zero). 388 tests pass; lint and build clean; checked on `#/colours` at desktop and 375×812 (hint hidden while dragging, appears after the pause; no sideways scroll). Not yet checked with real glasses.
- 2026-11-13, Opus 5.5: rounds per block for training tasks (see Decisions), from the user's real-glasses feedback on Depth Duel. New `src/core/progress/blockLength.ts` (+ test), `Staircase.settled()`, `Profile.blockTrials`, `GameDefinition.blockLengths` / `notWorkingNote`, `GameContext.blockTrials`, `GameStatus.settled`, `Game.endNow()`. 403 tests pass; tsc, lint and build clean. Browser check as in Known issues. Not pushed to main; waiting for the user's OK to go live.
