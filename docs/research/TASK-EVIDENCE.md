# Task evidence (Milestone 3)

Condensed from two research passes in November 2026. This is the source for the Evidence page copy and for each task's info card. Numbers marked **(unverified)** were not confirmed against a primary abstract; do not put them in the app as facts.

How to read this: "logMAR" gains are acuity changes (−0.1 logMAR ≈ one line on an eye chart). SMD is a standardised mean difference (negative = improvement here). None of these studies tested Binocular Play.

## 1. Perceptual learning (PL) in adults and older children

| Study | What was trained | Key result | Caveats |
|---|---|---|---|
| **Ming 2025**, Ophthalmol Ther 14:857, [PMID 40146483](https://pubmed.ncbi.nlm.nih.gov/40146483/), [PMC12006629](https://pmc.ncbi.nlm.nih.gov/articles/PMC12006629/) | Meta-analysis: 22 studies, 422 adults; PL and video games | Pooled SMD −0.68. PL −0.75; video games −0.58; **monocular −0.88; dichoptic −0.51**. Hours trained vs gain r = 0.59 | Some included studies are tiny; heterogeneity reporting inconsistent |
| **Tsirlin 2015**, IOVS 56:4061, [PMID 26114483](https://pubmed.ncbi.nlm.nih.gov/26114483/) | Review: 24 adult studies | Mean gain 0.17 logMAR; baseline acuity was the only predictor | Mostly small uncontrolled studies |
| **Polat 2004**, PNAS, [PMC404107](https://pmc.ncbi.nlm.nih.gov/articles/PMC404107/) | Gabor with collinear flankers, ages 9–55 | −0.15 logMAR after 12 sessions, about −0.25 after ~48; 3-down-1-up, 0.1 log steps; 30-min sessions 2–4×/week; kept at 12 months | Needs contrast below 8-bit precision → **backlog**, not built |
| **Chen 2008**, [PMID 18761479](https://pubmed.ncbi.nlm.nih.gov/18761479/) | PL vs patching | PL −0.25 logMAR in 29.5 h vs patching −0.34 in 522 h | Small |
| **Huang 2008**, PNAS, [PMC2268837](https://pmc.ncbi.nlm.nih.gov/articles/PMC2268837/); **Zhou 2006**, [PMID 16153674](https://pubmed.ncbi.nlm.nih.gov/16153674/) | Grating detection at the cut-off spatial frequency (where threshold ≈ 0.5 contrast; mean 7.5 cpd); 2IFC; contrast ×0.9 after 3 correct, ×1.1 after an error; 9 × 120 trials ≈ 1 h; ~12 sessions | Contrast sensitivity +10.7 dB, acuity +37% | Uncontrolled, n = 10. Zhou 2006 numbers **(unverified)**. Thresholds sit in 8-bit range → **built as Stripe Finder** |
| **Hussain 2012**, J Neurosci, [PMC3428833](https://pmc.ncbi.nlm.nih.gov/articles/PMC3428833/); **Chung 2012**, PLoS One, [PMC3340394](https://pmc.ncbi.nlm.nih.gov/articles/PMC3340394/) | Crowded letters: 10 Sloan letters CDHKNORSVZ, 4 flankers, 150 ms target; spacing staircase 3-down-1-up from 2× to touching; size shrinks 10%; 3–4 × 150 trials, 8–14 sessions | Up to 0.3 logMAR; 91% retained at 3–14 months | High contrast → 8-bit screens are fine → **built as Letter Crowd** |
| **Hussain 2014**, Front Psychol, [PMC4217344](https://pmc.ncbi.nlm.nih.gov/articles/PMC4217344/) | Home browser version on ordinary screens; Floyd–Steinberg dithering; observer gamma match; ~1 m distance | +1.3 lines in ~11 h | Children lost motivation after about a week |
| **Hernández-Andrés 2025**, OPO, [PMC11629843](https://pmc.ncbi.nlm.nih.gov/articles/PMC11629843/) | Home PL, children 4–12 | −0.22 logMAR vs patching −0.12 | |
| **Liu 2020**, Front Neurosci 14:593119 | Dichoptic PL: ±45° grating 200 ms to weak eye, Gaussian noise to fellow eye, 2-down-1-up | +0.83 lines | → Stripe Finder "Push" mode |
| **Xi 2014**, IOVS, [PMC3989086](https://pmc.ncbi.nlm.nih.gov/articles/PMC3989086/) | Red-green anaglyph stereo training, "which is nearer"; 2-down-1-up ×0.9/×1.1; 3 × 80 trials; 10–13 sessions | Stereo 777″ → 490″; acuity 0.44 → 0.35 logMAR | Small → **built as Depth Duel** |
| **Vedamurthy 2016**, [PMC4901458](https://pmc.ncbi.nlm.nih.gov/articles/PMC4901458/) | VR stereo training | Randot ~65% better; acuity change minimal | |
| Li 2013, Curr Biol | Dichoptic falling blocks in adults | Numbers **(unverified)** | Not cited in the app |

## 2. Dichoptic trials (mostly children)

**Positive**
- **Luminopia**, Xiao 2022, [PMID 34534556](https://pubmed.ncbi.nlm.nih.gov/34534556/): ages 4–7, 1 h/day, 6 days/week, 12 weeks; +1.8 vs +0.8 lines (glasses alone). Passive video with complementary masks. Fixed fellow-eye contrast of ~15% and the mask shapes are **(unverified)**.
- **CureSight**, Wygnanski-Jaffe 2025, [PMID 39179129](https://pubmed.ncbi.nlm.nih.gov/39179129/): 149 children, 90 min/day; non-inferior to patching; adherence 91–94%.
- **Birch / Kelly 2016**, [PMID 27832248](https://pubmed.ncbi.nlm.nih.gov/27832248/) (Dig Rush): critical elements to the weak eye at 100%, other elements to the fellow eye at reduced contrast, background to both; fellow eye starts at 20%. → **Glow Bounce** split.
- **Birch dichoptic movies**, Jost 2022, Sci Rep, [PMC8905014](https://pmc.ncbi.nlm.nih.gov/articles/PMC8905014/): Gaussian blob masks that change every 10 s; fellow contrast +2–3 points per movie. → **Watch mode** masks.
- **Contrast increment RCT**, [PMC8328197](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328197/): 0% vs +5% vs +10% increments gave equal results → fast contrast ramps are unnecessary.

**Negative**
- **PEDIG ATS18**, [PMC5145771](https://pmc.ncbi.nlm.nih.gov/articles/PMC5145771/): ages 5–12; only 22% did more than 75% of the prescribed play; patching did better.
- **PEDIG ATS20** (teens), [PMC6206863](https://pmc.ncbi.nlm.nih.gov/articles/PMC6206863/): 13% adherence.
- **BRAVO**, Gao 2018, [PMC6584719](https://pmc.ncbi.nlm.nih.gov/articles/PMC6584719/): adults and teens at home; null vs placebo game.
- **Dig Rush**, Holmes 2019, [PMID 30352226](https://pubmed.ncbi.nlm.nih.gov/30352226/): no benefit in ages 7–12.

**Action games**
- **Vedamurthy 2015**, [PMC4549206](https://pmc.ncbi.nlm.nih.gov/articles/PMC4549206/): action game with an embedded weak-eye Gabor tilt task; 40 h supervised; +0.14 logMAR. → **Star Patrol** gates.
- **Gambacorta 2018**, [PMC5984723](https://pmc.ncbi.nlm.nih.gov/articles/PMC5984723/): 21-child action-game pilot. Platform details **(unverified)**.
- **Žiak 2017**, [PMC5490155](https://pmc.ncbi.nlm.nih.gov/articles/PMC5490155/): Vivid Vision VR in adults.

**Reading**
- **Dranitsaris 2026**, [PMID 41650812](https://pubmed.ncbi.nlm.nih.gov/41650812/): dichoptic reading, feasibility only. → **Split Lines**, labelled "not yet tested as a treatment".

## 3. What separated success from failure
- **Device-measured adherence** is the biggest difference: 86–100% in positive trials vs 13–46% in failed ones.
- **Video beats games for adherence**: 84% vs 68% (Asensio-Jurado 2026, [PMID 41309334](https://pubmed.ncbi.nlm.nih.gov/41309334/)).
- **Weak-eye-use checks** (eye tracking, weak-eye-only catch tasks) were features of the successes.
- **Engagement drops at weeks 3–4** → variety and rotation matter.
- **Hours matter** in adults (Ming 2025, r = 0.59).

## 4. Safety
- Double vision was rare in trials.
- New eye turn in 6–9% vs 5–6% of controls.
- Adults with strabismus carry higher risk in dichoptic and stereo modes → Depth Duel hidden and Push mode warned when screening reported an eye turn, past double vision or "not sure".
- "~15% transient diplopia" ([PMC10821148](https://pmc.ncbi.nlm.nih.gov/articles/PMC10821148/)) **(unverified)**; not used in the app.

## 5. Could not verify (do not quote as fact)
1. Zhou 2006 exact numbers.
2. Li 2013 Curr Biol numbers.
3. Luminopia fixed fellow-eye contrast (~15%) and mask shapes.
4. Gambacorta 2018 platform details.
5. ~15% transient diplopia figure.

## 6. How each task maps to its evidence
| Task | Copies | Evidence badge |
|---|---|---|
| Letter Crowd | Hussain 2012, Chung 2012, Hussain 2014 | Small studies |
| Stripe Finder | Huang 2008, Zhou 2006, Liu 2020 | Small studies |
| Depth Duel | Xi 2014, Vedamurthy 2016 | Small studies |
| Watch mode / Quiet Reef | Jost 2022, Xiao 2022 | Trial-tested design |
| Star Patrol | Vedamurthy 2015, Gambacorta 2018, Žiak 2017 | Small studies |
| Glow Bounce | Kelly 2016 (split); Holmes 2019 (null) | Trial-tested design (mixed results) |
| Tumble Stack | Holmes 2016 (worse than patching), Gao 2018 (null) | Trial-tested design (mixed results) |
| Split Lines | Dranitsaris 2026 | Not tested |

"Trial-tested design" means a randomized trial tested a design like this one, not this app. Thresholds shown in the app are "training levels", never acuity.
