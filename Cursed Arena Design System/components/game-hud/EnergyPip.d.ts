export interface EnergyPipProps {
  type?: 'B' | 'T' | 'F' | 'C' | 'X';
  filled?: boolean;
  size?: number;
}

export function EnergyPip(props: EnergyPipProps): JSX.Element;
