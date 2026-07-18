import { BOOT } from './runtime-config.js?v=28';
import { portraitFileFor as registeredPortraitFileFor, portraitTextureKeyFor } from './portrait-registry.js?v=28';
import { safeText, titleize } from './text.js?v=28';

export function firstCreationRoster() {
  return (BOOT.firstCreation && BOOT.firstCreation.roster) || BOOT.roster || {};
}

export function preset(name, fallback) {
  const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
  return Array.isArray(presets[name]) ? presets[name].slice(0, 3) : fallback.slice(0, 3);
}

export function presetTitle(name) {
  const labels = {
    story_tutorial: 'Story Tutorial',
    tokyo_second_years: 'Tokyo Second-Years',
    kyoto_pressure: 'Kyoto Pressure',
    defensive_artillery: 'Defensive Artillery',
    poison_outsider: 'Poison Outsider',
    hidden_inventory: 'Hidden Inventory',
    young_sorcerer_support: 'Young Sorcerer Support',
    jjk0_beginner_special: 'JJK0 Beginner Special',
  };
  return labels[name] || titleize(name);
}

export function costColors(cost) {
  return (cost || []).map((color) => safeText(color).toLowerCase());
}

export function imageKeyFor(id) {
  return portraitTextureKeyFor(id);
}

export function portraitFileFor(id) {
  return registeredPortraitFileFor(id);
}
