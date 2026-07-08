import { safeText } from '../core/text.js?v=17';

export function eventAmount(event) {
  const direct = Number(event && (event.amount || event.damage || (event.payload && (event.payload.amount || event.payload.damage))));
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = safeText(event && event.message).match(/(?:-|for\s+)(\d+)/i);
  return match ? Number(match[1]) : 0;
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

