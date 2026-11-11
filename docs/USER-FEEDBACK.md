# User feedback → design requirements

Source: the Gemini Deep Research report (raw copy in `docs/research/gemini-deep-research-2026-11-11.md`), cross-checked against the earlier search in `docs/RESEARCH.md`. The raw report overstates some points (e.g. calling a hobby repo "clinical-grade", and a "0.2% crosstalk" threshold with no clear source). The items below are the parts that turn into concrete requirements.

## 1. Safety: double vision is the biggest real risk (MUST)
- One app-store review of Lazy Eye Blocks said an 8-year-old **developed double vision (diplopia)** after unsupervised use and needed prism glasses. Breaking suppression without clinical oversight can do this, especially with **strabismus** (an eye turn).
- Requirements:
  - **Onboarding screening questions** (self-report only, not a diagnosis):
    - Does either eye turn in, out, up or down?
    - Have you ever had double vision?
    - Has an eye doctor confirmed amblyopia and said binocular games are OK?
  - If the answer to either of the first two is yes, show a strong "talk to your eye doctor first" screen. The user can continue only after the parent confirms a clinician approved it.
  - **Every session starts with a one-tap check:** "Do you see double right now?" If yes, the app blocks play for that session.
  - **The pause menu has a "I see double / my eyes hurt" button**, which stops the session and shows guidance: stop, rest, tell your eye doctor.
  - The disclaimer and the Evidence page say this risk plainly.
- Don't build diagnostic tests (Maddox rod, cyclotropia detection, etc.). We can't validate them, and they'd imply medical accuracy.

## 2. Colour calibration UX (MUST). Crosstalk is the #1 technical frustration
Complaints:
- imprecise colour pickers
- a UI border that got in the way of matching colours to the background
- users "guessing" where blocks land because they couldn't fuse the image
- hours spent fiddling with sliders
- cheap glasses leaking

Requirements:
- Calibrate **full-screen**, with no borders or chrome around the test shapes, against the real game background
- Fine controls: coarse slider + ±1 step buttons + a hex/RGB field
- A **guided "make it disappear" step for each eye**:
  - close one eye, then lower the leaking colour until the shape vanishes
  - show a hidden-number check after each step
- A **"glasses quality" tip**: if calibration can't remove the ghost, explain that cheap glasses leak and suggest better ones. Don't name or sell any brand.
- **Fusion aids** so players don't have to guess: a `both`-channel frame/grid, a ghost piece showing where it will land, and optional guide lines
- Save calibration and let the user re-open it any time (already in CLAUDE.md)

## 3. Adaptive difficulty (MUST)
The most common GamE-blyopia complaint: users master the games and then stagnate.
- Each game gets difficulty levels that rise with performance (speed, target size, number of objects)
- Fellow-eye contrast can rise slowly when performance is good. This is optional and off by default (already noted). Show the change to the parent.
- Never ramp difficulty during a session so fast that it causes frustration. Allow a manual override.

## 4. Session structure & motivation (MUST)
- A visible **countdown clock** for the session
- **Weekly goals** (e.g. 5 days × 20 min) and streaks, both requested by users
- Short rounds of 2–5 minutes. Active games are tiring, and parents describe sessions as "a battle of wills" (AmblyoPlay feedback).
- Variety: rotate a suggested "today's game"
- **Passive modes have much better adherence** (CureSight lets kids watch their own content: 91% adherence; Luminopia's fixed library: 73% in real-world use). Add at least one **low-effort mode**: a relaxing dichoptic "watch/explore" activity with simple taps, e.g. an aquarium or a slowly moving scene. A stretch goal is dichoptic playback of a video file the user picks locally, with a mask pattern split between the eyes.

## 5. Reading mode (SHOULD). Requested by adult users
- A **dichoptic reading passage** mode: alternate words or letters go to each eye, so you need both eyes to read the text
- Adjustable font size and background lightness (both requested)
- Bundle public-domain passages, or let the user paste their own text

## 6. Adults are a big audience (SHOULD)
- Many success stories and requests come from adults (aged 25–58).
- Offer an "adult" theme (clean, no cartoons) and skip the parent gate for an adult profile.
- Be honest in copy: evidence in adults is weaker and comes mostly from smaller studies (a 2025 meta-analysis of perceptual learning and video games in adults: [PubMed 40146483](https://pubmed.ncbi.nlm.nih.gov/40146483/)).

## 7. Trust & monetization (MUST)
- Users were furious at "free" apps that hid a paywall after making them calibrate. State it on the first screen: **"Free. No ads, no account, no paywall, ever."**
- No ads, no cloud storage of personal data (Eye Kare got privacy concerns)

## 8. Familiar game loops help (SHOULD)
- Eye Kare is praised for using familiar loops (number-merge puzzle, snake, tic-tac-toe, simple maths), which lowers the effort of learning a new game.
- Keep our genres familiar but original. Simple puzzle/maths games are good for younger kids.

## Prior art update
- [TwoEyes Vue](https://github.com/xcsweb/twoeyes-vue) ([live](https://xcsweb.github.io/twoeyes-vue/)):
  - Vue 3 + three.js, Chinese-language UI
  - Exam suite plus a falling-blocks trainer; 4 stars
  - **The license forbids commercial use** and isn't a standard open-source license, so **don't copy its code.** Ideas only.
- Still no free, English, kid-and-adult-friendly multi-game web suite. The gap remains.
