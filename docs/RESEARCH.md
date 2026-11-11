# Prior-art check (done 2026-11-11)

Question: is there already a free, online, browser-based suite of red/blue (anaglyph) amblyopia games like the ones used in eye hospitals?

## Short answer
**Partly.** There are a handful of free hobby projects and some freemium apps, but no free, well-made, multi-game, browser-based suite with proper calibration that works on phone, tablet and desktop. Building one is worthwhile. Before starting, play the ones below for 10 minutes each and note what's good or annoying about them.

## Free / open source (browser)
| Project | What it is | Notes |
|---|---|---|
| [twoeyes](https://github.com/artelydev/twoeyes) ([live](https://twoeyes.netlify.com/)) | React + three.js binocular trainer, red-cyan, GPL-3.0 | Small (≈9 stars); asks for mini-game contributions. Few games. |
| [lazy eye blocks](https://leblocks.github.io/lazy-eye-blocks) | Falling-blocks game in the browser with colour calibration and an eye swap option | One game only. Good calibration idea to learn from. |
| [react-dichoptic-tetris](https://github.com/batistan/react-dichoptic-tetris) | Hobby falling-blocks game | One game only. |
| [figicat](https://github.com/ydiazn/figicat) | WebGL anaglyph game | Needs WebGL. |
| [AquaVision](https://aquavision-website.vercel.app) | Research prototype, red/cyan | Download, not a polished web app. |
| [Piggy / Make Patching](https://piggy-landing.pages.dev/) | Free browser game with an optional red/blue mode | Meant to go with patching, not a dichoptic suite. |

## Freemium / commercial (not fully free, or not in the browser)
- iOS apps: [GamE-blyopia](https://apps.apple.com/us/app/game-blyopia/id1340307566), [Eye Kare](https://apps.apple.com/us/app/eye-kare/id1546432533), [AmblyoVision II](https://apps.apple.com/app/id6757404955), [Chamelure](https://apps.apple.com/us/app/-/id6711331847)
- [Bynocs](https://bynocs.com/?p=1996): a browser platform run through clinics
- [BiColor Vision Trainer](https://store.steampowered.com/sub/1351339) on Steam (paid)
- Prescription, FDA-cleared: Luminopia (VR headset) and CureSight (eye tracking + anaglyph). A 2025 cost study put 12 weeks of treatment at roughly $1,500–2,000 ([summary](https://www.physiciansweekly.com/post/cost-utility-analysis-of-luminopia-and-curesight-for-treating-amblyopia)).

## Evidence background
- [AAO: Binocular amblyopia therapies](https://aao.org/eyenet/article/binocular-amblyopia-therapies)
- [AAO: Can video games be used to treat amblyopia?](https://www.aao.org/eyenet/academy-live/detail/can-video-games-be-used-to-treat-amblyopia)
- Results from trials are mixed. Passive, unengaging games did worse in some PEDIG trials. Engagement and how long people actually play matter a lot. That's why game quality is the whole point of this project.

## What users and reviewers say (2026-11-11)
User reviews are thin (small projects with few reviews), but these points come up again and again:
- **Fixed colours are the #1 complaint.** One r/Amblyopia commenter said earlier apps were "expensive, not very easy to use, or only worked for a very specific set of colors for glasses." Reviews of lazy eye blocks on [amblyopiaarcade.com](https://amblyopiaarcade.com/amblyopia-games/) praise its **colour wheel** for matching your own glasses, plus a "falling block shadow" (a ghost piece).
- **Boredom kills results.** In the PEDIG trials only 13–22% of kids did most of the prescribed play. Researchers said the problem was "the mundane nature of the games". When they switched to more action-oriented games, compliance rose to 86% ([PMC5984723](https://pmc.ncbi.nlm.nih.gov/articles/PMC5984723), [eyesoneyecare](https://eyesoneyecare.com/resources/utilizing-dichoptic-treatment-for-amblyopia)).
- **Glasses quality and fit** complaints show up in commercial app reviews (e.g. [AmblyoPlay on Trustpilot](https://au.trustpilot.com/review/amblyoplay.com?page=3)).
- **Crosstalk is real.** One measurement: about 20% leakage through the red filter and 3% through green, on an iPad ([PMC11696884](https://pmc.ncbi.nlm.nih.gov/articles/PMC11696884)). So per-device calibration is required.
- **Adults want it too.** Several r/Amblyopia posts come from adults. Support adult-friendly themes, not only cartoons.

Fable: before Milestone 3, browse r/Amblyopia and the app-store reviews of GamE-blyopia, Eye Kare and AmblyoPlay for more feedback. A second opinion from another model (e.g. Gemini) is optional.

## Colour values: is there an official standard?
**No.** I found no published RGB standard for amblyopia glasses. The prescription devices calibrate per device. Starting presets (screen RGB on a dark background):
| Glasses | Red-lens colour | Other-lens colour | Notes |
|---|---|---|---|
| Red / Cyan (most common, cheap cardboard) | `#FF0000` | `#00FFFF` | Best colour separation in general |
| Red / Blue (common in hospitals) | `#FF0000` | `#0000FF` | Blue is dim, so it may need brightening and the red side dimming |
| Red / Green (used in PEDIG and early studies) | `#FF0000` | `#00FF00` | Highest crosstalk; green often leaks |

Treat these only as defaults. The calibration screen tunes each one. Optional "light background" mode: dark shapes on white, used in some studies to avoid colour-contrast cues. **The eye mapping flips in this mode** (a red shape on white is invisible to the red-lens eye), so keep it behind a setting and test it carefully. One study put the **red filter over the amblyopic eye** on purpose ([PMC8712591](https://pmc.ncbi.nlm.nih.gov/articles/PMC8712591/table/tbl0005) context). Suggest that as the default, but keep it configurable, and the eye doctor's instruction wins.

## Where we can do better than what exists
1. Several games in one place, not one.
2. Calibration that works per device, with glasses type, lens side, weak eye, and contrast balance.
3. Works on phones and tablets with touch, and offline as a PWA.
4. Free, no account, no tracking, open source.
5. A session timer and simple progress log that a parent can show the eye doctor.
