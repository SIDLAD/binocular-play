/**
 * Split Lines: reading with the words split between the eyes.
 *
 * Every other word goes to the weaker eye; the rest to the stronger eye, so neither eye
 * alone can read the line. Dichoptic reading has only been tried in a feasibility study
 * (Dranitsaris 2026), so this is offered for comfort and practice, not as a tested treatment.
 */
export type Eye = 'weakEye' | 'fellowEye';

export interface Placed {
  word: string;
  x: number;
  eye: Eye;
}

export type Line = Placed[];
export type Page = Line[];

export const MIN_FONT = 16;
export const MAX_FONT = 48;
export const START_FONT = 24;

/** Words, with '\n' standing for a paragraph break. */
export function tokenise(text: string): string[] {
  const out: string[] = [];
  const paragraphs = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  paragraphs.forEach((p, i) => {
    const words = p.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return;
    if (i > 0 && out.length > 0) out.push('\n');
    out.push(...words);
  });
  return out;
}

/**
 * Lays the words out in pages. `measure` gives a word's width; the eye alternates on every
 * word through the whole text, so it carries over from one line to the next.
 */
export function paginate(words: string[], measure: (s: string) => number, maxWidth: number, linesPerPage: number): Page[] {
  const space = measure(' ');
  const pages: Page[] = [];
  let page: Page = [];
  let line: Line = [];
  let x = 0;
  let n = 0;
  const pushLine = () => {
    page.push(line);
    line = [];
    x = 0;
    if (page.length >= Math.max(1, linesPerPage)) {
      pages.push(page);
      page = [];
    }
  };
  for (const w of words) {
    if (w === '\n') {
      if (line.length > 0) pushLine();
      if (page.length > 0) pushLine(); // blank line between paragraphs
      continue;
    }
    const width = measure(w);
    if (line.length > 0 && x + space + width > maxWidth) pushLine();
    if (line.length > 0) x += space;
    line.push({ word: w, x, eye: n % 2 === 0 ? 'weakEye' : 'fellowEye' });
    x += width;
    n++;
  }
  if (line.length > 0) pushLine();
  if (page.length > 0) pages.push(page);
  // Drop blank lines at the top of a page.
  return pages.map((p) => {
    let i = 0;
    while (i < p.length && p[i].length === 0) i++;
    return p.slice(i);
  }).filter((p) => p.length > 0);
}

/** Built-in passages, written for this app. Plain, calm, adult-friendly. */
export const PASSAGES: { title: string; text: string }[] = [
  {
    title: 'The lighthouse keeper',
    text: `The lighthouse stood on a rock at the end of a long, narrow path. Every evening the keeper climbed the spiral stairs, one hundred and twelve of them, and lit the great lamp at the top.

From up there she could see the whole bay. Fishing boats came home in a slow line, their engines humming. Gulls settled on the harbour wall. The sky turned from blue to orange to a deep, quiet grey.

She kept a notebook by the window. In it she wrote the weather, the boats she saw, and anything unusual: a seal on the rocks, a ship with red sails, a night so still that the sea looked like glass. Over the years the notebook filled up, then another, and another. Together they told the story of the bay better than any map.`,
  },
  {
    title: 'Bread on a slow morning',
    text: `Making bread is mostly waiting. You mix flour, water, salt and a little yeast, and then you leave it alone.

While it rests, the dough changes. It grows soft and smooth. Tiny bubbles form inside it. When you press it with a finger, the dent fills back in slowly, like a pillow.

Then you shape it, let it rise once more, and bake it in a hot oven. The kitchen fills with a warm smell that drifts out into the hall. When the loaf comes out, it crackles quietly as it cools. It is hard to wait, but the bread tastes better if you do.`,
  },
  {
    title: 'The river in four seasons',
    text: `In winter the river runs dark and fast. Ice gathers at the edges, and the willows hang bare over the water.

In spring the banks turn green almost overnight. Ducks lead lines of ducklings along the shallows, and the first swallows skim the surface for insects.

Summer brings slow, warm days. Children paddle at the shallow bend, and a heron stands perfectly still, waiting for a fish to pass.

In autumn the leaves fall and float downstream like small boats. Mist rises from the water in the early morning, and the river seems to breathe.`,
  },
];
