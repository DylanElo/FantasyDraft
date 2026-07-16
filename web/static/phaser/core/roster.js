import { BOOT } from './runtime-config.js?v=18';
import { safeText, titleize } from './text.js?v=18';

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
  return `portrait_${safeText(id).replace(/[^a-z0-9_]+/gi, '_')}`;
}

export function portraitFileFor(id) {
  const explicit = {
    aoi_todo: 'aoi-todo.svg',
    hiromi_higuruma: 'hiromi-higuruma.svg',
    mahito: 'mahito.svg',
    maki_zenin: 'maki-zenin.svg',
    megumi_fushiguro: 'megumi-fushiguro.svg',
    nobara_kugisaki: 'nobara-kugisaki.svg',
    satoru_gojo: 'gojo-unsealed.svg',
    satoru_gojo_young: 'gojo-young.svg',
    ryomen_sukuna: 'sukuna-full-power.svg',
    sukuna_heian_era: 'sukuna-heian-era.svg',
    yuji_itadori: 'yuji-black-flash.svg',
    yuji_awakened: 'yuji-awakened.svg',
    yuta_okkotsu: 'yuta-okkotsu-sendai.svg',
    yuta_okkotsu_jjk0: 'yuta-okkotsu-jjk-0.svg',
  };
  return explicit[id] || `${safeText(id).replace(/_/g, '-')}.svg`;
}

