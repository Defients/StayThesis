import {
  Building2,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  Radar,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** Eyebrow number shown in the sidebar. */
  index: string;
  label: string;
  /** Compact label for the mobile tab bar. */
  short: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    index: '01',
    label: 'Command Center',
    short: 'Home',
    to: '/',
    icon: LayoutDashboard,
    end: true,
  },
  {
    index: '02',
    label: 'Market Intelligence',
    short: 'Markets',
    to: '/markets',
    icon: Radar,
  },
  {
    index: '03',
    label: 'Property Explorer',
    short: 'Properties',
    to: '/properties',
    icon: Building2,
  },
  {
    index: '04',
    label: 'Property Intelligence',
    short: 'Property',
    to: '/property',
    icon: FileSearch,
  },
  {
    index: '05',
    label: 'Acquisition CRM',
    short: 'CRM',
    to: '/crm',
    icon: ClipboardList,
  },
];
