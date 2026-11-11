import type { Profile, Screening } from '../settings/schema';

/**
 * Onboarding and the double-vision screening questions.
 * These are self-report questions only. Nothing here is a diagnosis.
 */
export type OnboardingStep =
  | 'disclaimer'
  | 'who'
  | 'screening'
  | 'doctor'
  | 'glasses'
  | 'lens'
  | 'weak'
  | 'calibration'
  | 'contrast'
  | 'done';

export function screeningAnswered(s: Screening): boolean {
  return s.eyeTurn !== null && s.everDouble !== null && s.clinicianOk !== null;
}

/** "Yes" to an eye turn or to past double vision. */
export function hasRiskFlag(s: Screening): boolean {
  return s.eyeTurn === true || s.everDouble === true;
}

/** The "talk to your eye doctor first" screen is shown for a risk flag or when no clinician has said OK. */
export function needsDoctorScreen(s: Screening): boolean {
  return hasRiskFlag(s) || s.clinicianOk === false;
}

/** Play is allowed only when all questions are answered and any risk flag has a parent's confirmation. */
export function screeningCleared(s: Screening): boolean {
  if (!screeningAnswered(s)) return false;
  return !hasRiskFlag(s) || s.parentConfirmedAt !== null;
}

export type OnboardingAction =
  | { type: 'acceptDisclaimer' }
  | { type: 'answerScreening'; eyeTurn: boolean; everDouble: boolean; clinicianOk: boolean }
  /** Only dispatched after the parent gate AND the "an eye doctor has said these games are OK" tick. */
  | { type: 'parentConfirm' }
  | { type: 'complete' };

/** Mutates a draft profile. `complete` is ignored unless every earlier condition holds. */
export function applyOnboarding(p: Profile, action: OnboardingAction, now: Date): void {
  const ob = p.onboarding;
  const iso = now.toISOString();
  switch (action.type) {
    case 'acceptDisclaimer':
      ob.disclaimerAcceptedAt = ob.disclaimerAcceptedAt ?? iso;
      break;
    case 'answerScreening':
      ob.screening = {
        eyeTurn: action.eyeTurn,
        everDouble: action.everDouble,
        clinicianOk: action.clinicianOk,
        // New answers always need a new confirmation.
        parentConfirmedAt: null,
      };
      ob.completedAt = null;
      break;
    case 'parentConfirm':
      if (screeningAnswered(ob.screening)) ob.screening.parentConfirmedAt = iso;
      break;
    case 'complete':
      if (ob.disclaimerAcceptedAt !== null && screeningCleared(ob.screening)) ob.completedAt = iso;
      break;
  }
}

/** Where onboarding resumes after a reload. */
export function firstIncompleteStep(p: Profile | null): OnboardingStep {
  if (!p || p.onboarding.disclaimerAcceptedAt === null) return 'disclaimer';
  const s = p.onboarding.screening;
  if (!screeningAnswered(s)) return 'screening';
  if (!screeningCleared(s)) return 'doctor';
  if (p.onboarding.completedAt === null) return 'glasses';
  return 'done';
}
