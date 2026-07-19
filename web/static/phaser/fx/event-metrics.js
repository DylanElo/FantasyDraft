import { safeText } from '../core/text.js?v=38';

const DAMAGE_EVENT_TYPES = new Set(['damage', 'status_damage', 'health_steal']);

export function eventAmount(event) {
  const direct = Number(event && (event.amount || event.damage || (event.payload && (event.payload.amount || event.payload.damage))));
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = safeText(event && event.message).match(/(?:-|for\s+)(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export function damageEventAmount(event) {
  const type = safeText(event && event.type).trim().toLowerCase();
  if (!DAMAGE_EVENT_TYPES.has(type)) return 0;

  const payload = event && event.payload && typeof event.payload === 'object' ? event.payload : null;
  const actualOwner = payload && Object.prototype.hasOwnProperty.call(payload, 'actual_hp_damage')
    ? payload
    : event && Object.prototype.hasOwnProperty.call(event, 'actual_hp_damage')
      ? event
      : null;
  if (actualOwner) {
    const actual = Number(actualOwner.actual_hp_damage);
    return Number.isFinite(actual) ? Math.max(0, actual) : 0;
  }

  return Math.max(0, eventAmount(event));
}

export function eventTone(event) {
  const type = safeText(event && event.type);
  if (type.includes('heal')) return 'heal';
  if (type.includes('damage') || eventAmount(event)) return 'damage';
  if (type.includes('status')) return 'status';
  if (type.includes('turn')) return 'turn';
  if (type.includes('finish')) return 'finish';
  return 'neutral';
}
