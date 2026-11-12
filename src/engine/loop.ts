export const STEP_MS = 1000 / 60;
const MAX_CATCH_UP_MS = 250;

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

/**
 * Fixed-step loop: `step` always gets exactly 1/60 s, however fast the screen refreshes,
 * and `render` runs once per animation frame. After a long stall (a hidden tab) at most
 * a quarter of a second is caught up, so the game never lurches forward.
 */
// Test environments without animation frames fall back to a timer.
const raf: (cb: (now: number) => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
const caf: (handle: number) => void =
  typeof cancelAnimationFrame === 'function' ? (handle) => cancelAnimationFrame(handle) : (handle) => clearTimeout(handle);

export function createLoop(step: (dtMs: number) => void, render: () => void): Loop {
  let handle = 0;
  let running = false;
  let last = 0;
  let acc = 0;

  const frame = (now: number) => {
    if (!running) return;
    acc += Math.min(MAX_CATCH_UP_MS, Math.max(0, now - last));
    last = now;
    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      step(STEP_MS);
      if (!running) return;
    }
    render();
    handle = raf(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      acc = 0;
      last = performance.now();
      handle = raf(frame);
    },
    stop() {
      running = false;
      caf(handle);
    },
    get running() {
      return running;
    },
  };
}
