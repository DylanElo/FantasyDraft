export interface SkillCardProps {
  name: string;
  /** Energy pip sequence, e.g. ['B','B','X']. */
  cost?: Array<'B' | 'T' | 'F' | 'C' | 'X'>;
  cooldown?: number;
  effect?: string;
  state?: 'ready' | 'cooldown' | 'energy' | 'stunned';
  onClick?: () => void;
}

export function SkillCard(props: SkillCardProps): JSX.Element;
