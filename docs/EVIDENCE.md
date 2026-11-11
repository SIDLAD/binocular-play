# Evidence and other treatments (source for the in-app "Evidence" and "Other treatments" pages)

Gathered 2026-11-11. **Fable: before shipping, re-check that every link still works.** Quote results honestly, including the negative ones. Never use the words "cure", "treat" or "replaces" for this app.

## 1. The honest summary (show this in plain language in the app)
- Amblyopia is treated by an eye doctor. The proven treatments are, in order:
  1. **glasses** (if needed)
  2. then **patching** the strong eye, or **atropine drops** that blur the strong eye
- **Dichoptic / binocular games** like these are a newer approach:
  - **Prescription devices** (Luminopia, CureSight) have positive randomized trials and FDA clearance.
  - **Simple iPad games** had mixed or negative trial results, mostly because children found them boring and didn't play enough.
  - Reviews say digital binocular therapy **has not yet been shown to be better than patching**.
- So: use this app **alongside** whatever your eye doctor prescribes, not instead of it. Tell your doctor you're using it.

## 2. Standard treatments (link these on the "Other treatments" page)
| Treatment | What it is | Where you get it | Evidence |
|---|---|---|---|
| Glasses | Fix the focusing error first. Sometimes glasses alone are enough. | Eye doctor / optometrist prescription | [ESCRS summary](https://escrs.org/channels/eurotimes-articles/amblyopia-treatment-evidence): glasses alone resolve amblyopia in roughly a quarter to a third of patients |
| Patching | Cover the strong eye for a set number of hours each day | Prescribed by an eye doctor. Patches from pharmacies or opticians. | Gold standard. PEDIG dose trials: 2 h/day ≈ 6 h/day for moderate amblyopia ([PMC4549157](https://pmc.ncbi.nlm.nih.gov/articles/PMC4549157)) |
| Atropine drops | Drops that blur the strong eye | **Prescription only** | [Cochrane review](https://www.cochrane.org/evidence/CD006460_treatment-amblyopia-lazy-eye-patching-or-dropsdrug-treatment): similar results to patching |
| Prescription digital therapy | Luminopia (VR headset), CureSight (eye-tracking + anaglyph) | Prescription, in some countries | See section 3 |

Good plain-language leaflets for parents:
- [Cambridge University Hospitals (NHS)](https://cuh.nhs.uk/patient-information/amblyopia-lazy-eye-in-children-parent-information)
- [Worcestershire NHS](https://www.worcsacute.nhs.uk/leaflets/treatment-of-amblyopia-lazy-eye/)
- [MSD Manual](https://www.msdmanuals.com/professional/pediatrics/eye-defects-and-conditions-in-children/amblyopia) (treatment works best when started early in childhood)
- [AAPOS: Amblyopia](https://aapos.org/glossary/amblyopia)
- [AAO EyeSmart: Amblyopia (lazy eye)](https://www.aao.org/eye-health/diseases/amblyopia-lazy-eye) and [AAO: Can VR correct lazy eye?](https://www.aao.org/eye-health/tips-prevention/virtual-reality-luminopia-lazy-eye-amblyopia)
- [NEI: Amblyopia](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/amblyopia-lazy-eye)
- [AAO Amblyopia Preferred Practice Pattern (2022, updated 2024)](https://www.aao.org/education/preferred-practice-pattern/amblyopia-ppp-2022): the clinical guideline, which includes binocular digital therapy
- [AAO: Lazy eye and double vision](https://www.aao.org/eye-health/ask-eye-md-q/lazy-eye-double-vision)
- (These links came from Gemini research. Fable: check each one loads before shipping.)

**"Exercises" (Brock string, convergence exercises, etc.):** the search found no strong evidence that home eye exercises treat amblyopia. The app should **not** prescribe any exercises. Say: "Your eye doctor or orthoptist may give you exercises. Follow their plan." The one exception: a patching or atropine reminder, set by the parent.

## 3. Evidence on binocular / dichoptic games (for the "Is this real?" page)
**Positive**
- **Luminopia** pivotal RCT (Xiao et al., *Ophthalmology* 2021):
  - 105 children aged 4–7, 12 weeks
  - +1.8 lines with Luminopia vs +0.8 lines with glasses alone
  - FDA cleared ([PubMed 34534556](https://pubmed.ncbi.nlm.nih.gov/34534556/))
- **CureSight** RCT (*Am J Ophthalmol* 2024):
  - 149 children, red-blue anaglyph with eye tracking
  - Did as well as or slightly better than patching (0.28 vs 0.23 logMAR); adherence 94% vs 84%
  - Gains held at 1 year ([PubMed 39179129](https://pubmed.ncbi.nlm.nih.gov/39179129/), [1-year follow-up PubMed 38360334](https://pubmed.ncbi.nlm.nih.gov/38360334/), [Healio](https://www.healio.com/news/optometry/20240912/curesight-demonstrates-greater-visual-acuity-gains-vs-patching-in-patients-with-amblyopia))
  - Sources report different numbers (149 vs 103 children; logMAR vs "lines"). Quote the PubMed abstract only.
- **AAO's clinical guideline** now includes binocular digital therapy ([PPP](https://www.aao.org/education/preferred-practice-pattern/amblyopia-ppp-2022))
- **Real-world**: adherence for Luminopia fell from ~88% in the trial to ~73% in a registry. Content boredom is the reported reason.
- **Tsani et al. 2024** systematic review: 20 RCTs, 1,769 patients, "promising results" ([link](https://ouci.dntb.gov.ua/works/40NpAzy9))

**Mixed or negative (show these too, it builds trust)**
- PEDIG falling-blocks iPad game:
  - Not better than placebo or glasses alone in some trials ([AAO](https://www.aao.org/editors-choice/falling-blocks-video-game-ineffective-unilateral-a))
  - Comparable to patching in 5–6 year olds who had never been treated
  - Very low adherence: 13–22% did most of the prescribed play ([PMC5145771](https://pmc.ncbi.nlm.nih.gov/articles/PMC5145771), [PMC6206863](https://pmc.ncbi.nlm.nih.gov/articles/PMC6206863))
- PEDIG Dig Rush game, ages 7–12: no benefit beyond glasses ([AAO](https://www.aao.org/eyenet/article/dig-rush-binocular-game-for-amblyopia))
- [Cochrane 2022 (CD011347.pub3)](https://core.ac.uk/download/481629086.pdf): too few trials to conclude
- Digital binocular therapy has not beaten patching ([Review of Optometry](https://www.reviewofoptometry.com/article/review-finds-no-clear-advantage-for-digital-binocular-therapy-over-patching-in-amblyopia))

**Safety:** unsupervised binocular training has been reported to trigger double vision in a child with an eye turn (see `docs/USER-FEEDBACK.md` §1). The app must screen for this and stop when it happens.

**Design lesson for us:** the big failure mode is **boredom → low play time**. Engaging games, short sessions, streaks, and parent involvement matter more than anything else.

## 4. Where to put this in the app
- A short "Is this real?" link on the home screen, onboarding, footer, and the README
- A full **Evidence** page with sections 1 and 3, every link visible
- An **Other treatments** page with section 2
- Every page that makes a claim links to its source
