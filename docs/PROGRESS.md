# Progress & handoff notes

Every session: read this first, and update it before finishing. See `docs/PROMPT.md` → "Handoff notes" for the rules.

## Status
| Milestone | State |
|---|---|
| 0 Plan | **done**, approved by the user 2026-11-11 (`docs/PLAN.md`) |
| 1 Foundation (settings, colours, onboarding, evidence pages) | **done** 2026-11-11 |
| 2 First game (falling blocks) | **in progress**: rules, drawing and engine done; play screen not built |
| 3 Four more games | not started |
| 4 Progress & polish (dashboard, PWA) | not started |
| 5 Ship (CI, GitHub Pages, README) | not started |

## Next step
Finish Milestone 2. The user paused the build here on 2026-11-11 and may continue with a different model.

Done and committed for Milestone 2 (all tests pass, lint and build clean):
- `src/games/falling-blocks/`: `logic.ts` (pure rules, 25 tests in `logic.test.ts`), `game.ts` (drawing, keyboard and touch gestures), `index.ts` (definition, modes `classic` and `easy`, tile icon). Registered in `src/games/registry.ts`, so the home tile, the rule 3 live-colour test and the 60-second flash test already cover it.
- `src/engine/loop.ts` (fixed 60 Hz), `input.ts` (keyboard and pointer), `shell.ts` (`GameShell`: canvas sizing, loop, input, pause, restart, repaint on palette change while paused). None of these three has been run in a browser yet.

Still to do:
1. Replace the stub in `src/app/screens/play.ts` with the real play screen, as described in `docs/PLAN.md` §11 "Engine and tests": start card (title, `eyeRule`, `controls`, mode buttons) → `GameShell` on a full-height canvas → HUD as DOM text (score, level, countdown from `remainingMs`/`formatClock` in `core/safety/session.ts`) → pause (button, Escape/P, tab hidden) showing `pauseMenu()` from `app/components/safety.ts` → "Adjust colours" opens `colourEditor(app, scope, { sheet: true })` in a `.editor-sheet` with the paused game visible above it → on-screen buttons from `def.touchButtons` when `isTouchDevice()` → game-over card → break overlay (`breakOverlay()`; "5 more minutes" goes through `requireParent` then `app.session.extend`).
   - Keep the guard as it is: `play.ts` decides with `canStartGame()` only and must not mention `disclaimerAcceptedAt`, `doubleVisionBlockedOn`, `checkPassedAt` or `completedAt` (a rule 5 test scans for them).
   - Session logging: feed `onActiveTime` into `app.session.addPlay` (throttle the writes) and, when a round ends, store one record with `makeRecord` + `addSessionRecord` (`core/progress/sessionLog.ts`), `endedBy` = `gameOver | quit | timer | doubleVision`. Log an unfinished round as `quit` when the screen is disposed, once only.
   - The stop button must log the round as `doubleVision` and then call `stopForDoubleVision(app, 'double-or-pain-in-game')`.
   - Seed the game with `seededRng(...)`; `reducedMotion` from `prefersReducedMotion(profile.ui.reducedMotion)`; `startLevel` 1.
   - Add CSS for the play layout to `src/app/styles/base.css` (neutral greys only; no looping animation under 1 s).
2. Extend `tests/rules/rule5-safety-dom.test.ts`: on the real play screen, pausing shows the stop button, and pressing it logs the round and blocks play.
3. Verify as in `docs/PLAN.md` §10: lint, tests, build; play a round in the browser with keyboard and at 375×812 and 812×375; read pixels from the game canvas and confirm they match the palette, then change a colour from the pause menu and confirm they change with no reload; check the console.
4. Update this file, commit, and finish with: what was built, what was and was not verified, and a short real-glasses checklist.

Rules from the user for this step: do not push and do not add a git remote; update and commit this file after every milestone.

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

## Known issues / TODOs
- `#/play/falling-blocks` still shows the Milestone 1 stub (title and blurb only) after the double-vision check: the game cannot be played in the app yet.
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
- Git repo initialised on branch `main`. No remote. Nothing has been pushed.
- `.claude/settings.local.json` is local-only and is listed in `.gitignore`.

## Session log
- 2026-11-11, Opus 5.5: prior-art research, evidence gathering, wrote CLAUDE.md, PROMPT.md, RESEARCH.md, EVIDENCE.md, and this file. No code yet.
- 2026-11-11, Opus 5.5: added the Gemini deep-research report (docs/research/) and distilled it into docs/USER-FEEDBACK.md. New MUSTs: double-vision safeguards, better calibration UX, adaptive difficulty, countdown and weekly goals, a low-effort mode, a "free forever" statement. Reading mode is a SHOULD.
- 2026-11-11, Fable 5.2: read all docs, wrote the Milestone 0 plan (five hard rules, truth table, schema, `Game` interface, game designs, risks in CLAUDE.md), got it approved, saved it as docs/PLAN.md with implementation notes in §11, ran `git init`. The user moved the build to a fresh session to save tokens, so no code was written. Commit: "Add project docs and approved Milestone 0 plan".
- 2026-11-11, Fable 5.2: Milestone 1. Scaffold, colour maths, channel renderer and recording context, settings store with export/import, safety guards, onboarding, guided colour set-up, Colours page, settings, players, grown-ups page, evidence pages. 249 tests pass; lint and build clean; walked in the browser at desktop, 375×812 and 812×375. Commit: "Milestone 1: foundation".
- 2026-11-11, Fable 5.2: started Milestone 2 and paused at the user's request. Tumble Stack rules, drawing and definition, plus the engine loop, input and shell, are in; the play screen is not. 274 tests pass; lint and build clean; the new engine files are untested in a browser. Commit: "Milestone 2 (part): Tumble Stack rules, drawing and engine shell".
