import { CULLING_COLORS } from './runtime-config.js?v=43';
import { safeText, titleize } from './text.js?v=43';

export function activeStatuses(character) {
  return [...((character && character.statuses) || [])]
    .filter((status) => Number(status.duration || 0) !== 0)
    .sort((left, right) => {
      const control = (status) => Number(Boolean(
        status && status.payload
        && (status.payload.stun_harmful || (status.payload.stun_classes || []).length),
      ));
      return control(right) - control(left)
        || Number(Boolean(right.invisible || right.revealed)) - Number(Boolean(left.invisible || left.revealed));
    });
}

export function statusCardLabel(status) {
  const payload = (status && status.payload) || {};
  const families = ((status && status.families) || []).map((family) => safeText(family).toLowerCase());
  const id = safeText(status && status.id).toLowerCase();
  const name = safeText(status && (status.name || status.id), 'Effect').toUpperCase();
  let label = name.length <= 13 ? name : '';
  if (status && status.revealed) label = 'REVEALED';
  else if (status && status.invisible) label = 'HIDDEN';
  else if (payload.stun_harmful || (payload.stun_classes || []).length || families.includes('stun')) label = 'STUN';
  else if (id.includes('poison') || families.includes('affliction')) label = id.includes('poison') ? 'POISON' : 'AFFLICTION';
  else if (payload.invulnerable) label = 'WARD';
  else if (payload.destructible_defense) label = 'SHIELD';
  else if (Number(payload.damage_output_delta || 0) < 0) label = 'DAMAGE DOWN';
  else if (Number(payload.damage_output_delta || 0) > 0) label = 'POWER UP';
  else if (families.includes('mark')) label = 'MARK';
  else if (families.includes('buff')) label = 'BUFF';
  else if (families.includes('debuff')) label = 'DEBUFF';
  else if (families.includes('soul')) label = 'SOUL';
  if (!label) label = 'STATUS';
  const duration = Number(status && status.duration);
  let result = Number.isFinite(duration) && duration > 0 ? `${label} ${duration}` : label;
  const stacks = Number(status && status.stacks);
  if (Number.isFinite(stacks) && stacks > 1) {
    result += ` x${stacks}`;
  }
  return result;
}

export function statusTone(status) {
  const payload = (status && status.payload) || {};
  const families = ((status && status.families) || []).map((family) => safeText(family).toLowerCase());
  // Seven-family semantic palette (Culling Current locked colors — numeric for Phaser fillStyle).
  // Priority order: most-action-impacting family wins when multiple apply.
  if (families.includes('stun') || families.includes('control')) return CULLING_COLORS.vermilion; // barrier red
  if (families.includes('affliction')) return 0xc87070; // wound rose — DoT threat
  if (families.includes('debuff')) return CULLING_COLORS.sky; // storm ochre — weakening
  if (payload.invulnerable || payload.destructible_defense) return CULLING_COLORS.queued; // green — protection
  if (families.includes('buff')) return CULLING_COLORS.cyan; // curse cyan — positive
  if (families.includes('mark')) return CULLING_COLORS.gold; // aged gold — setup/payoff
  if (families.includes('soul')) return 0x3d4f7c; // indigo mid — soul/eerie
  // Legacy payload-based fallback for statuses without explicit families.
  const hostile = (status && status.source_player_id && status.target_player_id
    && status.source_player_id !== status.target_player_id)
    || payload.stun_harmful || (payload.stun_classes || []).length
    || Number(payload.damage_output_delta || 0) < 0
    || Number(payload.turn_end_damage || 0) > 0;
  if (hostile) return CULLING_COLORS.vermilion;
  if (payload.invulnerable || payload.destructible_defense) return CULLING_COLORS.queued;
  return CULLING_COLORS.cobalt;
}

export function statusDurationText(status) {
  const duration = Number(status && status.duration);
  const clock = titleize(safeText(status && status.duration_clock, 'round').replaceAll('_', ' '));
  if (!Number.isFinite(duration) || duration < 0) return 'PERSISTENT';
  return `${duration} ${clock}${duration === 1 ? '' : 's'}`.toUpperCase();
}

export function statusEffectSummary(status) {
  const payload = (status && status.payload) || {};
  const details = [];
  const stunned = (payload.stun_classes || []).map((value) => titleize(value));
  if (payload.stun_harmful) details.push('Harmful skills disabled');
  if (stunned.length) details.push(stunned.includes('All') ? 'All skill classes disabled' : `${stunned.join(' / ')} skills disabled`);
  if (payload.cannot_target_allies) details.push('Ally-targeting skills disabled');
  if (payload.block_non_damaging_skills) details.push('Non-damaging skills disabled');
  if (payload.block_counters) details.push('Counter skills disabled');
  if (payload.invulnerable_to_all) details.push('Cannot be targeted by any skill');
  else if (payload.invulnerable) details.push('Cannot be targeted by harmful skills');
  if (payload.anti_domain) details.push('Converts sure-hit to normal damage');
  if (Number(payload.destructible_defense || 0)) details.push(`${payload.destructible_defense} destructible defense`);
  if (Number(payload.damage_reduction || 0)) details.push(`${payload.damage_reduction} damage reduction`);
  if (Number(payload.damage_output_delta || 0)) {
    const delta = Number(payload.damage_output_delta);
    details.push(`${delta > 0 ? '+' : ''}${delta} outgoing damage`);
  }
  if (Number(payload.turn_end_damage || 0)) {
    details.push(`${payload.turn_end_damage} ${titleize(payload.turn_end_damage_type || 'normal')} damage at turn end`);
  }
  if (Number(payload.turn_end_heal || 0)) details.push(`Heals ${payload.turn_end_heal} at turn end`);
  if (payload.counter) details.push('Counter armed');
  if (payload.reflect) details.push('Reflect armed');
  if (!details.length) {
    const families = ((status && status.families) || []).map((family) => titleize(family));
    details.push(families.length ? `${families.join(' / ')} status active` : 'Status effect active');
  }
  return details.slice(0, 2).join(' · ');
}
