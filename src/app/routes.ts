import type { Screen } from './router';
import { coloursScreen } from './screens/colours';
import { evidenceScreen, treatmentsScreen } from './screens/evidence';
import { homeScreen } from './screens/home';
import { onboardingScreen } from './screens/onboarding';
import { parentScreen } from './screens/parent';
import { playScreen } from './screens/play';
import { profilesScreen } from './screens/profiles';
import { settingsScreen } from './screens/settings';
import { stoppedScreen } from './screens/stopped';

export const ROUTES: Record<string, Screen> = {
  '/': homeScreen,
  '/onboarding': onboardingScreen,
  '/play/:id': playScreen,
  '/colours': coloursScreen,
  '/settings': settingsScreen,
  '/profiles': profilesScreen,
  '/parent': parentScreen,
  '/evidence': evidenceScreen,
  '/treatments': treatmentsScreen,
  '/stopped': stoppedScreen,
};

/** Reachable before onboarding is finished: the evidence must never be locked away. */
export const OPEN_ROUTES = ['/onboarding', '/evidence', '/treatments', '/profiles'];
