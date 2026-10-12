import type { Amenity, DemandDriverKind, PropertyType } from '@/domain/types';
import {
  Armchair,
  Briefcase,
  Building2,
  CalendarDays,
  Car,
  ChefHat,
  GraduationCap,
  PawPrint,
  Plane,
  PlugZap,
  Shield,
  Snowflake,
  Stethoscope,
  Sun,
  Trees,
  Trophy,
  WashingMachine,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  'single-family': 'Single-family',
  townhouse: 'Townhouse',
  duplex: 'Duplex',
  adu: 'ADU',
  condo: 'Condo',
};

export const AMENITY_META: Record<Amenity, { label: string; icon: LucideIcon }> = {
  parking: { label: 'Parking', icon: Car },
  laundry: { label: 'Laundry', icon: WashingMachine },
  'full-kitchen': { label: 'Full kitchen', icon: ChefHat },
  workspace: { label: 'Workspace', icon: Briefcase },
  yard: { label: 'Yard', icon: Trees },
  'air-conditioning': { label: 'Air conditioning', icon: Snowflake },
  'ev-charging': { label: 'EV charging', icon: PlugZap },
  'pet-friendly': { label: 'Pet friendly', icon: PawPrint },
  'fast-wifi': { label: 'Fast Wi-Fi', icon: Wifi },
  'porch-patio': { label: 'Porch / patio', icon: Armchair },
};

export const DRIVER_KIND_ICON: Record<DemandDriverKind, LucideIcon> = {
  university: GraduationCap,
  medical: Stethoscope,
  corporate: Building2,
  events: CalendarDays,
  tourism: Sun,
  military: Shield,
  airport: Plane,
  sports: Trophy,
};
