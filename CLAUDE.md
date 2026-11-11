# Binocular Play: project context

A free, open-source, browser-based collection of **dichoptic (anaglyph red/blue) games** for people with amblyopia (lazy eye), similar to the ones eye hospitals give children to play. It's a static site hosted for free and installable as a PWA.

Prior-art check: see `docs/RESEARCH.md`. User feedback turned into requirements: `docs/USER-FEEDBACK.md` (must-read). The build brief is in `docs/PROMPT.md`.

## The one idea everything depends on: how dichoptic anaglyph works
- The player wears glasses with a **red lens over one eye** and a **blue (or cyan, or green) lens over the other**.
- Draw on a **black or very dark background**:
  - Pure **red** shapes (`#FF0000`) pass through the red lens and look black through the blue lens, so **only the red-lens eye sees them**.
  - Pure **blue/cyan** shapes pass through the blue lens and look dark through the red lens, so **only the blue-lens eye sees them**.
  - **White/grey** shapes are seen by **both eyes**. Use these as "fusion locks": borders, score, frame. They help the brain fuse the two images.
- Treatment design (the "binocular / contrast-balanced" approach):
  - Give the **amblyopic (weak) eye** the elements the player must track to play: the moving piece, the ball, the target.
  - Give the **fellow (strong) eye** the supporting elements: the stack, the bricks, the background objects.
  - Both are needed to play, so the brain has to use both eyes together.
  - **Contrast balance**: dim the fellow eye's colour (e.g. 20–100% brightness) so the weak eye isn't suppressed. Store it per user. Raise it gradually as the user improves.
- Real screens and glasses leak (crosstalk). **Calibration is mandatory** and is set per device.

## Settings (all stored in localStorage, no account, and all adjustable any time)
- **Profiles**: several players on one device (siblings, parent + child). Each profile has its own settings and progress.
- Glasses type: red/cyan, red/blue, red/green, each with a starting colour preset (see `docs/RESEARCH.md` → "Colour values")
- Which lens is on which eye. Suggest red over the weak eye, but it must be configurable.
- Which eye is amblyopic (left/right). From these, work out which colour goes to which eye.
- **Colour & calibration is a persistent, user-editable setting, not a one-time wizard**:
  - A "Colours" page reachable any time from settings, showing a live preview
  - A full colour picker/wheel per channel plus brightness sliders
  - A "close one eye" test with hidden numbers
  - "Reset to preset" and "Re-run calibration"
  - A small in-game "adjust colours" button inside the pause menu
  - Save the tuned RGB per profile and per device
- Fellow-eye contrast (slider, %). Optional slow auto-increase, off by default.
- Background: dark (default). Optional light mode, where the eye mapping flips (see RESEARCH.md).
- Session length (default 20 min), break reminder, and an optional patching/drops reminder that the parent sets (the app never sets the dose)

## Non-negotiables
- **Health and safety**
  - Show a clear disclaimer on first launch and in the footer: this is not a medical device and doesn't replace an eye doctor's treatment or prescribed patching. Use it only with a clinician's OK.
  - **No flashing or strobing** (photosensitivity). Nothing may flash more than 3 times per second.
  - Remind about breaks.
  - **Double-vision safeguards** (see `docs/USER-FEEDBACK.md` §1): screening questions about eye turns and double vision at onboarding, a "Do you see double?" check before each session, and an "I see double / my eyes hurt" stop button in the pause menu. Never build diagnostic tests.
- **Evidence everywhere**: build in-app "Is this real?" / Evidence and "Other treatments" pages from `docs/EVIDENCE.md`. Link them from onboarding, home, the footer and the README. Show the negative trial results as well as the positive ones. Never claim the app cures or treats anything. Never prescribe exercises; point users to their eye doctor or orthoptist.
- **Engagement is the treatment.** Low play time is why earlier games failed. Prioritise fun: variety, short rounds, streaks, unlockable themes, and themes suitable for adults as well as kids.
- **Privacy**: no analytics, no cookies, no backend, no accounts. Data stays on the device. Export/import progress as a JSON file.
- **Original games only.** Use well-known *genres* (falling blocks, brick breaker, snake-like, maze, shooter, matching), but never copy a specific game's name, art, characters, music or levels.
- Works with **mouse, keyboard and touch**, on phone and tablet screens, in portrait and landscape.
- **Kid-friendly**: big buttons, readable text, simple language. A parent mode is behind a simple gate (e.g. "hold for 3 seconds").

## Tech stack
- Vite + TypeScript, HTML5 Canvas 2D. No game engine needed. Keep dependencies minimal.
- One shared `render` layer that only draws in three "channels": `weakEye`, `fellowEye`, `both`. **Games never pick raw colours.** That keeps calibration and eye swapping in one place.
- PWA (manifest + service worker) so it works offline.
- Static build to `dist/`. Host on **GitHub Pages** via a GitHub Actions workflow. Cloudflare Pages is the fallback.
- Tests: Vitest for logic (colour mapping, scoring, settings). Playwright smoke test that every game loads.
- License: MIT.

## Commands (fill in once scaffolded)
- `npm run dev`, `npm run build`, `npm test`

## Working style for agents
- **Start every session by reading `docs/PROGRESS.md`** and continue from its "Next step". Before you finish, update it: status, decisions, known issues, and a session log entry. Commit it. A new session must be able to pick up with no other context.
- Build one milestone at a time (see `docs/PROMPT.md`). Run it in the browser and check it before moving on.
- Keep each game in its own folder under `src/games/<name>/`, all using the same `Game` interface.
- Commit after each milestone with a clear message.
