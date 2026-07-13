import { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'curse' | 'gold' | 'teal' | 'red';
}

export function Badge(props: BadgeProps): JSX.Element;
