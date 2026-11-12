/**
 * Content for the "Is this real?" and "Other treatments" pages, structured from docs/EVIDENCE.md.
 *
 * Rules for editing this file:
 *  - Negative results are shown as prominently as positive ones.
 *  - Every claim has a source link.
 *  - Trial numbers for Luminopia and CureSight are taken from the PubMed abstracts only.
 *  - This app is never described as fixing or healing anything.
 */

export interface Source {
  label: string;
  url: string;
}

export interface EvidenceItem {
  title: string;
  points: string[];
  sources: Source[];
}

export const SUMMARY: string[] = [
  'Amblyopia (lazy eye) is looked after by an eye doctor. The treatments with the strongest evidence are glasses first (if needed), then patching the stronger eye or atropine drops that blur it.',
  'Two-eye ("binocular" or "dichoptic") games like these are a newer idea. Each eye is shown a different part of the picture, so the brain has to use both eyes together.',
  'Two prescription products built on this idea have positive randomized trials. Simple tablet games did worse than patching, or no better than glasses alone, in several trials. Most children in those trials played far less than they were asked to.',
  'Reviews say digital binocular therapy has not been shown to be better than patching.',
  'Binocular Play itself has never been tested in a trial. It is a free set of games, not a medical device. Use it alongside what your eye doctor prescribes, never instead of it, and tell your eye doctor you are using it.',
];

export const POSITIVE: EvidenceItem[] = [
  {
    title: 'Luminopia (prescription headset, children 4 to 7)',
    points: [
      'Randomized trial of 105 children. One group used the therapy 1 hour a day, 6 days a week, and wore glasses. The other group wore glasses only.',
      'After 12 weeks the weaker eye had improved by 1.8 lines on the eye chart with the therapy and by 0.8 lines with glasses alone.',
      'No serious adverse events were reported. The study was run by the company that makes the product.',
    ],
    sources: [
      { label: 'Xiao et al., Ophthalmology 2022 (PubMed 34534556)', url: 'https://pubmed.ncbi.nlm.nih.gov/34534556/' },
      { label: 'AAO: Can VR correct lazy eye?', url: 'https://www.aao.org/eye-health/tips-prevention/virtual-reality-luminopia-lazy-eye-amblyopia' },
    ],
  },
  {
    title: 'CureSight (prescription, red-blue glasses with eye tracking, children 4 to under 9)',
    points: [
      'Randomized trial of 149 children: 75 used the binocular system for 90 minutes a day, 5 days a week; 74 were patched for 2 hours every day. Both lasted 16 weeks.',
      'The binocular group improved at least as much as the patching group ("non-inferior"). Median adherence was 94% with the system and 84% with patching.',
      'In a follow-up of 43 treated children, most of the gain was still there one year later, with a partial loss; amblyopia came back in 5 of the 27 children seen at one year.',
      'The studies were run with the company that makes the product.',
    ],
    sources: [
      { label: 'Wygnanski-Jaffe et al., Am J Ophthalmol 2025 (PubMed 39179129)', url: 'https://pubmed.ncbi.nlm.nih.gov/39179129/' },
      { label: 'One-year follow-up (PubMed 38360334)', url: 'https://pubmed.ncbi.nlm.nih.gov/38360334/' },
    ],
  },
  {
    title: 'Clinical guidelines and reviews',
    points: [
      "The American Academy of Ophthalmology's amblyopia guideline now discusses binocular digital therapy.",
      'A 2024 systematic review of 20 randomized trials (1,769 patients) called the results promising.',
    ],
    sources: [
      { label: 'AAO Amblyopia Preferred Practice Pattern', url: 'https://www.aao.org/education/preferred-practice-pattern/amblyopia-ppp-2022' },
      { label: 'Tsani et al. 2024, systematic review', url: 'https://ouci.dntb.gov.ua/works/40NpAzy9' },
    ],
  },
];

export const NEGATIVE: EvidenceItem[] = [
  {
    title: 'A falling-blocks tablet game, ages 5 to 12 (PEDIG trial)',
    points: [
      'The Pediatric Eye Disease Investigator Group compared a binocular falling-blocks game (1 hour a day) with patching (2 hours a day) in 385 children for 16 weeks.',
      'The weaker eye improved by 1.05 lines with the game and 1.35 lines with patching. The authors concluded the game was not as good as patching.',
      'Only 22% of the children played more than three quarters of the prescribed time.',
      'Children aged 5 to 6 who had never been treated improved by about 2.5 lines with the game and 2.8 lines with patching.',
      'This matters here: Binocular Play includes a falling-blocks game of the same general kind.',
    ],
    sources: [{ label: 'Holmes et al., JAMA Ophthalmol 2016 (PMC5145771)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5145771' }],
  },
  {
    title: 'The same game in teenagers (PEDIG trial)',
    points: [
      'In 100 teenagers aged 13 to 16, the game was not better than patching and was possibly worse.',
      'Only 13% completed more than three quarters of the prescribed play, so it is unclear whether the game did little or was simply not played.',
    ],
    sources: [{ label: 'Manh et al., Am J Ophthalmol 2018 (PMC6206863)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6206863' }],
  },
  {
    title: 'Other tablet-game trials reported by the American Academy of Ophthalmology',
    points: [
      'A further trial of the falling-blocks game is summarised by the AAO under the heading that the game was ineffective.',
      'A more game-like binocular adventure title showed no benefit beyond continued glasses wear in children aged 7 to 12.',
    ],
    sources: [
      { label: 'AAO: Falling-blocks video game ineffective', url: 'https://www.aao.org/editors-choice/falling-blocks-video-game-ineffective-unilateral-a' },
      { label: 'AAO EyeNet: Dig Rush binocular game', url: 'https://www.aao.org/eyenet/article/dig-rush-binocular-game-for-amblyopia' },
    ],
  },
  {
    title: 'What the big reviews conclude',
    points: [
      'A Cochrane review found too few good trials to say whether binocular treatments work better than standard treatment.',
      'A later review found no clear advantage for digital binocular therapy over patching.',
    ],
    sources: [
      { label: 'Cochrane review, binocular versus standard treatment (2022)', url: 'https://core.ac.uk/download/481629086.pdf' },
      { label: 'Review of Optometry: no clear advantage over patching', url: 'https://www.reviewofoptometry.com/article/review-finds-no-clear-advantage-for-digital-binocular-therapy-over-patching-in-amblyopia' },
    ],
  },
];

export const LESSON: EvidenceItem = {
  title: 'The lesson: a game only helps if it gets played',
  points: [
    'In the tablet-game trials above, most children played far less than they were asked to. Researchers have pointed to dull games as one reason.',
    'A small pilot study used a fast-paced action game instead, on the idea that engaging games are easier to stick with.',
    'That is why this app tries to be fun first: short rounds, several games and no pressure. It is also why we cannot promise any result.',
  ],
  sources: [
    { label: 'Gambacorta et al., Vision Res 2018: action video game pilot (PMC5984723)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5984723' },
    { label: 'AAO EyeNet: Binocular amblyopia therapies', url: 'https://aao.org/eyenet/article/binocular-amblyopia-therapies' },
  ],
};

export const ADULTS: EvidenceItem = {
  title: 'Adults and teenagers',
  points: [
    'A 2025 meta-analysis pooled 22 studies of perceptual learning and video-game training in adults, 422 people in total, and found that acuity improved on average.',
    'Training the weaker eye on its own ("monocular" training, like Letter Crowd and Stripe Finder here) did best in that analysis. Two-eye ("dichoptic") training also helped, but less.',
    'More hours of training went with bigger gains. Most of the studies were small, some very small, and most training was done in a lab with supervision.',
    'At home it has gone less well: a randomized trial of a falling-blocks game in teenagers and adults at home (BRAVO) found it no better than a placebo game.',
    'Results vary a lot between people. None of these studies tested this app.',
  ],
  sources: [
    { label: 'Ming et al., Ophthalmol Ther 2025 (PubMed 40146483)', url: 'https://pubmed.ncbi.nlm.nih.gov/40146483/' },
    { label: 'Tsirlin et al., IOVS 2015: review of adult studies (PubMed 26114483)', url: 'https://pubmed.ncbi.nlm.nih.gov/26114483/' },
    { label: 'Gao et al., BRAVO trial 2018 (PMC6584719)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6584719' },
  ],
};

/** Where each activity in the app comes from. "What studies used" only: the app never sets a dose. */
export const ACTIVITIES: EvidenceItem[] = [
  {
    title: 'Letter Crowd: crowded letters',
    points: [
      'Copies crowded-letter training: name the middle letter of a tight group, with the letters getting closer and then smaller as you get them right.',
      'In small studies of adults and older children, acuity improved and most of the gain was still there months later. A home browser version also helped, though children lost interest after about a week.',
      'What the studies used: several blocks of letters per session, over 8 to 14 sessions.',
    ],
    sources: [
      { label: 'Hussain et al., J Neurosci 2012 (PMC3428833)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3428833' },
      { label: 'Chung et al., PLoS One 2012 (PMC3340394)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3340394' },
      { label: 'Hussain et al., Front Psychol 2014: home version (PMC4217344)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4217344' },
    ],
  },
  {
    title: 'Stripe Finder: faint stripes',
    points: [
      'Copies training with faint stripes at the finest size you can just see, getting fainter as you get them right.',
      'Small studies, mostly without a comparison group, reported better contrast sensitivity and acuity. Push mode follows a two-eye version that adds noise for the stronger eye.',
      'What the studies used: about an hour of trials per session, for around 10 sessions.',
    ],
    sources: [
      { label: 'Huang et al., PNAS 2008 (PMC2268837)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2268837' },
      { label: 'Zhou et al., Vision Res 2006 (PubMed 16153674)', url: 'https://pubmed.ncbi.nlm.nih.gov/16153674/' },
    ],
  },
  {
    title: 'Depth Duel: seeing depth',
    points: [
      'Copies red-green depth training: which of two patches looks nearer?',
      'In a small study of adults, depth perception improved a lot and acuity a little. It is hidden for anyone who reported an eye turn or double vision.',
    ],
    sources: [
      { label: 'Xi et al., IOVS 2014 (PMC3989086)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3989086' },
      { label: 'Vedamurthy et al. 2016: VR depth training (PMC4901458)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4901458' },
    ],
  },
  {
    title: 'Watch: a picture split between the eyes',
    points: [
      'Copies dichoptic movies: soft patches of the picture go to the weaker eye, the rest to the stronger eye at lower brightness, and the patches move every 10 seconds.',
      'A randomized trial of a prescription headset that shows video like this to children aged 4 to 7 was positive. In trials, watching was easier to keep up than playing games.',
      'What that trial used: 1 hour a day, 6 days a week, for 12 weeks, with glasses.',
    ],
    sources: [
      { label: 'Jost et al., Sci Rep 2022: dichoptic movies (PMC8905014)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8905014' },
      { label: 'Xiao et al., Ophthalmology 2022 (PubMed 34534556)', url: 'https://pubmed.ncbi.nlm.nih.gov/34534556/' },
    ],
  },
  {
    title: 'Why the slow strong-eye brightness change is small',
    points: [
      'A trial compared raising the strong-eye brightness by 0, 5 or 10 points a day and found no difference. So the optional automatic change here is small (2 points), off unless a grown-up turns it on, and can be held.',
    ],
    sources: [{ label: 'Contrast increment trial (PMC8328197)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8328197' }],
  },
];

export const SAFETY_POINTS: EvidenceItem = {
  title: 'The main risk: double vision',
  points: [
    'Normally the brain ignores ("suppresses") part of what the weaker eye sees. Games like this work against that. In some people, especially those whose eye turns (strabismus), that can bring on double vision.',
    'A parent’s app-store review of one binocular game app describes a child who developed double vision after using it without supervision. That is a single report, not a study.',
    'That is why this app asks about eye turns and double vision before you start, asks "Do you see double?" before every session, and has an "I see double / my eyes hurt" button in every pause menu.',
    'The app cannot examine eyes and does not try to. Only an eye doctor or orthoptist can say whether these games are suitable.',
  ],
  sources: [{ label: 'AAO: Lazy eye and double vision', url: 'https://www.aao.org/eye-health/ask-eye-md-q/lazy-eye-double-vision' }],
};

export interface Treatment {
  name: string;
  what: string;
  where: string;
  evidence: string;
  sources: Source[];
}

export const TREATMENTS: Treatment[] = [
  {
    name: 'Glasses',
    what: 'Correct the focusing error first. Sometimes glasses alone are enough.',
    where: 'Prescribed by an eye doctor or optometrist.',
    evidence: 'Glasses alone resolve amblyopia in roughly a quarter to a third of patients.',
    sources: [{ label: 'ESCRS summary', url: 'https://escrs.org/channels/eurotimes-articles/amblyopia-treatment-evidence' }],
  },
  {
    name: 'Patching',
    what: 'A patch covers the stronger eye for a set number of hours each day.',
    where: 'Prescribed by an eye doctor. Patches come from pharmacies or opticians.',
    evidence: 'The standard treatment, backed by many randomized trials.',
    sources: [{ label: 'Holmes, review of amblyopia trials (PMC4549157)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4549157' }],
  },
  {
    name: 'Atropine drops',
    what: 'Eye drops that blur the stronger eye.',
    where: 'Prescription only.',
    evidence: 'Similar results to patching.',
    sources: [{ label: 'Cochrane review: patching or drops', url: 'https://www.cochrane.org/evidence/CD006460_treatment-amblyopia-lazy-eye-patching-or-dropsdrug-treatment' }],
  },
  {
    name: 'Prescription digital therapy',
    what: 'Products such as Luminopia (a headset) and CureSight (eye tracking with red-blue glasses).',
    where: 'By prescription, in some countries.',
    evidence: 'Positive randomized trials. See the evidence page.',
    sources: [
      { label: 'PubMed 34534556', url: 'https://pubmed.ncbi.nlm.nih.gov/34534556/' },
      { label: 'PubMed 39179129', url: 'https://pubmed.ncbi.nlm.nih.gov/39179129/' },
    ],
  },
];

/** Answers "is playing enough?" at the top of the Other treatments page. Describes standard care in general; never sets a dose. */
export const ENOUGH_ON_ITS_OWN = {
  question: 'Is playing these games enough on its own?',
  answer:
    'No. Binocular Play has never been tested in a trial, and simple tablet games like it did worse than patching in the largest trials. Use it only as an extra, alongside what your eye doctor prescribes.',
  alsoNeeded: [
    'An eye exam. Only an eye doctor or orthoptist can say what kind of amblyopia it is and what it needs.',
    'Glasses, if they are prescribed. Wear them as your eye doctor says, including while you play.',
    'Patching or atropine drops, if they are prescribed. These have the strongest evidence. Do not cut down on them because you are playing here.',
    'Check-ups. The eye doctor checks progress and changes the plan. Amblyopia can come back after treatment stops, so check-ups may carry on for a while.',
    'Tell your eye doctor you are using this app.',
  ],
};

export const EXERCISES_NOTE =
  'What about eye exercises? We found no strong evidence that home eye exercises help amblyopia, so this app does not suggest any. Your eye doctor or orthoptist may give you exercises: follow their plan.';

export const LEAFLETS: Source[] = [
  { label: 'Cambridge University Hospitals (NHS): amblyopia, parent information', url: 'https://cuh.nhs.uk/patient-information/amblyopia-lazy-eye-in-children-parent-information' },
  { label: 'Worcestershire NHS: treatment of amblyopia', url: 'https://www.worcsacute.nhs.uk/leaflets/treatment-of-amblyopia-lazy-eye/' },
  { label: 'National Eye Institute (US): amblyopia', url: 'https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/amblyopia-lazy-eye' },
  { label: 'American Academy of Ophthalmology: amblyopia', url: 'https://www.aao.org/eye-health/diseases/amblyopia-lazy-eye' },
  { label: 'AAPOS: amblyopia', url: 'https://aapos.org/glossary/amblyopia' },
  { label: 'MSD Manual (for professionals): amblyopia', url: 'https://www.msdmanuals.com/professional/pediatrics/eye-defects-and-conditions-in-children/amblyopia' },
];
