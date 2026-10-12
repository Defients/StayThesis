import type { Partner, PartnerId } from '@/domain/types';

/** Fictional partners — simulated identities for demo collaboration only. */
export const PARTNERS: Record<PartnerId, Partner> = {
  'partner-a': {
    id: 'partner-a',
    name: 'Alex Morgan',
    initials: 'AM',
    focus: 'Underwriting & finance',
  },
  'partner-b': {
    id: 'partner-b',
    name: 'Sam Rivera',
    initials: 'SR',
    focus: 'Markets & landlord relations',
  },
};

export const PARTNER_LIST: Partner[] = [PARTNERS['partner-a'], PARTNERS['partner-b']];
