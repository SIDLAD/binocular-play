import type { GameAction, GameInput } from './api';

const KEYS: Record<string, GameAction> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'primary',
  Enter: 'secondary',
  KeyX: 'secondary',
};

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
}

/** Maps keys to game actions. `enabled()` lets the caller mute input while a menu is open. */
export function bindKeyboard(send: (e: GameInput) => void, enabled: () => boolean): () => void {
  const down = new Set<GameAction>();
  const onDown = (e: KeyboardEvent) => {
    const letter = /^Key([A-Z])$/.exec(e.code);
    if (letter && !e.repeat && enabled() && !isTyping(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      send({ kind: 'key', key: letter[1] });
    }
    const action = KEYS[e.code];
    if (!action || !enabled() || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    // A focused button would also "click" on space or enter: the game owns these keys while playing.
    e.preventDefault();
    if (e.repeat || down.has(action)) return;
    down.add(action);
    send({ kind: 'action', action, pressed: true });
  };
  const onUp = (e: KeyboardEvent) => {
    const action = KEYS[e.code];
    if (!action || !down.has(action)) return;
    down.delete(action);
    send({ kind: 'action', action, pressed: false });
  };
  const releaseAll = () => {
    for (const action of down) send({ kind: 'action', action, pressed: false });
    down.clear();
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', releaseAll);
  return () => {
    releaseAll();
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', releaseAll);
  };
}

/** Sends raw pointer positions in the canvas's logical pixels. Each game gives them its own meaning. */
export function bindPointer(canvas: HTMLCanvasElement, send: (e: GameInput) => void, enabled: () => boolean): () => void {
  let active: number | null = null;
  const point = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onDown = (e: PointerEvent) => {
    if (!enabled() || active !== null) return;
    active = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* not supported */
    }
    e.preventDefault();
    send({ kind: 'pointer', phase: 'down', ...point(e) });
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    send({ kind: 'pointer', phase: 'move', ...point(e) });
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    active = null;
    send({ kind: 'pointer', phase: 'up', ...point(e) });
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  };
}
