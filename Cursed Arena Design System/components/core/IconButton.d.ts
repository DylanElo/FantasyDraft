import { ReactNode, CSSProperties } from 'react';

export interface IconButtonProps {
  children: ReactNode;
  size?: number;
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
