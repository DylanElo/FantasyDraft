/* Cursed Arena — shared mock data for the UI kit prototype. */
window.CA_ROSTER = [
  { id: 'yuji', name: 'Yuji Itadori', faction: 'Tokyo', rarity: 'rare', role: 'Bruiser', portrait: '../../assets/portraits/yuji-black-flash.svg' },
  { id: 'megumi', name: 'Megumi Fushiguro', faction: 'Tokyo', rarity: 'rare', role: 'Control', portrait: '../../assets/portraits/megumi-fushiguro.svg' },
  { id: 'nobara', name: 'Nobara Kugisaki', faction: 'Tokyo', rarity: 'rare', role: 'Ranged', portrait: '../../assets/portraits/nobara-kugisaki.svg' },
  { id: 'maki', name: 'Maki Zenin', faction: 'Tokyo', rarity: 'epic', role: 'Weapons', portrait: '../../assets/portraits/maki-zenin.svg' },
  { id: 'toge', name: 'Toge Inumaki', faction: 'Tokyo', rarity: 'epic', role: 'Control', portrait: '../../assets/portraits/toge-inumaki.svg' },
  { id: 'todo', name: 'Aoi Todo', faction: 'Kyoto', rarity: 'epic', role: 'Bruiser', portrait: '../../assets/portraits/aoi-todo.svg' },
  { id: 'gojo', name: 'Satoru Gojo', faction: 'Sorcerer', rarity: 'legendary', role: 'Control', portrait: '../../assets/portraits/gojo-young.svg' },
  { id: 'yuta', name: 'Yuta Okkotsu', faction: 'Sorcerer', rarity: 'legendary', role: 'Defender', portrait: '../../assets/portraits/yuta-okkotsu-jjk-0.svg' },
];

window.CA_SKILLS = {
  yuji: [
    { name: 'Divergent Fist', cost: ['B', 'B'], cooldown: 0, effect: 'Delayed second hit, +12 dmg', state: 'ready' },
    { name: 'Black Flash Setup', cost: ['B', 'X'], cooldown: 2, effect: 'Requires momentum stack', state: 'cooldown' },
    { name: 'Reckless Guard', cost: ['F'], cooldown: 0, effect: '+destructible defense, self', state: 'ready' },
    { name: 'Soul Bruise', cost: ['B', 'C'], cooldown: 1, effect: 'Bonus dmg vs marked target', state: 'ready' },
  ],
  megumi: [
    { name: 'Divine Dogs: Nue', cost: ['T', 'T'], cooldown: 1, effect: 'Mark + soft control', state: 'ready' },
    { name: 'Shikigami Scent', cost: ['T'], cooldown: 0, effect: 'Reveals queued enemy skill', state: 'ready' },
    { name: 'Domain Ready Stance', cost: ['F', 'F'], cooldown: 2, effect: 'Blocks next control effect', state: 'energy' },
    { name: 'Toad Pin', cost: ['T', 'X'], cooldown: 3, effect: 'Sure-hit vs airborne', state: 'ready' },
  ],
};
