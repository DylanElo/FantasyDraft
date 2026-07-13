import { ReactNode, CSSProperties } from 'react';

export interface ButtonProps {
  children: ReactNode;
  /** Visual treatment. */
  variant?: 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
