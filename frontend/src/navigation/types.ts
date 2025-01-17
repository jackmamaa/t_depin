import { ReactNode } from 'react';

export interface SubMenuItem {
  id: string;
  text: string;
  path: string;
}

export interface NavItem {
  id: string;
  icon: ReactNode;
  text: string;
  subMenu?: SubMenuItem[];
  href?: string;
} 