/** A tiny DOM helper. No framework. */

export type Child = Node | string | number | null | undefined | false;
type Handler = (e: never) => void;
export type Props = Record<string, string | number | boolean | null | undefined | Handler>;

const PROPERTY_KEYS = new Set([
  'value',
  'checked',
  'disabled',
  'type',
  'href',
  'id',
  'min',
  'max',
  'step',
  'placeholder',
  'htmlFor',
  'title',
  'tabIndex',
  'hidden',
  'name',
  'target',
  'rel',
  'maxLength',
  'inputMode',
  'accept',
  'open',
  'autocomplete',
]);

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = String(value);
      else if (typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (PROPERTY_KEYS.has(key)) {
        (el as unknown as Record<string, unknown>)[key] = value;
      } else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: (Child | Child[])[]): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export type ButtonKind = 'primary' | 'plain' | 'quiet' | 'warn';

export function button(
  label: Child | Child[],
  onClick: () => void,
  kind: ButtonKind = 'plain',
  props: Props = {},
): HTMLButtonElement {
  const extra = typeof props.class === 'string' ? ` ${props.class}` : '';
  return h(
    'button',
    { ...props, type: 'button', class: `btn btn-${kind}${extra}`, onClick: () => onClick() },
    label,
  );
}

export function link(label: Child | Child[], href: string, className = ''): HTMLAnchorElement {
  return h('a', { href, class: className }, label);
}

/** A link that leaves the app: opens in a new tab and never passes a referrer. */
export function externalLink(label: string, url: string): HTMLAnchorElement {
  return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'external' }, label);
}

/** Collects clean-up functions for one screen or one overlay. */
export class Scope {
  private fns: (() => void)[] = [];
  private done = false;

  onDispose(fn: () => void): void {
    if (this.done) fn();
    else this.fns.push(fn);
  }

  dispose(): void {
    if (this.done) return;
    this.done = true;
    for (const fn of this.fns.splice(0).reverse()) {
      try {
        fn();
      } catch {
        /* a failed clean-up must not stop the others */
      }
    }
  }

  /** A child scope that is also disposed when this one is. */
  child(): Scope {
    const c = new Scope();
    this.onDispose(() => c.dispose());
    return c;
  }
}

export function prefersReducedMotion(setting: 'system' | 'on' | 'off'): boolean {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse =
    typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
  return coarse || window.innerWidth < 700;
}
