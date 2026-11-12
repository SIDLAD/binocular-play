import type { EvidenceBadge } from '../../engine/api';

/** Short, honest labels. "Trial-tested design" means a design like this was tested, not this app. */
export function evidenceBadgeLabel(b: EvidenceBadge): string {
  switch (b) {
    case 'trial':
      return 'Trial-tested design';
    case 'small':
      return 'Small studies';
    case 'untested':
      return 'Not tested';
  }
}
