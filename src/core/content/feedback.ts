/**
 * Feedback goes to GitHub issues. The app has no backend, so it never sends anything itself:
 * it builds a "new issue" link with the form already filled in, and the person presses
 * Submit on GitHub (which needs a free GitHub account).
 */
export const REPO_URL = 'https://github.com/SIDLAD/binocular-play';
export const ISSUES_URL = `${REPO_URL}/issues`;

export type FeedbackKind = 'problem' | 'colours' | 'idea';

export const FEEDBACK_KINDS: { id: FeedbackKind; label: string; template: string; prefix: string }[] = [
  { id: 'problem', label: 'Something isn’t working', template: 'problem.yml', prefix: '[Problem]' },
  { id: 'colours', label: 'Colours or glasses trouble', template: 'colours.yml', prefix: '[Colours]' },
  { id: 'idea', label: 'Idea or wish', template: 'idea.yml', prefix: '[Idea]' },
];

export interface Feedback {
  kind: FeedbackKind;
  /** Short summary, used as the issue title. */
  summary: string;
  /** The main text. */
  what: string;
  /** Game or page name, or '' . */
  game: string;
  /** Glasses description (colours form only), or ''. */
  glasses: string;
  /** Set-up lines the person chose to include, or ''. */
  setup: string;
}

/** Long texts are cut so the link stays well under browser and GitHub URL limits. */
export const MAX_FIELD = 2000;

function cut(s: string, max = MAX_FIELD): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** The GitHub "new issue" link with the issue form fields filled in (field ids match `.github/ISSUE_TEMPLATE`). */
export function feedbackIssueUrl(f: Feedback): string {
  const kind = FEEDBACK_KINDS.find((k) => k.id === f.kind) ?? FEEDBACK_KINDS[0];
  const params = new URLSearchParams();
  params.set('template', kind.template);
  const summary = cut(f.summary, 120) || cut(f.what, 60).split('\n')[0];
  params.set('title', `${kind.prefix} ${summary}`.trim());
  params.set('what', cut(f.what));
  if (kind.id === 'colours') {
    if (f.glasses.trim()) params.set('glasses', cut(f.glasses, 200));
  } else if (f.game.trim()) {
    params.set('game', cut(f.game, 200));
  }
  if (kind.id !== 'idea' && f.setup.trim()) params.set('setup', cut(f.setup, 600));
  return `${ISSUES_URL}/new?${params.toString()}`;
}

/** The same feedback as plain text, to paste into an email, a chat or an AI assistant. */
export function feedbackText(f: Feedback): string {
  const kind = FEEDBACK_KINDS.find((k) => k.id === f.kind) ?? FEEDBACK_KINDS[0];
  const lines = [`Binocular Play feedback: ${kind.label}`];
  if (f.summary.trim()) lines.push(`Summary: ${f.summary.trim()}`);
  if (f.game.trim()) lines.push(`Game or page: ${f.game.trim()}`);
  if (f.glasses.trim()) lines.push(`Glasses: ${f.glasses.trim()}`);
  lines.push('', f.what.trim());
  if (f.setup.trim()) lines.push('', 'Set-up:', f.setup.trim());
  lines.push('', `Report it at: ${ISSUES_URL}/new/choose`);
  return lines.join('\n');
}

/** Facts about the device and glasses settings. No names, ages, eyes or progress. */
export function setupLines(info: {
  glasses?: string;
  background?: string;
  screen: string;
  pixelRatio: number;
  browser: string;
  installed: boolean;
}): string {
  const lines: string[] = [];
  if (info.glasses) lines.push(`Glasses setting: ${info.glasses}`);
  if (info.background) lines.push(`Background: ${info.background}`);
  lines.push(`Screen: ${info.screen} (pixel ratio ${Math.round(info.pixelRatio * 100) / 100})`);
  lines.push(`Browser: ${info.browser}`);
  lines.push(`Installed app: ${info.installed ? 'yes' : 'no'}`);
  return lines.join('\n');
}
