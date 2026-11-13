/**
 * How many trials a training block lasts. Each training task offers a few lengths; the
 * player's pick is kept per profile and per game. Short blocks are for days when a task
 * is hard going: the task still runs, but its level only settles over longer blocks.
 */
export interface BlockLengths {
  /** The lengths offered on the start card, shortest first. */
  choices: readonly number[];
  /** The length when nothing has been picked (the task's original block). */
  default: number;
}

/** The stored pick if it is still one of the choices, else the task's default. */
export function blockTrialsFor(spec: BlockLengths, stored: number | undefined): number {
  return typeof stored === 'number' && spec.choices.includes(stored) ? stored : spec.default;
}

/**
 * How much a task backs off (makes it easier) at the start of the next block, so a block
 * starts a little below the level reached. A short block moves the staircase only a few
 * steps, so a full back-off would make every short block easier than the last.
 */
export function startBackOff(full: number, blockTrials: number, longBlock = 20): number {
  if (blockTrials >= longBlock) return full;
  return 1 + ((full - 1) * Math.max(0, blockTrials)) / (2 * longBlock);
}
