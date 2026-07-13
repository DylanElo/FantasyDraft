export interface CurrencyPillProps {
  kind?: 'gold' | 'gem';
  amount: number;
  onAdd?: () => void;
}

export function CurrencyPill(props: CurrencyPillProps): JSX.Element;
