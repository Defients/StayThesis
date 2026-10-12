import type {
  ConfidenceLevel,
  MarketStatus,
  RegulatoryStatus,
} from '@/domain/types';
import type { StatusTone } from '@/components/ui/StatusPill';

export const STATUS_TONE: Record<MarketStatus, StatusTone> = {
  'active-research': 'cyan',
  watchlist: 'violet',
  paused: 'neutral',
};

export const STATUS_LABEL: Record<MarketStatus, string> = {
  'active-research': 'Active research',
  watchlist: 'Watchlist',
  paused: 'Paused',
};

export const REGULATORY_TONE: Record<RegulatoryStatus, StatusTone> = {
  'permit-required': 'cyan',
  'registration-required': 'neutral',
  restricted: 'critical',
  unclear: 'warning',
};

export const REGULATORY_LABEL: Record<RegulatoryStatus, string> = {
  'permit-required': 'Permit required',
  'registration-required': 'Registration',
  restricted: 'Restricted',
  unclear: 'Unclear',
};

export const CONFIDENCE_TONE: Record<ConfidenceLevel, StatusTone> = {
  high: 'positive',
  medium: 'neutral',
  low: 'warning',
};
