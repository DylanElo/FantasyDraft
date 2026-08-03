import type { Character, CoreEnergy } from './types'

export const ENERGY: Record<CoreEnergy, { letter: string; name: string }> = {
  green: { letter: 'T', name: 'Taijutsu' },
  blue: { letter: 'J', name: 'Jujutsu' },
  white: { letter: 'S', name: 'Strategic' },
  red: { letter: 'B', name: 'Bloodline' },
}

export const CHARACTERS: Character[] = [
  {
    id: 'yuji_itadori', name: 'Yuji Itadori', shortName: 'Yuji', role: 'Beginner bruiser / finisher',
    state: 'Soul Bruise / Momentum', portrait: '/assets/portraits/yuji-itadori.webp', accent: '#e32620', motif: 'Impact rings',
    skills: [
      { id: 'fc_yuji_itadori_divergent_fist', name: 'Divergent Fist', cost: ['green'], cooldown: 0, target: 'enemy', tags: ['Physical', 'Melee'], impact: 30, description: 'Deal 20 damage and 10 delayed damage; Soul Bruise triggers the delayed hit immediately.' },
      { id: 'fc_yuji_itadori_cursed_energy_reinforcement', name: 'Cursed Energy Reinforcement', cost: ['white'], cooldown: 2, target: 'self', tags: ['Strategic', 'Guard'], impact: 0, description: 'Gain 20 damage reduction for 1 turn; the next damaging skill deals +10 damage.' },
      { id: 'fc_yuji_itadori_black_flash_attempt', name: 'Black Flash Attempt', cost: ['green', 'white'], cooldown: 3, target: 'enemy', tags: ['Physical', 'Payoff'], impact: 45, description: 'Deal 35 damage. Prepared targets also take 10 piercing damage and record Momentum.' },
      { id: 'fc_yuji_itadori_reflexive_guard', name: 'Reflexive Guard', cost: ['black'], cooldown: 4, target: 'self', tags: ['Strategic', 'Invulnerable'], impact: 0, description: 'Become untargetable for 1 turn.' },
    ],
  },
  {
    id: 'megumi_fushiguro', name: 'Megumi Fushiguro', shortName: 'Megumi', role: 'Shikigami control / setup',
    state: 'Scent', portrait: '/assets/portraits/megumi-fushiguro.webp', accent: '#35dde8', motif: 'Shadow geometry',
    skills: [
      { id: 'fc_megumi_fushiguro_divine_dogs', name: 'Divine Dogs', cost: ['blue'], cooldown: 0, target: 'enemy', tags: ['Jujutsu', 'Setup'], impact: 20, description: 'Deal 20 damage and apply Scent for 2 turns; the next shikigami hit gains +10.' },
      { id: 'fc_megumi_fushiguro_nue_dive', name: 'Nue Dive', cost: ['blue', 'black'], cooldown: 2, target: 'enemy', tags: ['Control', 'Jujutsu'], impact: 25, description: 'Deal 25 damage; Scented targets lose Taijutsu and Jujutsu access.' },
      { id: 'fc_megumi_fushiguro_toad_snare', name: 'Toad Snare', cost: ['white'], cooldown: 2, target: 'enemy', tags: ['Control', 'Snare'], impact: 8, description: 'Snare one enemy for 1 turn; they cannot gain damage reduction or defense.' },
      { id: 'fc_megumi_fushiguro_shadow_retreat', name: 'Shadow Retreat', cost: ['black'], cooldown: 4, target: 'ally', tags: ['Strategic', 'Rescue'], impact: 0, description: 'Megumi or one ally becomes untargetable; wounded allies also gain defense.' },
    ],
  },
  {
    id: 'nobara_kugisaki', name: 'Nobara Kugisaki', shortName: 'Nobara', role: 'Ranged mark / punish',
    state: 'Nail', portrait: '/assets/portraits/nobara-kugisaki.webp', accent: '#d8bf68', motif: 'Nails and fracture lines',
    skills: [
      { id: 'fc_nobara_kugisaki_nail_barrage', name: 'Nail Barrage', cost: ['blue'], cooldown: 0, target: 'enemy', tags: ['Jujutsu', 'Mark'], impact: 20, description: 'Deal 20 damage and apply Nail for 3 turns.' },
      { id: 'fc_nobara_kugisaki_straw_doll_resonance', name: 'Straw Doll Resonance', cost: ['blue', 'red'], cooldown: 1, target: 'enemy', tags: ['Soul', 'Payoff'], impact: 32, description: 'Deal soul damage to a Nailed enemy; otherwise deal normal damage.' },
      { id: 'fc_nobara_kugisaki_hairpin', name: 'Hairpin', cost: ['blue', 'black'], cooldown: 3, target: 'enemy_team', tags: ['Piercing', 'Area'], impact: 24, description: 'Detonate Nail across the enemy team and consume the marks.' },
      { id: 'fc_nobara_kugisaki_hammer_guard', name: 'Hammer Guard', cost: ['black'], cooldown: 4, target: 'self', tags: ['Strategic', 'Counter'], impact: 0, description: 'Become untargetable; melee attackers receive Nail.' },
    ],
  },
  {
    id: 'maki_zenin', name: 'Maki Zenin', shortName: 'Maki', role: 'Weapon specialist / anti-defense',
    state: 'Weapon Specialist', portrait: '/assets/portraits/maki-zenin.webp', accent: '#4fb06d', motif: 'Steel cuts',
    skills: [
      { id: 'fc_maki_zenin_cursed_tool_combo', name: 'Cursed Tool Combo', cost: ['green'], cooldown: 0, target: 'enemy', tags: ['Physical', 'Break'], impact: 25, description: 'Destroy defense, then deal 20 damage.' },
      { id: 'fc_maki_zenin_spear_sweep', name: 'Spear Sweep', cost: ['green', 'black'], cooldown: 2, target: 'enemy_team', tags: ['Physical', 'Area'], impact: 22, description: 'Sweep all enemies and reduce their Taijutsu damage.' },
      { id: 'fc_maki_zenin_weapon_specialist', name: 'Weapon Specialist', cost: ['white'], cooldown: 3, target: 'self', tags: ['Strategic', 'Stance'], impact: 0, description: 'Gain reduction and empower the next Cursed Tool Combo.' },
      { id: 'fc_maki_zenin_tool_parry_stance', name: 'Tool-Parry Stance', cost: ['black'], cooldown: 4, target: 'self', tags: ['Strategic', 'Parry'], impact: 0, description: 'Become untargetable and empower the next damaging skill.' },
    ],
  },
  {
    id: 'panda', name: 'Panda', shortName: 'Panda', role: 'Tank / stance bruiser',
    state: 'Gorilla Core', portrait: '/assets/portraits/panda.webp', accent: '#f2e8d5', motif: 'Heavy stamp blocks',
    skills: [
      { id: 'fc_panda_panda_jab', name: 'Panda Jab', cost: ['green'], cooldown: 0, target: 'enemy', tags: ['Physical', 'Defense'], impact: 24, description: 'Deal damage and gain defense; Gorilla Core increases the hit.' },
      { id: 'fc_panda_gorilla_core', name: 'Gorilla Core', cost: ['green', 'white'], cooldown: 4, target: 'self', tags: ['Stance', 'Defense'], impact: 0, description: 'Gain 25 defense and enter Gorilla Core for 3 turns.' },
      { id: 'fc_panda_drumming_beat', name: 'Drumming Beat', cost: ['green', 'black'], cooldown: 2, target: 'enemy', tags: ['Physical', 'Piercing'], impact: 30, description: 'Deal 25 piercing damage.' },
      { id: 'fc_panda_cursed_corpse_guard', name: 'Cursed Corpse Guard', cost: ['black'], cooldown: 4, target: 'self', tags: ['Strategic', 'Guard'], impact: 0, description: 'Become untargetable; Gorilla Core can protect an ally.' },
    ],
  },
  {
    id: 'junpei_yoshino', name: 'Junpei Yoshino', shortName: 'Junpei', role: 'Poison shikigami / fragile control',
    state: 'Poison', portrait: '/assets/portraits/junpei-yoshino.webp', accent: '#7bdde4', motif: 'Jellyfish veils',
    skills: [
      { id: 'fc_junpei_yoshino_moon_dregs_sting', name: 'Moon Dregs Sting', cost: ['red'], cooldown: 0, target: 'enemy', tags: ['Soul', 'Poison'], impact: 25, description: 'Deal soul damage and apply Poison over the target’s next turns.' },
      { id: 'fc_junpei_yoshino_jellyfish_screen', name: 'Jellyfish Screen', cost: ['white'], cooldown: 2, target: 'ally', tags: ['Defense', 'Retaliate'], impact: 0, description: 'Give an ally defense; attackers take poison damage.' },
      { id: 'fc_junpei_yoshino_venom_bloom', name: 'Venom Bloom', cost: ['red', 'black'], cooldown: 3, target: 'enemy_team', tags: ['Soul', 'Area'], impact: 25, description: 'Bloom existing Poison or spread a weaker dose to the enemy team.' },
      { id: 'fc_junpei_yoshino_shikigami_veil', name: 'Shikigami Veil', cost: ['black'], cooldown: 4, target: 'enemy_team', tags: ['Strategic', 'Extend'], impact: 0, description: 'Become untargetable and extend enemy Poison.' },
    ],
  },
]

export const characterById = (id: string) => CHARACTERS.find((character) => character.id === id)!
