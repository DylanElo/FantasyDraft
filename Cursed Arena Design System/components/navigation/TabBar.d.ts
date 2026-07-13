import { ReactNode } from 'react';

export interface TabBarTab {
  id: string;
  label: string;
  icon: ReactNode;
  /** Elevated hero slot (e.g. Battle) rendered as a larger raised button. */
  hero?: boolean;
}

export interface TabBarProps {
  tabs: TabBarTab[];
  activeId: string;
  onChange?: (id: string) => void;
}

export function TabBar(props: TabBarProps): JSX.Element;
