# Milestone 3 (revised): evidence-based tasks, adults first

## Context
Only one game exists today: **Tumble Stack** (falling blocks), on `main`. The original Milestone 3 list (brick breaker, snake-like, catcher, matching) was chosen for children by genre, not by evidence. You asked for a plan built on the highest-quality medical evidence, adults first but still covering children, a one-minute screen-size check being acceptable, and the evidence deciding the game list.

Two research passes (Nov 2026) found:
- **Adults:** a 2025 meta-analysis (Ming, 22 RCTs, 422 adults; PMC12006629) found training helps acuity.
  - **Monocular** perceptual learning (training the weak eye alone) did best: SMD −0.88.
  - Dichoptic training did less well: SMD −0.51.
  - The more hours trained, the bigger the gain (r = 0.59).
  - Supervised lab training was positive; the home falling-blocks RCT (BRAVO, n=115) was null.
- **Best screen-friendly tasks:**
  - **Crowded-letter identification:** Hussain 2012 (PMC3428833) and Chung 2012 (PMC3340394). It runs at high contrast, so 8-bit screens are fine, and it gave the best acuity transfer and retention.
  - **Grating detection at the cut-off spatial frequency:** Huang 2008 (PMC2268837) and Zhou 2006. Thresholds sit around 10–50 % contrast, which 8-bit screens can show.
  - **Home browser version:** Hussain 2014 (PMC4217344) ran these in a browser on ordinary laptops and TVs: +1.3 lines in about 11 h.
- **Stereo training on anaglyph:** red-green anaglyph stereo training (Xi 2014, PMC3989086) improved stereo vision a lot and acuity a little. It ports directly to Canvas.
- **What made dichoptic trials succeed or fail:**
  - **Device-measured adherence** separated them: 86–100 % in positive trials, 13–46 % in failed ones.
  - **Passive video** (Birch movies; Luminopia) had better adherence than games (84 % vs 68 %).
  - **Fast contrast ramps** (+10 %/day) remove the rebalancing within about 18 days. A 0 % increment worked as well as +10 % (PMC8328197).
  - **Checking that the weak eye is in use** (eye tracking, weak-eye-only catch tasks) featured in the successes.
  - Engagement dropped at **weeks 3–4**, so variety matters.
- **Safety:**
  - Double vision was rare in trials.
  - New eye turns occurred in 6–9 % (vs 5–6 % in controls).
  - Adults with an eye turn carry more risk in dichoptic and stereo modes.

Intended outcome: a set of tasks that copy what worked in trials, honest copy about the evidence, and the dose and adherence logging a clinician needs, still with no diagnosis and no prescribing.

## Final task list (evidence decides)
| # | Name (working) | Type | Evidence it copies | Audience | Eye split |
|---|---|---|---|---|---|
| 1 | **Letter Crowd** | Monocular perceptual learning: crowded letters | Hussain 2012, Chung 2012, Hussain 2014 | Adults, teens, older kids | Letter and flankers to weakEye; fixation frame to both; nothing for the fellow eye |
| 2 | **Stripe Finder** | Monocular perceptual learning: grating at cut-off spatial frequency, tilt left or right | Huang 2008, Zhou 2006, Liu 2020 | Adults, teens | Grating to weakEye; frame to both. An optional dichoptic variant puts noise in fellowEye (Liu 2020) |
| 3 | **Depth Duel** | Stereo: "which patch is nearer?" | Xi 2014 (anaglyph), Vedamurthy 2016 | Adults, teens. **Hidden if screening reported an eye turn or double vision** | Textured patches with disparity drawn in both lens channels |
| 4 | **Watch mode** | Passive dichoptic: complementary soft blob masks that change every 10 s; fellow eye at reduced contrast | Birch movies (Jost 2022, PMC8905014), Luminopia (Xiao 2022) | Everyone, especially ages 4–8 | Masked areas to weakEye at 100 %; complementary areas to fellowEye at the profile's contrast |
| 4a | ↳ Quiet Reef scene | Procedural slow aquarium as built-in content | Same | Kids, low effort | Same masks |
| 4b | ↳ Your own video | Local file the user picks (never uploaded) | Same | Adults, kids | Same masks |
| 5 | **Star Patrol** | Dichoptic action shooter with an embedded weak-eye tilt task | Vedamurthy 2015, Gambacorta 2018, Žiak 2017 (Vivid Vision) | Adults, older kids | Targets and the tilt cue to weakEye; ship and terrain to fellowEye; frame to both |
| 6 | **Glow Bounce** | Brick breaker using Dig Rush's split | Kelly 2016 | Kids | Ball and paddle to weakEye; bricks to fellowEye; walls to both |
| 7 | **Split Lines** | Dichoptic reading | Dranitsaris 2026 (feasibility only, labelled as such) | Adults | Alternate words to each eye |

**Dropped from Milestone 3 (backlog):** the snake-like game and Twin Peek matching. Neither copies a tested design, and variety is already covered.

**Not built:** the flanked-Gabor task (Polat 2004). It needs contrast below 8-bit precision and per-device gamma matching; it stays in the backlog until the display check proves reliable.

## Build order (three commits, PROGRESS.md updated after each)

### 3a: Platform pieces the new tasks need
1. **Research doc:** `docs/research/TASK-EVIDENCE.md`. The two research reports, condensed, with citations and the "could not verify" list. Source for the Evidence page copy.
2. **Screen-size check** (new device setting, not per profile):
   - Hold a bank card to the screen and drag to match its width (85.6 mm), which gives px per mm.
   - Enter or pick the viewing distance (default 50 cm on a phone, 60 cm on a laptop).
   - Show a "sit this far away" reminder at the start of each task.
   - Store it in `AppData.device.display = { pxPerMm, viewingDistanceCm, checkedAt }`.
   - Add a pure `core/display/visualAngle.ts`: px per degree from CSS px × `devicePixelRatio`, plus arcmin ↔ px conversion.
   - Reached from Settings, and prompted on the first launch of tasks 1–3.
3. **Pattern primitive in the renderer** (keeps rule 1: no colours in games):
   - Add `Renderer.pattern(ch, spec)`, where `spec` is a grating, a Gabor or noise, given as size, cycles per degree (converted with visualAngle), orientation, phase and contrast from 0 to 1.
   - Rendered into an offscreen `ImageData` in the channel's resolved palette colour (`src/engine/renderer.ts`, `src/core/colour/palette.ts`).
   - Contrast is computed around the channel's mean level, with Floyd–Steinberg or noise dithering (Hussain 2014).
   - Cached per spec.
4. **Image/video primitive with masks:**
   - Add `Renderer.image(ch, source, maskSpec)`. It turns a video or canvas frame into the channel colour (luminance only) and multiplies it by a soft-blob mask.
   - The weakEye mask and the fellowEye mask are exact complements.
   - Masks re-randomise every 10 s with a 1 s cross-fade, so nothing flashes and the flash rule holds.
5. **Shared staircase** in `core/adaptive/staircase.ts`:
   - 3-down-1-up (≈79 % correct) and 2-down-1-up, with multiplicative steps.
   - A reversal-based "level" that persists per profile per game via a new `profile.gameProgress[gameId]`.
   - Wire it into `GameContext` as `ctx.saved` / `Game.save()`, so difficulty carries across sessions. Today `startLevel` is always 1.
6. **Active-minute logging:**
   - The session log counts only active time: it pauses on tab blur, and after 10 s without input in active games (not in Watch mode).
   - Extend `src/core/progress/sessionLog.ts` with `activeMs` and `catchAccuracy`.
   - The grown-ups page shows minutes per week against the parent-set goal.
7. **Weak-eye catch check** (`engine/catchTargets.ts`):
   - Occasional weakEye-only prompts, such as "tap the star when you see it" or the tilt cue.
   - If accuracy is at chance, the session is flagged ("glasses off or weak eye not seeing?") for the grown-ups page. Nothing is diagnosed.
8. **`GameDefinition.eyeMode: 'dichoptic' | 'weakEyeOnly' | 'stereo'`:**
   - The rule 3 live-colour test currently requires both eye channels at full intensity. It is updated to require that only for `dichoptic` games. `weakEyeOnly` games need weakEye plus both; `stereo` needs both lens channels.
   - Add `requiresNoEyeTurn: boolean`. Depth Duel sets it, and home hides the game when screening said "eye turn", "double" or "not sure".
9. **Contrast policy change** (the existing `autoContrast`, which has no settings screen yet):
   - Off by default.
   - When on: +2 points after a qualifying session (≥ 15 active minutes and the game's target met) and −5 after a failed one.
   - Capped at 80 % or the weekly balance-check value. A "hold" toggle is included.
   - Every change is listed on the grown-ups page.
   - The existing balance screen from onboarding is offered weekly.

### 3b: Adult evidence tasks
- **Letter Crowd** (`src/games/letter-crowd/`):
  - 10 letters (C D H K N O R S V Z) drawn from our own stroke shapes, not a font. The target is flanked by 4 letters.
  - Each trial: 500 ms fixation, then 150 ms target (shown longer at easy levels), then tap one of 10 big letter buttons. Optional keyboard letters.
  - Letter size is set in arcmin. Spacing goes from 2× the letter size down to touching, on a 3-down-1-up staircase. The letter shrinks 10 % after levels at near-touching spacing.
  - Blocks of 50 trials, about 3–4 minutes each.
  - Gentle tone feedback, and a score and streak per block.
  - Modes: Classic; Relaxed (untimed target, larger letters).
- **Stripe Finder** (`src/games/stripe-finder/`):
  - A 3° grating at the training frequency, tilted ±45°. The player swipes or taps left or right.
  - Contrast staircase: ×0.9 after 3 correct, ×1.1 after an error.
  - The training frequency is found in the first session: the frequency where the threshold is about 0.5 contrast, capped by px per degree (at least 4 px per cycle).
  - Blocks of 60 trials.
  - Modes: Weak eye only; Push (fixed-level noise in fellowEye, Liu 2020).
- **Depth Duel** (`src/games/depth-duel/`):
  - Two textured patches above and below a fixation mark, one nearer through disparity. The red channel is shifted by whole pixels (1 px ≈ 33–41″).
  - 2-down-1-up staircase, ×0.9 / ×1.1 steps. Blocks of 40 trials.
  - Shown only when `requiresNoEyeTurn` passes, with a double-vision reminder before each block.
- **Watch mode** (`src/games/watch/`):
  - Built-in **Quiet Reef** procedural scene: fish, plants and drifting light, nothing flashing. Tapping a weakEye-only star counts as a catch.
  - **Your own video:** a local file picked with `<input type=file>`, played through `Renderer.image`. Nothing is uploaded and nothing is stored beyond the session.
  - Fellow-eye contrast comes from the profile.
- **Evidence page:**
  - Expand the Adults section with the meta-analysis split (monocular vs dichoptic), BRAVO (null at home), dose and hours, and "results vary; this app is untested".
  - Each task's info card cites the study it copies and says "a training level, not an eye test".

### 3c: Action, kids, reading and motivation
- **Star Patrol** (`src/games/star-patrol/`):
  - Horizontal shooter. Enemies and pickups go to weakEye, the ship and terrain to fellowEye, the frame and HUD to both.
  - Every 20–40 s a weakEye-only striped "gate" appears. Fly through the matching tilt: this is Vedamurthy's embedded task, and it drives the staircase and the catch check.
  - Adaptive speed and spawn rate (aiming for about 75–80 % success).
- **Glow Bounce** (`src/games/glow-bounce/`): kid brick breaker on the same split. Adaptive ball speed and paddle width.
- **Split Lines** (`src/games/split-lines/`):
  - Words alternate between the eyes. Adjustable font size and background.
  - Bundled public-domain passages, or paste your own text.
  - Labelled "for comfort and practice; not yet tested as a treatment".
- **Motivation:**
  - A weekly goal (parent sets days × minutes; default 5 × 20) and a streak on home.
  - A "today's task" rotation that leads with a different task each day.
  - WebAudio tones (mutable, already in `ui.sound`).
  - An adult theme with no cartoons, and no parent gate for adult profiles (USER-FEEDBACK §6).
- **Home grouping:** "Training tasks" (1–3), "Watch" (4), "Games" (5, 6, Tumble Stack), "Reading" (7). Each tile shows its eye rule and evidence badge: "Trial-tested design", "Small studies" or "Not tested".

## Reuse (existing code)
- Every game copies the shape of `src/games/falling-blocks/` (`logic.ts` pure and tested, `game.ts`, `index.ts`) and is registered in `src/games/registry.ts`. The play screen, pause menu, double-vision stop, break overlay and session log come for free (`src/app/screens/play.ts`, `src/engine/shell.ts`).
- Colours only through `src/engine/renderer.ts` channels and `resolvePalette` in `src/core/colour/palette.ts`. `DrawOpts.intensity` already exists for fades.
- Onboarding balance screen and colour set-up: `src/app/components/calibration.ts`, reused for the weekly balance check.
- Screening answers (eye turn, double vision) in `src/core/safety/screening.ts`, used to hide Depth Duel.
- Rule tests in `tests/rules/` (scanner, flash test, live-colour test) pick up new games automatically. Only the rule 3 expectation changes, through `eyeMode`.

## Safety and honesty rules for all new tasks
- No diagnostic output. Thresholds are shown as "training level", never as acuity or "your vision is X".
- The app never sets the dose. Trial doses are shown on the Evidence page as "what studies used" only.
- The double-vision check runs before each session and the stop button stays in every pause menu. Stereo and push modes are hidden or warned for anyone who reported an eye turn.
- Blob masks, tones and feedback stay well under 3 changes per second. The 60-second flash test covers every game.
- Video files stay on the device and are never stored.

## Verification
- **Unit tests (Vitest):**
  - Staircase convergence on a simulated observer (79 %).
  - px-per-degree maths.
  - Dithered patterns keep the target mean and contrast within 1 %.
  - Masks are exact complements: weak + fellow = 1 at every pixel.
  - Letter shapes are distinct.
  - Disparity shifts are whole pixels.
  - Contrast policy: +2 / −5 / cap / hold.
  - Active-minute counting with blur and idle.
  - `requiresNoEyeTurn` hides the game.
- **Rule tests:** all 5 pass for every game. The rule 3 test covers each `eyeMode`; the flash test runs 60 s of every game, including Watch mode with mask changes.
- `npm test`, `npm run lint`, `npm run build` clean after each of 3a, 3b and 3c.
- **Browser (preview pane), at desktop, 375×812 and 812×375:**
  - Do the screen-size check.
  - Play a block of each task and check canvas pixels (weak = red only, fellow = cyan only, frame = grey).
  - Load a local video in Watch mode.
  - Check that the grown-ups page shows active minutes and catch accuracy.
  - No console errors.
- **Real-glasses checklist additions for you:**
  - Is each task's target invisible with the weak eye covered?
  - Do Depth Duel patches look nearer or farther?
  - Is a dimmed video comfortable to watch?
