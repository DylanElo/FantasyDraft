import { CSSProperties } from 'react';

export interface CardProps {
  name: string;
  faction?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  portraitUrl?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function Card(props: CardProps): JSX.Element;
