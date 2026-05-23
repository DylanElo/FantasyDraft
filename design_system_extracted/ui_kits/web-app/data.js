// ────────────────────────────────────────────────────────────────────────
// data.js — faction map + sample characters loader for the prototype
// ────────────────────────────────────────────────────────────────────────

window.FACTION = {
  'Satoru Gojo': 'tokyo', 'Yuji Itadori': 'tokyo',
  'Megumi Fushiguro': 'tokyo', 'Nobara Kugisaki': 'tokyo',
  'Kento Nanami': 'tokyo', 'Yuta Okkotsu': 'tokyo',
  'Aoi Todo': 'kyoto', 'Maki Zenin': 'kyoto',
  'Toji Fushiguro': 'other',
  'Suguru Geto': 'villain',
  'Ryomen Sukuna': 'curse', 'Mahito': 'curse',
  'Jogo': 'curse', 'Choso': 'curse',
  'Hajime Kashimo': 'culling',
};

window.FACTION_LABEL = {
  tokyo: 'Tokyo', kyoto: 'Kyoto', other: 'Sorcerer',
  villain: 'Villain', curse: 'Curse', culling: 'Culling',
};

window.FACTION_KEYS = ['tokyo','kyoto','other','villain','curse','culling'];

// Identify Ultimates: longest cooldown skill in a character's skill list.
window.skillIsUlt = function (char, skill) {
  if (!char || !char.skills) return false;
  const cds = char.skills.map(s => parseInt(s.cooldown, 10) || 0);
  const max = Math.max(...cds);
  return max >= 3 && (parseInt(skill.cooldown, 10) || 0) === max;
};

window.skillTypeClass = function (classes) {
  const c = (classes || '').toLowerCase();
  if (c.includes('physical'))  return 'type-physical';
  if (c.includes('bloodline')) return 'type-bloodline';
  if (c.includes('energy'))    return 'type-energy';
  if (c.includes('strategic')) return 'type-strategic';
  return '';
};

window.scoreTeam = function (team) {
  return (team || []).reduce(
    (s, c) => s + (c.skills || []).reduce(
      (ss, sk) => ss + (sk.energy || []).length, 0), 0);
};

window.loadCharacters = async function () {
  const res = await fetch('characters.sample.json');
  return res.json();
};
