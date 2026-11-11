# Progress & handoff notes

Every session: read this first, and update it before finishing. See `docs/PROMPT.md` → "Handoff notes" for the rules.

## Status
| Milestone | State |
|---|---|
| 0 Plan | **done**, approved by the user 2026-11-11 (`docs/PLAN.md`) |
| 1 Foundation (settings, colours, onboarding, evidence pages) | not started |
| 2 First game (falling blocks) | not started |
| 3 Four more games | not started |
| 4 Progress & polish (dashboard, PWA) | not started |
| 5 Ship (CI, GitHub Pages, README) | not started |

## Next step
Build Milestones 1 and 2 without stopping between them. No code exists yet.

1. Read `CLAUDE.md`, `docs/PLAN.md` (all of it, including §11 "Implementation notes") and `docs/USER-FEEDBACK.md`. The plan is approved: do not re-plan or ask for approval again.
2. Scaffold: `package.json` (scripts `dev`, `build`, `test`, `lint`, `check-links`), `tsconfig.json`, `vite.config.ts` (`base: './'`, Vitest config), `eslint.config.js`, MIT `LICENSE` (holder: "Binocular Play contributors", 2026), `.claude/launch.json` for the preview pane. Then `npm install -D vite typescript vitest jsdom eslint @eslint/js typescript-eslint`. No runtime dependencies.
3. Milestone 1 in the order of `docs/PLAN.md` §9, with the five rule tests in `tests/rules/` written first.
4. Verify as in `docs/PLAN.md` §10, update this file and the Commands section of `CLAUDE.md`, commit.
5. Milestone 2 the same way, then commit again.
6. Finish with: what was built, what was and was not verified, and a short real-glasses checklist.

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

## Known issues / TODOs
- Check that every link in docs/EVIDENCE.md loads. The AAPOS, AAO, NEI and PubMed links were added from Gemini research and aren't checked yet.
- The CureSight trial numbers in docs/EVIDENCE.md are not verified (sources disagree: 149 vs 103 children). Read the PubMed abstracts before writing the Evidence page.
- Not yet tested with real anaglyph glasses.
- Safari can delete localStorage after 7 days without a visit unless the site is installed to the home screen. Planned mitigation: request persistent storage, an export nudge, and the PWA install in Milestone 4.
- Night-light / True Tone / auto-brightness change colours after calibration. The calibration screen must say to turn them off.

## How to run
Nothing to run yet: no `package.json`, nothing installed. Fill this in after scaffolding (commands, dev URL, where tests live).

Environment checked on 2026-11-11: Node 26.7.0, npm 11.19.0, git 2.50.1 on Windows 11. Git identity is configured globally.

## Repo state
- Git repo initialised on branch `main`. No remote. Nothing has been pushed.
- `.claude/settings.local.json` is local-only and is listed in `.gitignore`.

## Session log
- 2026-11-11, Opus 5.5: prior-art research, evidence gathering, wrote CLAUDE.md, PROMPT.md, RESEARCH.md, EVIDENCE.md, and this file. No code yet.
- 2026-11-11, Opus 5.5: added the Gemini deep-research report (docs/research/) and distilled it into docs/USER-FEEDBACK.md. New MUSTs: double-vision safeguards, better calibration UX, adaptive difficulty, countdown and weekly goals, a low-effort mode, a "free forever" statement. Reading mode is a SHOULD.
- 2026-11-11, Fable 5.2: read all docs, wrote the Milestone 0 plan (five hard rules, truth table, schema, `Game` interface, game designs, risks in CLAUDE.md), got it approved, saved it as docs/PLAN.md with implementation notes in §11, ran `git init`. The user moved the build to a fresh session to save tokens, so no code was written. Commit: "Add project docs and approved Milestone 0 plan".
