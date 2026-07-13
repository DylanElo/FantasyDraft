export interface ProgressBarProps {
  value?: number;
  max?: number;
  tone?: 'hp' | 'danger' | 'xp' | 'energy';
  /** Optional lagging ghost value (e.g. previous HP) for damage-lag animation. */
  lagValue?: number;
  height?: number;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element;
