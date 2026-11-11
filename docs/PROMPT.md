# Kickoff prompt for Fable 5.2

Paste everything below the line into a new Claude Code session opened in this folder (`D:\Projects\binocular-play`). `CLAUDE.md` loads automatically.

---

I want to build **Binocular Play**: a free, open-source, browser-based collection of dichoptic red/blue anaglyph games for amblyopia (lazy eye), like the ones eye hospitals give children. Read these first:
- `CLAUDE.md`: the core concepts and rules
- `docs/RESEARCH.md`: existing projects, user feedback, colour presets
- `docs/EVIDENCE.md`: medical evidence and other treatments, which become in-app pages
- `docs/USER-FEEDBACK.md`: real user complaints turned into MUST/SHOULD requirements. Treat every MUST as part of the milestone it belongs to.

**Goal:** a polished, kid-friendly static web app that's free to host on GitHub Pages. It should have a calibration flow and at least 5 original games, and it should work offline on phones, tablets and desktops.

## How to run this: a few big steps, with handoff notes
The work is done over a few large steps, possibly by different sessions or models. **Each step must leave the repo ready for a new session with no memory of this one.**

Suggested steps (one prompt each):
1. Milestone 0 (plan, waits for approval), then Milestones 1–2
2. Milestones 3–4
3. Milestone 5 plus fixes from my real-glasses test

Within a step, don't stop between milestones. After each milestone, check your own work:
- run the build and tests
- open the app in the browser
- screenshot it at desktop and phone sizes
- fix what you find
- commit

Only stop early if you're truly blocked on a decision that's mine to make.

**Handoff notes (required):** keep `docs/PROGRESS.md` up to date and commit it with every milestone. It must contain:
- **Status**: which milestones are done, in progress, or not started
- **Next step**: exactly what the next session should do first
- **Decisions log**: dated entries saying what was decided and why (architecture, colour mapping, library choices). Never delete entries. Mark replaced ones as superseded.
- **Known issues / TODOs**, including anything not verified
- **How to run**: commands, the dev URL, and where tests live
- **Session log**: one short dated entry per session (model, what was done, commits)

Also keep the "Commands" section of `CLAUDE.md` current.

At the end of each step, give me:
- what was built
- what you verified and what you couldn't verify (for example, real glasses)
- a short checklist for me to test with real red/blue glasses

## Milestones, in this order

### Milestone 0: plan
Plan first (don't write code yet). Give me:
- The folder structure
- The `Game` interface
- How the colour-channel renderer works (`weakEye` / `fellowEye` / `both`, contrast, calibration)
- The settings schema
- A one-paragraph design for each game

Point out anything in `CLAUDE.md` that seems wrong or risky.

**The plan must state each of these hard rules and show how the design enforces it. Each one also becomes an automated test:**
1. **Channels only.** Games draw only through `weakEye` / `fellowEye` / `both`. No raw colour values anywhere under `src/games/`. Add a test or lint rule that fails if it finds a hex or `rgb(` colour there.
2. **Eye mapping.** On a dark background, a shape in the red-lens colour is seen only by the red-lens eye, and a shape in the other lens colour only by the other eye. So `weakEye` gets the colour of the lens over the weak eye. Include a truth table covering every combination of glasses type × lens side × weak eye, and test every row. If light-background mode exists, it flips the mapping and gets its own rows.
3. **Colours stay adjustable.** Calibration is saved per profile and per device. The Colours page and the pause-menu adjust option can change it at any time, and changes apply instantly with no reload. Test that changing a setting updates the colours of a running game.
4. **Fellow-eye contrast** dims only the `fellowEye` channel, never `weakEye` or `both`.
5. **Safety.** The double-vision safeguards are in place (onboarding screening, a check before each session, a stop button). Nothing flashes more than 3 times a second. The disclaimer is shown before the first game. The Evidence page is reachable from home.

### Milestone 1: foundation
- Vite + TypeScript scaffold, lint, Vitest
- Channel renderer + settings store (localStorage, versioned, with export/import as JSON)
- **First-run onboarding**, in this order:
  1. Disclaimer: not a medical device, use with an eye doctor's OK
  2. Glasses type
  3. Which lens is on which eye
  4. Which eye is weak
  5. **Calibration screen**: show red and blue shapes. The user closes one eye at a time and tunes sliders until the "wrong" colour disappears. Include a "check" screen with a hidden number per eye.
  6. Fellow-eye contrast slider
- A persistent **Colours** settings page (live preview, colour wheel + brightness per channel, eye test, reset to preset, re-calibrate), plus a quick colour-adjust option in every game's pause menu
- Profiles (multiple players per device)
- **Evidence** ("Is this real?") and **Other treatments** pages built from `docs/EVIDENCE.md`, linked from onboarding, home and the footer. Check every link works.
- Home screen with game tiles, a settings page, and a parent gate
- Session timer with a gentle break overlay at the set time. No flashing.

### Milestone 2: first game, end to end
A **falling-blocks puzzle**: the active piece goes to the weak eye, the settled stack to the fellow eye, and the border to both. It needs:
- Keyboard and touch controls (swipe or on-screen buttons)
- Score and levels
- Pause
- Session logging (date, game, minutes, score)

Use this game to prove the whole pipeline before building more.

### Milestone 3: four more original games
Each one needs a clear rule for which eye sees what:
1. **Brick breaker**: ball and paddle to the weak eye, bricks to the fellow eye
2. **Snake-like**: snake to the weak eye, food and walls split between the eyes
3. **Space catcher/shooter**: falling objects to the weak eye, player ship to the fellow eye
4. **Spot-and-tap / matching** (good for small kids): targets split between the eyes, so you need both to find the match

Give them all original names, art and sounds (simple synthesized sounds with WebAudio, muteable).

Also add, per `docs/USER-FEEDBACK.md`:
- adaptive difficulty in every game
- one **low-effort relaxing mode**, e.g. a dichoptic aquarium with simple taps
- a **dichoptic reading mode** for adults: words split between the eyes, adjustable font size and background
- a session countdown clock, weekly goals and streaks

### Milestone 4: progress and polish
- Parent dashboard: minutes per day (a simple chart), streak, and a printable or exportable summary for the eye doctor
- Optional auto-adjust: slowly raise fellow-eye contrast when the user does well. Off by default.
- Accessibility: big tap targets, readable fonts, reduced-motion support
- PWA install + offline

### Milestone 5: ship
- GitHub Actions workflow that tests, builds, and deploys to GitHub Pages
- README with screenshots, a "how to use safely" section, the disclaimer, a contribution guide (how to add a game), and an MIT LICENSE
- Playwright smoke test: every game loads and runs for 5 seconds with no console errors

## How to check your own work
- Run the app in the browser and take screenshots at desktop and phone sizes.
- Unit-test the eye→colour mapping for every combination of glasses type × lens side × weak eye.
- Make sure no game ever uses raw colours. Everything goes through the channel renderer.
- You can't see through real glasses, so check the colour separation numerically: a unit test that every channel's colour is a pure, separable channel after calibration. I'll test with real glasses at the end and send fixes as a follow-up.

Ask me questions only when something is genuinely my call. Otherwise choose sensible defaults and tell me what you chose.
