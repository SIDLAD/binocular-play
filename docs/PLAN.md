# Binocular Play: Milestone 0 plan (then build Milestones 1–2)

## Context
Binocular Play is a free, static, browser-based set of dichoptic red/blue games for amblyopia. The repo holds only docs so far (`CLAUDE.md`, `docs/*`); there is no code and no git repo. This step: get this plan approved, then `git init`, build Milestone 1 (foundation) and Milestone 2 (falling-blocks game) without stopping, self-verify each, and commit `docs/PROGRESS.md` after each. Nothing is pushed and no remote is added.

On approval this plan is saved as `docs/PLAN.md` so later sessions have it.

---

## 1. Folder structure
```
index.html  vite.config.ts  tsconfig.json  eslint.config.js  package.json  LICENSE
.claude/launch.json            dev-server entry for the preview pane
src/
  main.ts                      boot + router mount
  app/                         everything that is DOM (menus, pages)
    router.ts  dom.ts          hash router (#/home, #/play/:id …), tiny h() helper
    styles/                    tokens.css (neutral greys only), base.css
    screens/                   home, onboarding/*, colours, settings, profiles,
                               evidence, treatments, parent, play
    components/                parentGate, pauseMenu, breakOverlay, doubleVisionCheck,
                               footer, colourControl, eyeTest
  core/                        pure logic, no DOM, fully unit-tested
    settings/                  schema.ts, store.ts, migrate.ts, exportImport.ts
    colour/                    presets.ts, mapping.ts, palette.ts, srgb.ts, separation.ts
    safety/                    guards.ts, screening.ts, session.ts, flash.ts
    progress/                  sessionLog.ts
    content/                   evidence.ts (structured from docs/EVIDENCE.md), copy.ts
  engine/
    api.ts                     the ONLY module games may import
    renderer.ts                CanvasChannelRenderer
    loop.ts  input.ts  shell.ts
    testing/recordingContext.ts   fake 2D context that records every fill/stroke
  games/
    registry.ts
    falling-blocks/            index.ts, logic.ts (pure), game.ts, logic.test.ts
tests/rules/                   one file per hard rule (rule1 … rule5)
```
Runtime dependencies: none. Dev: vite, typescript, vitest, jsdom, eslint + typescript-eslint. No UI framework (vanilla TS + a 30-line `h()` helper), no game engine. Vite `base: './'` plus hash routing so the build works on any GitHub Pages sub-path.

## 2. The `Game` interface (`src/engine/api.ts`)
```ts
export type Channel = 'weakEye' | 'fellowEye' | 'both';

export interface Renderer {            // no method accepts a colour
  readonly width: number; readonly height: number;      // logical px
  clear(): void;                                         // background from palette
  rect(ch: Channel, x, y, w, h, o?: DrawOpts): void;
  circle(ch: Channel, x, y, r, o?: DrawOpts): void;
  line(ch: Channel, x1, y1, x2, y2, width: number, o?: DrawOpts): void;
  poly(ch: Channel, pts: number[], o?: DrawOpts): void;
  text(ch: Channel, s: string, x, y, o?: TextOpts): void;
  group(transform: Transform, draw: () => void): void;   // translate/scale/rotate
}
export interface DrawOpts { intensity?: number /* 0–1, fades toward background */; outline?: number; radius?: number }

export type GameInput =
  | { kind: 'action'; action: 'left'|'right'|'up'|'down'|'primary'|'secondary'; pressed: boolean }
  | { kind: 'pointer'; phase: 'down'|'move'|'up'; x: number; y: number };

export interface GameContext { rng(): number; startLevel: number; reducedMotion: boolean }

export interface Game {
  resize(width: number, height: number): void;
  input(e: GameInput): void;
  update(dtMs: number): void;          // fixed 60 Hz step, driven by the shell
  render(r: Renderer): void;           // may be called while paused
  status(): { score: number; level: number; over: boolean };
  dispose(): void;
}
export interface GameDefinition {
  id: string; title: string; blurb: string;
  eyeRule: string;                     // shown to parents: who sees what
  touchButtons: TouchButton[];         // on-screen buttons the shell draws
  create(ctx: GameContext): Game;
  icon(r: Renderer): void;             // tile art, also channel-only
}
```
The shell (`engine/shell.ts`) owns the canvas, loop, HUD (score/level/countdown as DOM text), pause menu, touch buttons, safety checks and session logging. A game is only rules + drawing, so every later game gets all of that for free.

## 3. Colour-channel renderer
Pipeline, all pure functions in `core/colour/`:
```
profile.vision + profile.calibration + profile.fellowContrast
   └─ mapping.ts   which lens colour does each eye-channel use?   (rule 2)
   └─ palette.ts   resolvePalette(profile) → { weakEye, fellowEye, both, background } as RGB
        - lens colour = calibration base colour × brightness
        - fellowEye only: mixed toward the background by fellowContrast, in linear light (rule 4)
        - both = neutral grey at calibration.bothBrightness (black-ish in light mode)
   └─ PaletteStore  subscribes to the settings store, recomputes on every change
   └─ renderer.ts   looks up paletteStore.current[channel] at every draw call (rule 3)
```
- **Overlap handling**: eye channels are drawn with canvas blend mode `lighten` on dark backgrounds (`darken` on light), so where a weak-eye shape overlaps a fellow-eye shape each eye still sees its own shape instead of one hiding the other. `both` is drawn normally on top.
- **Calibration data is stored per lens** (red lens, other lens), not per eye, because it describes the glasses and screen. Swapping the weak eye or lens side never loses the tuning.
- **Calibration UX** (USER-FEEDBACK §2): full-screen, no chrome, real game background. Per eye: "Close your LEFT eye. Lower the slider until the shape disappears", then a hidden-number check (random digit per lens colour; the player taps the digit they see). Controls per colour: wheel + brightness slider + ±1 buttons + hex field. If the ghost will not go away, a "cheap glasses leak" tip (no brands).
- **Separation check** (`separation.ts`): an ideal lens model (red lens passes R; cyan passes G+B; blue passes B; green passes G). Presets and everything the pipeline does to them must put zero energy in the other lens's primaries. The free colour wheel can break this on purpose (real lenses are not ideal), so the Colours page shows a non-blocking "the other eye may see this — run the eye test" warning instead of forbidding it.

## 4. Settings schema (localStorage key `binocular-play`, versioned, migrated on load)
```ts
interface AppData { version: 1; activeProfileId: string | null; profiles: Profile[] }
interface Profile {
  id: string; name: string; avatar: number; kind: 'child' | 'adult'; createdAt: string;
  onboarding: { disclaimerAcceptedAt: string | null; completedAt: string | null;
                screening: { eyeTurn: boolean | null; everDouble: boolean | null;
                             clinicianOk: boolean | null; parentConfirmedAt: string | null } };
  vision: { glasses: 'red-cyan' | 'red-blue' | 'red-green';
            redLensEye: 'left' | 'right'; weakEye: 'left' | 'right';
            background: 'dark' | 'light' };
  calibration: { redLens: LensColour; otherLens: LensColour;      // LensColour = { base: '#rrggbb', brightness: 0–1 }
                 bothBrightness: number; calibratedAt: string | null };
  fellowContrast: number;                    // 0.1–1
  autoContrast: { enabled: boolean };        // off; logic arrives in Milestone 4
  session: { lengthMin: number; breakReminder: boolean;
             patchReminder: { enabled: boolean; note: string } };   // parent-set, never a dose from us
  safety: { doubleVisionBlockedOn: string | null; events: { at: string; kind: string }[] };
  progress: { sessions: SessionRecord[]; best: Record<string, number> };
  ui: { sound: boolean; reducedMotion: 'system' | 'on' | 'off' };
}
interface SessionRecord { id: string; date: string; gameId: string; seconds: number;
                          score: number; level: number; fellowContrast: number;
                          endedBy: 'gameOver' | 'quit' | 'timer' | 'doubleVision' }
```
Export/import is one JSON file of `AppData`, validated and migrated on import. Because calibration is device-specific, an import from another device keeps progress but marks colours "check on this screen".

---

## 5. The five hard rules: how the design enforces each, and its test

### Rule 1 — Channels only
**Rule:** games draw only through `weakEye` / `fellowEye` / `both`; no raw colour anywhere under `src/games/`.
**Enforced by:** games never receive a canvas context, only `Renderer`, which has no colour parameter. ESLint override for `src/games/**`: imports restricted to `engine/api`, and `fillStyle` / `strokeStyle` / `getContext` / `document` banned. No `.css` files allowed in `src/games/`.
**Test** (`rule1-channels-only.test.ts`): scans every file under `src/games/` and fails on a hex colour, `rgb(`/`rgba(`/`hsl(`, a CSS colour name as a string literal, any of the banned identifiers, or an import from outside `engine/api`. A second assertion feeds the scanner a file containing `#ff0000` to prove the scanner itself catches it.

### Rule 2 — Eye mapping
**Rule:** on a dark background `weakEye` gets the colour of the lens that sits over the weak eye; `fellowEye` gets the other lens colour. Light background flips it (on white, a red shape vanishes for the red-lens eye and looks dark to the other eye).

"Other" = cyan / blue / green for red-cyan / red-blue / red-green glasses. The same four rows hold for each of the three glasses types, so 12 dark rows + 12 light rows = 24.

| Background | Red lens on | Weak eye | `weakEye` draws | `fellowEye` draws |
|---|---|---|---|---|
| dark | left | left | red | other |
| dark | left | right | other | red |
| dark | right | left | other | red |
| dark | right | right | red | other |
| light | left | left | other | red |
| light | left | right | red | other |
| light | right | left | red | other |
| light | right | right | other | red |

**Enforced by:** one function, `mapping.ts → channelLens(vision)`, is the only place this decision is made.
**Test** (`rule2-eye-mapping.test.ts`): all 24 rows written out by hand as literal expected hex values (not computed with the same formula), each asserted against `resolvePalette`. Plus a physical check per row using the ideal lens model: the weak-eye colour is visible through the weak eye's lens and indistinguishable from the background through the fellow eye's lens, and vice versa.

### Rule 3 — Colours stay adjustable
**Rule:** calibration is saved per profile (localStorage is per device); the Colours page and the pause-menu "Adjust colours" can change it any time, applied instantly with no reload.
**Enforced by:** the renderer stores no colours; it reads the live palette on every draw call. The paused shell re-renders one frame on every palette change, so the game behind the pause menu updates as the slider moves.
**Test** (`rule3-live-colours.test.ts`): start the falling-blocks game on the recording context, render, then through the settings store (a) change the red-lens colour, (b) swap the weak eye, (c) switch glasses type; render the *same game instance* again and assert the recorded fill colours changed to the new palette. Also: save → reload the store → calibration survives, and profile A's change does not touch profile B.

### Rule 4 — Fellow-eye contrast
**Rule:** the contrast slider dims only `fellowEye`, never `weakEye` or `both`.
**Enforced by:** `fellowContrast` is read in exactly one line of `palette.ts`, on the `fellowEye` branch.
**Test** (`rule4-contrast.test.ts`): for all 24 mapping rows × contrast 10 %…100 %, `weakEye`, `both` and `background` are byte-identical to their values at 100 %, and `fellowEye` moves monotonically toward the background as contrast falls.

### Rule 5 — Safety
| Safeguard | Design | Test (`rule5-safety.test.ts`) |
|---|---|---|
| Disclaimer before the first game | Onboarding step 1; also in the footer of every page | `canStartGame()` is false for every profile state without `disclaimerAcceptedAt`; the play route calls only this guard |
| Onboarding screening | Three self-report questions. "Yes" to eye turn or past double vision → "talk to your eye doctor first" screen; continuing needs the parent gate + "a clinician approved this" | Onboarding reducer: cannot reach `completed` from a "yes" answer without `parentConfirmedAt` |
| Check before each session | One tap: "Do you see double right now?" "Yes" blocks play for that profile for the rest of the day | Guard is false until the check passes; "yes" sets the block and the guard stays false |
| Stop button | Pause menu: "I see double / my eyes hurt" → ends and logs the session, blocks play, shows stop/rest/tell-your-doctor guidance | DOM test: the button exists in the pause menu and triggers end + block |
| No flashing > 3 per second | No blink effects exist; full-area effects go through one fade helper with a 400 ms minimum; no CSS animation loops faster than 1 s | Runs every registered game for 60 simulated seconds with scripted input on the recording context, computes per-frame mean luminance, fails on more than 3 opposing swings of ≥ 10 % in any 1 s window. Iterates the registry, so Milestone 3 games are covered automatically. A CSS scan fails on any looping animation shorter than 1 s |
| Evidence reachable from home | "Is this real?" link on home, onboarding and the footer | DOM test: home renders a link to `#/evidence`, the router resolves it, and the page contains the negative-trials section |

No diagnostic tests are built. The hidden-number screen is worded as a check of the screen and glasses, not of the player's eyes.

---

## 6. Game designs (one paragraph each)
Names are working titles and all art is drawn from primitives through the channel renderer.

- **Tumble Stack — falling blocks (Milestone 2).** Four-cell pieces fall into a 10×18 well; complete a row to clear it. The falling piece, its landing shadow and the "next" preview go to the **weak eye**; the settled stack to the **fellow eye**; the well frame, a faint grid and the score to **both**. The landing shadow is deliberately weak-eye only: in `both` it would let the strong eye play alone. Own rotation rules and scoring; speed rises per level; an "easy" piece set (1–3 cells) for small children. Keys: arrows / WASD / space; touch: swipe plus big on-screen buttons. Rounds last 2–5 minutes.
- **Glow Bounce — brick breaker (M3).** Ball and paddle to the weak eye, bricks to the fellow eye, walls to both. Adaptive: ball speed and paddle width.
- **Comet Trail — snake-like (M3).** The comet and its tail to the weak eye; food to the fellow eye; walls alternate between the eyes so both are needed to steer. Adaptive: speed.
- **Star Scoop — catcher (M3).** Falling stars to the weak eye, the player's scoop to the fellow eye, horizon line to both. Adaptive: fall speed and count.
- **Twin Peek — matching (M3, small kids).** Each card shows half a picture to each eye; only with both eyes can you tell which two cards match. Untimed, big targets.
- **Quiet Reef — low-effort mode (M3).** A slow aquarium: fish split between the eyes, plants in both; tap a fish to feed it. No score pressure.
- **Split Lines — reading mode (M3).** Alternate words go to each eye; adjustable font size and background; bundled public-domain text or paste your own.

---

## 7. Things in `CLAUDE.md` that look wrong or risky
1. **"Dim the fellow eye to 20–100 % brightness" is ambiguous.** Scaling the stored colour value by 0.2 gives about 3 % of the light (screens are gamma-encoded), which is nearly invisible. I will apply contrast in linear light so 20 % is roughly 20 % luminance, and label it approximate because we cannot measure the screen.
2. **Light mode needs more than flipping the mapping.** Contrast must fade toward white, not black, and `both` becomes dark. The palette handles this with one "mix toward background" formula. Light mode ships as an advanced setting, off by default, with its own 12 test rows.
3. **"Full colour wheel" conflicts with "pure, separable channel".** A free picker lets a user choose a colour both eyes can see. Resolution: presets and the guided calibration stay provably separable; the wheel is a free override with a visible warning (see §3).
4. **Overlapping shapes hide each other** with normal canvas drawing, so one eye would lose its object. Fixed with the `lighten` / `darken` blend modes (§3).
5. **White `both` elements reach the strong eye at full strength**, which works against contrast balancing if the frame is large and bright. `both` defaults to a mid grey and stays thin in games; it has its own brightness setting, separate from fellow contrast (rule 4).
6. **A `both`-channel landing shadow would let the strong eye play alone.** Fusion aids that carry game information go to the weak eye; only the frame and grid are `both`.
7. **Safari may delete localStorage after 7 days without a visit** unless the site is installed to the home screen. Progress could vanish. Mitigation: request persistent storage, an "export your progress" nudge, and push the PWA install in Milestone 4. Flagged in PROGRESS.md.
8. **Night-light / True Tone / auto-brightness change the colours after calibration.** The calibration screen says to turn them off; calibration is per device, not per lighting condition.
9. **"Per profile and per device"**: localStorage is already per device, so a per-profile setting is automatically per device. The only extra work is the import case (§4).
10. **Menus viewed through the glasses.** Coloured UI looks different to each eye. App chrome stays neutral grey/white on dark; colour appears only via the channels.

## 8. Defaults I am choosing (say so if you want any changed)
- Red lens over the weak eye is the suggested default; the eye doctor's instruction wins and it is always editable.
- Fellow-eye contrast starts at 100 % and onboarding step 6 guides the player to lower it until both shapes are visible together. Range 10–100 %.
- Session length 20 min; break overlay is a slow fade.
- A "do you see double?" → yes blocks that profile until the next day. A parent-gated "that was a mis-tap" can undo it.
- Parent gate is hold-for-3-seconds; adult profiles skip it.
- Pre-session check is asked on the first game after opening the app or after 30 idle minutes.
- "Free. No ads, no account, no paywall, ever." is on the first screen.

---

## 9. Execution after approval
1. `git init` (branch `main`), `.gitignore`, MIT `LICENSE`, save this plan as `docs/PLAN.md`, commit the existing docs. No remote, no push.
2. **Milestone 1**: scaffold → `core/` with the five rule tests written first → renderer + recording context → settings store, profiles, export/import → onboarding (6 steps + screening) → Colours page → Evidence and Other-treatments pages → home, settings, parent gate → session timer and break overlay. Check every link in `docs/EVIDENCE.md` and record the results. Update `docs/PROGRESS.md` and the Commands section of `CLAUDE.md`; commit.
3. **Milestone 2**: `falling-blocks` logic (pure, tested) → game + shell (loop, input, HUD, pause menu with "Adjust colours" and the stop button, touch buttons) → session logging. Update `docs/PROGRESS.md`; commit.

## 10. Verification (after each milestone)
- `npm run lint`, `npm test` (all five rule tests + logic tests), `npm run build`.
- Run the dev server in the preview pane; walk onboarding → calibration → home → game; screenshot at desktop size and at 375×812 in portrait and landscape; fix what shows up.
- In the browser, read pixels back from the game canvas and confirm they equal the expected palette for the current profile, then change a colour in the pause menu and confirm the pixels change without a reload.
- Check the browser console for errors.
- Cannot be verified by me: real anaglyph glasses. The step ends with what was built, what was and was not verified, and a short real-glasses checklist for you.

---

## 11. Implementation notes (worked out after approval, not yet built)
The plan above was approved by the user on 2026-11-11. These are details the planning session settled so the building session does not have to re-derive them. They refine the plan; where they add to a schema or interface in §2 or §4, the addition is marked.

### Colour maths (`core/colour/`)
- `RGB` is a readonly tuple of 0–255 integers. Colours are stored as lowercase `#rrggbb`.
- Backgrounds are fixed: dark = `#000000`, light = `#ffffff`.
- Everything "fades toward the background", with one formula per use:
  - **Lens brightness** (calibration): `mixGamma(background, base, brightness)`, plain per-channel interpolation of the 0–255 values. This keeps the "±1 step" buttons meaningful (one step = 1/255).
  - **Fellow-eye contrast**: `mixLinear(background, lensColour, fellowContrast)`, interpolated in linear light with the sRGB transfer function. `t >= 1` must return the target exactly and `t <= 0` the source exactly (no round-trip drift).
  - **Renderer `intensity`**: `mixGamma(background, channelColour, intensity)`.
  - **`both`**: `mixGamma(background, foreground, bothBrightness)` where foreground is white in dark mode and black in light mode. Default `bothBrightness` 0.6.
- **Separation, stated generally** (works for both backgrounds): a colour `c` on background `bg` is invisible through a lens when `c[p] === bg[p]` for every primary `p` that lens passes, and visible when at least one differs. Lens pass sets: red lens `[R]`; cyan `[G, B]`; blue `[B]`; green `[G]`. Rule 2's physical check and the Colours-page warning both use this one function. Also warn when a channel is not visible through its own lens (for example brightness dragged to 0).
- Blend modes: eye channels use `lighten` (dark) or `darken` (light); `both` and `clear()` use `source-over`.

### Schema additions to §4
- `AppData.deviceId: string`, a random id made on first run.
- `Calibration.needsCheck: boolean`. Set to true for profiles imported from a file whose `deviceId` differs.
- Export file shape: `{ app: 'binocular-play', formatVersion: 1, exportedAt, data: AppData }`. Import merges by profile id: a profile with the same id is replaced, others are added. Parent-gated, with a confirm.
- Every load, import and `update()` passes through one `sanitizeAppData(unknown): AppData` that coerces each field to a valid value or its default. The store clones with `JSON.parse(JSON.stringify())` (the data is plain JSON).
- Changing the glasses type in settings resets calibration to the new preset, after a confirm.

### Sessions and safety (`core/safety/`)
- A **session** is a continuous period of play with gaps shorter than 30 minutes. `SessionState = { profileId, checkPassedAt, lastActivityAt, playedMs }`, kept in memory and mirrored to `sessionStorage` so a reload does not reset it. Switching profile resets it.
- The countdown is `lengthMin × 60 − playedMs` (active, unpaused game time across games). At zero the game pauses and the break overlay fades in. "Keep playing" adds 5 minutes and is parent-gated for child profiles.
- `canStartGame(profile, session, now)` returns `{ ok: true }` or `{ ok: false, reason }` with reasons `no-profile | disclaimer | screening | onboarding | blocked-today | session-check`. It checks each condition itself (it does not trust `completedAt` alone). The play route calls only this.
- The double-vision block stores a local `YYYY-MM-DD` in `safety.doubleVisionBlockedOn`; blocked when it equals today.
- Onboarding step order: disclaimer → screening → (doctor-first screen if needed) → glasses → lens side → weak eye → calibration → contrast → done. A "yes" to eye turn or past double vision needs the parent gate plus an explicit "an eye doctor has said these games are OK" tick, which sets `parentConfirmedAt`. A "no" to the clinician question with no other flags shows the same screen with softer text and a plain "I understand" continue. The screen resumes at the first incomplete step after a reload.
- **Flash detector** (`flash.ts`): a zigzag pass over the per-frame mean-luminance series. Track the running extreme; each time the value moves ≥ 0.1 away from it in the opposite direction, record a transition. Fail when any 1-second window holds more than 6 transitions (3 flashes). Unit-test the detector itself with a 5 Hz strobe (must fail) and a slow fade (must pass).

### Engine and tests
- **Addition to §2**: `GameDefinition.modes?: { id: string; label: string; blurb: string }[]` and `GameContext.mode: string`. The play screen shows a start card (title, who-sees-what, controls, mode buttons) before the game begins. Falling blocks has `easy` (1–3 cell pieces) and `classic`.
- `engine/shell.ts` takes a canvas and wires renderer + loop + input. `app/screens/play.ts` owns the DOM around it: HUD, start card, pause menu, overlays, touch buttons, session logging.
- Touch gestures are interpreted by each game from raw `pointer` inputs (their meaning is game-specific). On-screen buttons are DOM buttons drawn by the play screen from `touchButtons`, shown on coarse-pointer devices or narrow screens.
- **Recording context** (`engine/testing/recordingContext.ts`): a hand-written fake of the 2D context methods the renderer uses. It logs each fill/stroke with its style, blend mode and approximate area (rect `w×h`, circle `πr²`, polygon by shoelace, stroke = perimeter × line width, scaled by the current transform), so a test can read both colours and a per-frame mean luminance. No `node-canvas` dependency.
- Rule tests scan source with `import.meta.glob('…', { query: '?raw', import: 'default', eager: true })`, so no `@types/node` is needed.
- Rule 1 scanner details: hex colours of 3/4/6/8 digits (so no `#private` fields in games); `rgb(`, `rgba(`, `hsl(`, `hsla(`, `hwb(`, `lab(`, `lch(`, `oklab(`, `oklch(`, `color(`; CSS colour names as string literals; the identifiers `fillStyle`, `strokeStyle`, `getContext`, `shadowColor`, `createLinearGradient`, `CanvasRenderingContext2D`, `document.`, `.style.`; and imports other than `./…` (no `..`) or `(../)+engine/api`. `*.test.ts` files may also import `vitest`.
- Rule 3 and the flash test use a small fixture game in Milestone 1 and also iterate `games/registry.ts`, which is empty until Milestone 2.
- jsdom: stub `HTMLCanvasElement.prototype.getContext` to return null in test setup, have a `get2d()` helper that tolerates null, and guard every `window.matchMedia` call.
- Add a copy test: the word "cure" never appears in `src/app` or `src/core/content`.

### App UI
- Hash routes: `#/` home, `#/onboarding`, `#/play/:id`, `#/colours`, `#/settings`, `#/profiles`, `#/parent`, `#/evidence`, `#/treatments`.
- The colour editor is one component used both as the Colours page and as an overlay inside the pause menu, with the game canvas still visible behind it, so the pause-menu path never leaves the running game.
- Colour control: an HSV wheel (hue = angle, saturation = radius, drawn once into `ImageData`) sets `base`; a slider with ±1 buttons and a % readout sets `brightness`; the hex field shows `base × brightness` and, when typed into, is split back into `base` (value forced to 1) and `brightness`.
- The eye test and guided calibration draw through the real channel renderer with a palette override at 100 % fellow contrast (the strictest case for leaks). Eye test: two distinct random digits in random left/right order; answers are the two digits, "both" and "none".
- Profile avatars and game tile icons are small canvases drawn through the channels (a face whose two eyes are split between the channels), so there is no coloured chrome.
- Child profiles: Settings and the parent area sit behind the hold-3-seconds gate. Colours, profile switching and the Evidence pages are open. Adding or deleting a profile is gated.

### Falling blocks (Milestone 2)
- Well 10×18. Pieces are cell lists rotated about a pivot, with kick tries of 0, ±1, ±2 columns and 1 row up. Randomiser: uniform, but never the same piece three times running. Seeded `rng` from `GameContext` so tests are deterministic.
- Scoring: `100 × rows² × level` per clear, plus 1 per cell of hard drop. Level rises every 8 rows. Gravity interval `max(90, 800 × 0.86^(level − 1))` ms.
- Cleared rows fade out over 400 ms (instant with reduced motion); the next piece spawns after the fade. Game over when a spawn collides.
- Input: left/right with auto-repeat (170 ms delay, 50 ms repeat), down = soft drop, up or secondary = rotate, primary = hard drop. Touch: horizontal drag moves one column per cell width, a short tap rotates, a fast downward swipe hard-drops.
- Channels: active piece, landing shadow (outline, intensity 0.5) and next preview → `weakEye`; stack → `fellowEye`; frame and grid (intensity 0.25) → `both`. Score, level and countdown are DOM text in the HUD.
- Adaptive starting level is left as a hook (`startLevel`, always 1 for now); the real logic is a Milestone 3 item.

### Still to do before writing the Evidence copy
- Fetch the PubMed abstracts for 34534556, 39179129 and 38360334 and quote only what they say. `docs/EVIDENCE.md` itself notes that sources disagree on the CureSight numbers (149 vs 103 children).
- Add `scripts/check-links.mjs` (Node `fetch`, generic user agent, no personal data) that checks every URL in `src/core/content/evidence.ts`, and record the results in `docs/PROGRESS.md`. Some sites reject scripted requests; list those as "check by hand".
