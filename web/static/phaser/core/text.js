export function safeText(value, fallback = '') {
  return String(value === undefined || value === null || value === '' ? fallback : value);
}

export function shortText(value, limit) {
  const text = safeText(value);
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3))}...` : text;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function initials(name) {
  return safeText(name, '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function titleize(value) {
  return safeText(value)
    .replace(/^fc_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
