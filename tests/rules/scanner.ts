/** Source scanner for hard rule 1: no raw colour and no canvas/DOM access under src/games/. */

const CSS_COLOUR_NAMES = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
  'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'transparent', 'turquoise', 'violet', 'wheat',
  'white', 'whitesmoke', 'yellow', 'yellowgreen', 'currentcolor',
];

const HEX_COLOUR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/;
const COLOUR_NAME = new RegExp(`(['"\`])(?:${CSS_COLOUR_NAMES.join('|')})\\1`, 'i');
const BANNED_IDENTIFIERS = [
  'fillStyle',
  'strokeStyle',
  'getContext',
  'shadowColor',
  'createLinearGradient',
  'createRadialGradient',
  'CanvasRenderingContext2D',
  'document.',
  '.style.',
  'Math.random',
];
const IMPORT_SOURCE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g;
const OWN_FILE = /^\.\/(?!.*\.\.)[\w\-./]+$/;
const ENGINE_API = /^(?:\.\.\/)+engine\/api$/;

export interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

export function scanGameSource(file: string, source: string): Violation[] {
  const out: Violation[] = [];
  const isTest = /\.test\.ts$/.test(file);
  const add = (line: number, rule: string, text: string) =>
    out.push({ file, line: line + 1, rule, text: text.trim().slice(0, 120) });

  if (!/\.ts$/.test(file)) {
    out.push({ file, line: 0, rule: 'only .ts files are allowed under src/games', text: '' });
    return out;
  }

  source.split(/\r?\n/).forEach((text, i) => {
    if (HEX_COLOUR.test(text)) add(i, 'hex colour', text);
    if (COLOUR_FUNCTION.test(text)) add(i, 'colour function', text);
    if (COLOUR_NAME.test(text)) add(i, 'CSS colour name', text);
    for (const id of BANNED_IDENTIFIERS) {
      if (text.includes(id)) add(i, `banned identifier ${id}`, text);
    }
    for (const m of text.matchAll(IMPORT_SOURCE)) {
      const src = m[2];
      const allowed = OWN_FILE.test(src) || ENGINE_API.test(src) || (isTest && src === 'vitest');
      if (!allowed) add(i, `import from "${src}"`, text);
    }
  });
  return out;
}
