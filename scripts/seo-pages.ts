// Build step: plain HTML pages that search engines can read without running the app.
// The app itself uses hash routes (#/evidence), which Google treats as one page, so the
// evidence, the other treatments and the activity list would never be indexed on their own.
// These pages are generated from the same content modules the app shows, so they cannot
// drift. They load no scripts, set no cookies and link back into the app.
import type { Plugin } from 'vite';
import { DISCLAIMER_SHORT, FREE_PROMISE, PRIVACY_LINE } from '../src/core/content/copy';
import {
  ACTIVITIES,
  ADULTS,
  ENOUGH_ON_ITS_OWN,
  EXERCISES_NOTE,
  LEAFLETS,
  LESSON,
  NEGATIVE,
  POSITIVE,
  SAFETY_POINTS,
  SUMMARY,
  TREATMENTS,
  type EvidenceItem,
  type Source,
} from '../src/core/content/evidence';

export const SITE_URL = 'https://sidlad.github.io/binocular-play/';

export interface ActivityInfo {
  title: string;
  blurb: string;
  group: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sourcesHtml = (list: Source[]) =>
  `<p class="sources">Sources: ${list.map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>`;

const itemHtml = (e: EvidenceItem) =>
  `<div class="item"><h3>${esc(e.title)}</h3><ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>${sourcesHtml(e.sources)}</div>`;

const list = (items: string[]) => `<ul>${items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;

const STYLE = `:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101010;color:#e8e8e8;font:17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:860px;margin:0 auto;padding:20px 16px 48px}header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:8px}
.brand{font-weight:700;color:#fff;text-decoration:none;font-size:20px}a{color:#9fc4ff}h1{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:16px 0}
h2{margin-top:32px}.notice{border:1px solid #3a3a3a;border-radius:12px;padding:4px 18px;background:#181818}.sources{font-size:14px;color:#b0b0b0}
.cta{display:inline-block;background:#f0f0f0;color:#101010;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none}
table{border-collapse:collapse;width:100%}th,td{border-top:1px solid #333;padding:8px;text-align:left;vertical-align:top}.table{overflow-x:auto}
footer{margin-top:40px;border-top:1px solid #333;padding-top:12px;font-size:15px;color:#b0b0b0}footer nav{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:8px}`;

function shell(opts: { path: string; title: string; description: string; body: string; jsonLd?: object }): string {
  const url = SITE_URL + opts.path;
  const ld = opts.jsonLd ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Binocular Play">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:url" content="${url}">
<link rel="icon" href="data:,">
<style>${STYLE}</style>
${ld}
</head>
<body>
<div class="wrap">
<header><a class="brand" href="../">Binocular Play</a><a class="cta" href="../">Open the app</a></header>
<main>
${opts.body}
</main>
<footer>
<nav aria-label="About"><a href="../about/">About</a><a href="../evidence/">Is this real? The evidence</a><a href="../treatments/">Other treatments</a><a href="https://github.com/SIDLAD/binocular-play">Source code</a></nav>
<p>${esc(DISCLAIMER_SHORT)}</p>
<p>${esc(`${FREE_PROMISE} ${PRIVACY_LINE} Open source, MIT licence.`)}</p>
</footer>
</div>
</body>
</html>
`;
}

const GROUP_LABEL: Record<string, string> = {
  training: 'Training tasks',
  watch: 'Watch',
  games: 'Games',
  reading: 'Reading',
};

export function aboutPage(activities: ActivityInfo[]): string {
  const groups = [...new Set(activities.map((a) => a.group))];
  const body = `<h1>Two-eye games for amblyopia (lazy eye), free in your browser</h1>
<p>Binocular Play is a free, open-source collection of dichoptic games and training tasks. You play them wearing red/blue (anaglyph) 3D glasses. Each eye sees different parts of the screen, so you need both eyes working together to play.</p>
<div class="notice"><p><strong>Not a medical device.</strong> ${esc(DISCLAIMER_SHORT)}</p></div>
<h2>How it works</h2>
<ul>
<li>The red lens lets one eye see the red shapes. The blue (or cyan, or green) lens lets the other eye see the blue shapes. White shapes are seen by both.</li>
<li>The weaker eye gets the things you must follow to play: the ball, the falling piece, the target. The stronger eye gets the rest, dimmed so it does not take over.</li>
<li>Colours are calibrated for your own glasses and screen, and you can change them any time.</li>
<li>Safety checks for double vision before every session, break reminders and nothing that flashes.</li>
</ul>
<h2>The activities</h2>
${groups
  .map(
    (g) =>
      `<h3>${esc(GROUP_LABEL[g] ?? g)}</h3><ul>${activities
        .filter((a) => a.group === g)
        .map((a) => `<li><strong>${esc(a.title)}</strong>: ${esc(a.blurb)}</li>`)
        .join('')}</ul>`,
  )
  .join('\n')}
<h2>Private by design</h2>
<p>${esc(PRIVACY_LINE)} Several players can share one device, each with their own settings and progress. Progress can be exported as a file. It works on phones, tablets and computers, with touch, mouse or keyboard, and can be installed to work offline.</p>
<h2>Does it work?</h2>
<p>Some trials of games like these were positive and some were not. Read both before you start: <a href="../evidence/">Is this real? The evidence</a>. Then see <a href="../treatments/">the treatments eye doctors use</a>, which this app does not replace.</p>
<p><a class="cta" href="../">Open Binocular Play</a></p>`;
  return shell({
    path: 'about/',
    title: 'Binocular Play: free two-eye (dichoptic) games for amblyopia',
    description:
      'Free, open-source red/blue anaglyph games and training tasks for people with amblyopia (lazy eye). Runs in the browser, no account. Not a medical device.',
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Binocular Play',
      url: SITE_URL,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any (web browser)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: 'Free, open-source dichoptic (red/blue anaglyph) games for amblyopia. Not a medical device.',
      license: 'https://opensource.org/licenses/MIT',
    },
  });
}

export function evidencePage(): string {
  const body = `<h1>Is this real? The evidence on two-eye games for amblyopia</h1>
<div class="notice"><h2>The honest summary</h2>${list(SUMMARY)}</div>
<section><h2>Trials where games like these did not do well</h2>${NEGATIVE.map(itemHtml).join('')}</section>
<section><h2>Trials with positive results</h2>${POSITIVE.map(itemHtml).join('')}${itemHtml(ADULTS)}</section>
<section><h2>Where each activity comes from</h2><p>Each activity copies the design of a published study. That is not the same as being tested: this app has not been.</p>${ACTIVITIES.map(itemHtml).join('')}</section>
<section><h2>Why engagement matters</h2>${itemHtml(LESSON)}</section>
<section><h2>Safety</h2>${itemHtml(SAFETY_POINTS)}</section>
<p><a href="../treatments/">Other treatments your eye doctor may use</a></p>`;
  return shell({
    path: 'evidence/',
    title: 'Do dichoptic games work for amblyopia? The trials, good and bad | Binocular Play',
    description:
      'A plain summary of the clinical trials of binocular (dichoptic) games for lazy eye, including the negative results, with links to every source.',
    body,
  });
}

export function treatmentsPage(): string {
  const rows = TREATMENTS.map(
    (t) =>
      `<tr><td><strong>${esc(t.name)}</strong></td><td>${esc(t.what)}</td><td>${esc(t.where)}</td><td>${esc(t.evidence)} ${t.sources
        .map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`)
        .join(' · ')}</td></tr>`,
  ).join('');
  const body = `<h1>Amblyopia (lazy eye) treatments</h1>
<div class="notice"><h2>${esc(ENOUGH_ON_ITS_OWN.question)}</h2><p>${esc(ENOUGH_ON_ITS_OWN.answer)}</p><p><strong>What else is needed:</strong></p>${list(ENOUGH_ON_ITS_OWN.alsoNeeded)}</div>
<p>These are the treatments eye doctors use for amblyopia. Binocular Play is not one of them and does not replace any of them.</p>
<div class="table"><table><thead><tr><th>Treatment</th><th>What it is</th><th>Where you get it</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>${esc(EXERCISES_NOTE)}</p>
<h2>Good plain-language guides</h2>
<ul>${LEAFLETS.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
<p>Treatment works best when it starts early in childhood, so do not wait: see an eye doctor.</p>`;
  return shell({
    path: 'treatments/',
    title: 'Amblyopia (lazy eye) treatments: glasses, patching, drops, games | Binocular Play',
    description:
      'The treatments eye doctors use for amblyopia, what each one is and what the evidence says, with links to plain-language guides.',
    body,
  });
}

export const SEO_PATHS = ['', 'about/', 'evidence/', 'treatments/'];

export function sitemap(lastmod: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SEO_PATHS.map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export const ROBOTS = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`;

/** Vite plugin: writes the pages above into the build output. */
export function seoPages(activities: () => Promise<ActivityInfo[]>): Plugin {
  return {
    name: 'binocular-play-seo-pages',
    apply: 'build',
    async generateBundle() {
      const emit = (fileName: string, source: string) => this.emitFile({ type: 'asset', fileName, source });
      emit('about/index.html', aboutPage(await activities()));
      emit('evidence/index.html', evidencePage());
      emit('treatments/index.html', treatmentsPage());
      emit('sitemap.xml', sitemap(new Date().toISOString().slice(0, 10)));
      emit('robots.txt', ROBOTS);
    },
  };
}
