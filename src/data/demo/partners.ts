import type { Partner, PartnerId } from '@/domain/types';

/** Fictional partners — simulated identities for demo collaboration only. */
export const PARTNERS: Record<PartnerId, Partner> = {
  'partner-a': {
    id: 'partner-a',
    name: 'Joe',
    initials: 'JO',
    focus: 'Underwriting & finance',
  },
  'partner-b': {
    id: 'partner-b',
    name: 'Deffy',
    initials: 'DE',
    focus: 'Markets & landlord relations',
  },
};

export const PARTNER_LIST: Partner[] = [PARTNERS['partner-a'], PARTNERS['partner-b']];
