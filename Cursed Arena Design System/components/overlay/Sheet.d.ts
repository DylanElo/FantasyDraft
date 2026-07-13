import { ReactNode } from 'react';

export interface SheetProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Sheet(props: SheetProps): JSX.Element;
