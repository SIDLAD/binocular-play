/**
 * Visual-angle maths for the training tasks. Pure, no DOM.
 *
 * The screen-size check stores CSS px per mm (matched against a bank card, 85.6 mm wide)
 * and the viewing distance. From these: px per degree of visual angle.
 */
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;
/** CSS reference pixel: 96 per inch. Used when the screen has not been checked. */
export const DEFAULT_PX_PER_MM = 96 / 25.4;
/** Typical phone estimate, used only until the check is done. */
export const PHONE_PX_PER_MM = 6.3;

export interface DisplayCheck {
  /** CSS px per mm. */
  pxPerMm: number;
  viewingDistanceCm: number;
  /** ISO date, or null when nothing was measured. */
  checkedAt: string | null;
}

/** CSS px per mm from the matched card width in CSS px. */
export function pxPerMmFromCard(cardWidthPx: number): number {
  return cardWidthPx / CARD_WIDTH_MM;
}

/** Logical (CSS) px per degree: the width on screen of one degree, centred on the line of sight. */
export function pxPerDegree(pxPerMm: number, viewingDistanceCm: number): number {
  const mm = 2 * viewingDistanceCm * 10 * Math.tan((0.5 * Math.PI) / 180);
  return mm * pxPerMm;
}

export function arcminToPx(arcmin: number, pxPerDeg: number): number {
  return (arcmin / 60) * pxPerDeg;
}

export function pxToArcmin(px: number, pxPerDeg: number): number {
  return (px / pxPerDeg) * 60;
}

/** Arcseconds of disparity for a shift of `devicePx` device pixels. */
export function devicePxToArcsec(devicePx: number, devicePxPerDeg: number): number {
  return (devicePx / devicePxPerDeg) * 3600;
}

/** Highest grating frequency the screen can draw with at least `minPxPerCycle` device px per cycle. */
export function maxCyclesPerDegree(devicePxPerDeg: number, minPxPerCycle = 4): number {
  return devicePxPerDeg / minPxPerCycle;
}

/** Suggested viewing distance when none is set: 50 cm on a phone-sized screen, 60 cm otherwise. */
export function defaultViewingDistanceCm(screenMinSidePx: number): number {
  return screenMinSidePx < 600 ? 50 : 60;
}

export function displayInfo(check: DisplayCheck | null, devicePixelRatio: number, screenMinSidePx: number) {
  // Phones put about 6.3 CSS px in a mm (about 160 per inch); desktops about 3.8.
  const pxPerMm = check?.pxPerMm ?? (screenMinSidePx < 600 ? PHONE_PX_PER_MM : DEFAULT_PX_PER_MM);
  const distance = check?.viewingDistanceCm ?? defaultViewingDistanceCm(screenMinSidePx);
  const ppd = pxPerDegree(pxPerMm, distance);
  return {
    pxPerDegree: ppd,
    devicePxPerDegree: ppd * devicePixelRatio,
    measured: !!check?.checkedAt,
    viewingDistanceCm: distance,
  };
}
