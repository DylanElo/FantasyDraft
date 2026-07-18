// Presentation-only metadata keyed by the authoritative Battle v2 skill id.
// Nothing in this registry decides legality, cost, targeting, or effects.

const PALETTES = Object.freeze({
  body: Object.freeze({ surface: 0x101b36, ink: 0x17191e, accent: 0x4fb06d, flare: 0x35dde8, paper: 0xf2e8d5 }),
  technique: Object.freeze({ surface: 0x101b36, ink: 0x17191e, accent: 0x3d6bff, flare: 0x35dde8, paper: 0xf2e8d5 }),
  focus: Object.freeze({ surface: 0x17191e, ink: 0x17191e, accent: 0xd8bf68, flare: 0xede9d5, paper: 0xf2e8d5 }),
  curse: Object.freeze({ surface: 0x17191e, ink: 0x17191e, accent: 0xe32620, flare: 0x35dde8, paper: 0xf2e8d5 }),
});

export const SKILL_ACTION_ATLAS = Object.freeze({
  key: 's3-skill-action-atlas-v2',
  path: '/static/assets/skills/culling-current/skill-action-atlas-v2.png',
  sourceWidth: 1254,
  sourceHeight: 1254,
  columns: 4,
  rows: 4,
  frameCount: 16,
});

// Frames are selected by authored visual form, never by player-facing name.
// Multiple suitable frames let two related techniques share a visual language
// without becoming the same card once their sigil/crop/rotation is applied.
const FRAME_CHOICES_BY_FORM = Object.freeze({
  fist: [0, 12], palm: [0, 12], core: [6, 12], drum: [0, 14],
  burst: [1, 14], clap: [1, 5], blood: [8, 14], vortex: [7, 14], rhythm: [5, 15], venom: [8, 13],
  blade: [4, 11], sweep: [4, 11], parry: [4, 11], arsenal: [3, 11], scalpel: [4, 11], katana: [11, 4],
  projectile: [3, 8, 10], arrow: [8, 10], firearm: [10], bullet: [10, 1], beam: [1, 14], cannon: [12, 1], wind: [9, 4],
  beast: [2, 9], wing: [2, 9], doll: [3, 15], jellyfish: [13], swarm: [2, 9], dragon: [2, 15], crow: [2, 15], spirit: [7, 15],
  binding: [5, 8], voice: [5, 7], swap: [5, 14], eye: [5, 7], net: [5, 8], signal: [5, 15], talisman: [15, 5], chant: [5, 15],
  ward: [5, 6], shadow: [6, 7], vial: [13, 15], barrier: [5, 6], step: [4, 5], veil: [6, 7], heal: [13, 15], cleanse: [5, 13],
});

// [skill id, character id, original slot, affinity, icon form, motion profile,
//  optional replaced base skill id]. Replacement entries deliberately retain
// their base slot so visual presentation cannot imply a fifth action slot.
const SKILL_VISUAL_ROWS = Object.freeze([
  ['fc_yuji_itadori_divergent_fist', 'yuji_itadori', 0, 'body', 'fist', 'strike'],
  ['fc_yuji_itadori_cursed_energy_reinforcement', 'yuji_itadori', 1, 'focus', 'ward', 'support'],
  ['fc_yuji_itadori_black_flash_attempt', 'yuji_itadori', 2, 'body', 'burst', 'finisher'],
  ['fc_yuji_itadori_reflexive_guard', 'yuji_itadori', 3, 'focus', 'ward', 'guard'],

  ['fc_megumi_fushiguro_divine_dogs', 'megumi_fushiguro', 0, 'technique', 'beast', 'projectile'],
  ['fc_megumi_fushiguro_nue_dive', 'megumi_fushiguro', 1, 'technique', 'wing', 'strike'],
  ['fc_megumi_fushiguro_toad_snare', 'megumi_fushiguro', 2, 'focus', 'binding', 'control'],
  ['fc_megumi_fushiguro_shadow_retreat', 'megumi_fushiguro', 3, 'focus', 'shadow', 'guard'],

  ['fc_nobara_kugisaki_nail_barrage', 'nobara_kugisaki', 0, 'technique', 'projectile', 'projectile'],
  ['fc_nobara_kugisaki_straw_doll_resonance', 'nobara_kugisaki', 1, 'curse', 'doll', 'finisher'],
  ['fc_nobara_kugisaki_hairpin', 'nobara_kugisaki', 2, 'curse', 'burst', 'finisher'],
  ['fc_nobara_kugisaki_hammer_guard', 'nobara_kugisaki', 3, 'focus', 'ward', 'guard'],

  ['fc_maki_zenin_cursed_tool_combo', 'maki_zenin', 0, 'body', 'blade', 'strike'],
  ['fc_maki_zenin_spear_sweep', 'maki_zenin', 1, 'body', 'sweep', 'strike'],
  ['fc_maki_zenin_weapon_specialist', 'maki_zenin', 2, 'focus', 'arsenal', 'support'],
  ['fc_maki_zenin_tool_parry_stance', 'maki_zenin', 3, 'focus', 'parry', 'guard'],

  ['fc_toge_inumaki_stop', 'toge_inumaki', 0, 'focus', 'voice', 'control'],
  ['fc_toge_inumaki_blast_away', 'toge_inumaki', 1, 'technique', 'voice', 'finisher'],
  ['fc_toge_inumaki_dont_move', 'toge_inumaki', 2, 'focus', 'voice', 'control'],
  ['fc_toge_inumaki_throat_medicine', 'toge_inumaki', 3, 'focus', 'vial', 'support'],

  ['fc_panda_panda_jab', 'panda', 0, 'body', 'fist', 'strike'],
  ['fc_panda_gorilla_core', 'panda', 1, 'body', 'core', 'support'],
  ['fc_panda_drumming_beat', 'panda', 2, 'body', 'drum', 'strike'],
  ['fc_panda_cursed_corpse_guard', 'panda', 3, 'focus', 'ward', 'guard'],

  ['fc_aoi_todo_brutal_palm_strike', 'aoi_todo', 0, 'body', 'palm', 'strike'],
  ['fc_aoi_todo_boogie_woogie', 'aoi_todo', 1, 'technique', 'swap', 'control'],
  ['fc_aoi_todo_brotherly_beatdown', 'aoi_todo', 2, 'body', 'fist', 'strike'],
  ['fc_aoi_todo_clap_feint', 'aoi_todo', 3, 'focus', 'clap', 'reveal'],

  ['fc_noritoshi_kamo_blood_tipped_arrow', 'noritoshi_kamo', 0, 'curse', 'arrow', 'projectile'],
  ['fc_noritoshi_kamo_flowing_red_scale', 'noritoshi_kamo', 1, 'curse', 'blood', 'support'],
  ['fc_noritoshi_kamo_crimson_binding', 'noritoshi_kamo', 2, 'curse', 'binding', 'control'],
  ['fc_noritoshi_kamo_blood_veil', 'noritoshi_kamo', 3, 'focus', 'ward', 'guard'],

  ['fc_momo_nishimiya_wind_scythe', 'momo_nishimiya', 0, 'technique', 'wind', 'projectile'],
  ['fc_momo_nishimiya_aerial_scout', 'momo_nishimiya', 1, 'focus', 'eye', 'reveal'],
  ['fc_momo_nishimiya_broom_rescue', 'momo_nishimiya', 2, 'focus', 'wing', 'support'],
  ['fc_momo_nishimiya_high_altitude_evasion', 'momo_nishimiya', 3, 'focus', 'wing', 'guard'],

  ['fc_mai_zenin_revolver_shot', 'mai_zenin', 0, 'body', 'firearm', 'projectile'],
  ['fc_mai_zenin_rubber_round_feint', 'mai_zenin', 1, 'focus', 'projectile', 'reveal'],
  ['fc_mai_zenin_construction_hidden_bullet', 'mai_zenin', 2, 'curse', 'bullet', 'finisher'],
  ['fc_mai_zenin_cover_position', 'mai_zenin', 3, 'focus', 'ward', 'guard'],

  ['fc_kasumi_miwa_new_shadow_quick_draw', 'kasumi_miwa', 0, 'body', 'blade', 'strike'],
  ['fc_kasumi_miwa_simple_domain_batto_stance', 'kasumi_miwa', 1, 'focus', 'barrier', 'guard'],
  ['fc_kasumi_miwa_earnest_slash', 'kasumi_miwa', 2, 'body', 'blade', 'strike'],
  ['fc_kasumi_miwa_useful_retreat', 'kasumi_miwa', 3, 'focus', 'step', 'support'],

  ['fc_kokichi_muta_mechamaru_puppet_beam', 'kokichi_muta_mechamaru', 0, 'technique', 'beam', 'projectile'],
  ['fc_kokichi_muta_mechamaru_cannon_charge', 'kokichi_muta_mechamaru', 1, 'technique', 'cannon', 'finisher'],
  ['fc_kokichi_muta_mechamaru_remote_puppet_net', 'kokichi_muta_mechamaru', 2, 'technique', 'net', 'control'],
  ['fc_kokichi_muta_mechamaru_withdraw_signal', 'kokichi_muta_mechamaru', 3, 'focus', 'signal', 'support'],

  ['fc_junpei_yoshino_moon_dregs_sting', 'junpei_yoshino', 0, 'curse', 'jellyfish', 'projectile'],
  ['fc_junpei_yoshino_jellyfish_screen', 'junpei_yoshino', 1, 'focus', 'jellyfish', 'guard'],
  ['fc_junpei_yoshino_venom_bloom', 'junpei_yoshino', 2, 'curse', 'venom', 'finisher'],
  ['fc_junpei_yoshino_shikigami_veil', 'junpei_yoshino', 3, 'curse', 'veil', 'guard'],

  ['fc_satoru_gojo_young_lapse_blue', 'satoru_gojo_young', 0, 'technique', 'vortex', 'projectile'],
  ['fc_satoru_gojo_young_six_eyes_read', 'satoru_gojo_young', 1, 'focus', 'eye', 'reveal'],
  ['fc_satoru_gojo_young_infinity_maintenance', 'satoru_gojo_young', 2, 'focus', 'barrier', 'guard'],
  ['fc_satoru_gojo_young_reversal_red', 'satoru_gojo_young', 3, 'technique', 'burst', 'finisher'],

  ['fc_suguru_geto_young_swarm_curse', 'suguru_geto_young', 0, 'curse', 'swarm', 'projectile'],
  ['fc_suguru_geto_young_hookworm_curse', 'suguru_geto_young', 1, 'curse', 'beast', 'control'],
  ['fc_suguru_geto_young_rainbow_dragon_guard', 'suguru_geto_young', 2, 'curse', 'dragon', 'guard'],
  ['fc_suguru_geto_young_curse_screen', 'suguru_geto_young', 3, 'curse', 'veil', 'guard'],
  ['fc_suguru_geto_young_compressed_uzumaki', 'suguru_geto_young', 0, 'curse', 'vortex', 'finisher', 'fc_suguru_geto_young_swarm_curse'],

  ['fc_shoko_ieiri_young_scalpel_feint', 'shoko_ieiri_young', 0, 'focus', 'scalpel', 'reveal'],
  ['fc_shoko_ieiri_young_reverse_cursed_treatment', 'shoko_ieiri_young', 1, 'technique', 'heal', 'support'],
  ['fc_shoko_ieiri_young_cleanse_protocol', 'shoko_ieiri_young', 2, 'technique', 'cleanse', 'support'],
  ['fc_shoko_ieiri_young_emergency_step', 'shoko_ieiri_young', 3, 'focus', 'step', 'support'],

  ['fc_utahime_iori_young_talisman_strike', 'utahime_iori_young', 0, 'focus', 'talisman', 'strike'],
  ['fc_utahime_iori_young_solo_solo_kinku', 'utahime_iori_young', 1, 'focus', 'chant', 'support'],
  ['fc_utahime_iori_young_ritual_rhythm', 'utahime_iori_young', 2, 'technique', 'rhythm', 'support'],
  ['fc_utahime_iori_young_curtain_step', 'utahime_iori_young', 3, 'focus', 'barrier', 'support'],

  ['fc_mei_mei_young_axe_sweep', 'mei_mei_young', 0, 'body', 'sweep', 'strike'],
  ['fc_mei_mei_young_crow_scout', 'mei_mei_young', 1, 'focus', 'crow', 'reveal'],
  ['fc_mei_mei_young_black_bird_strike', 'mei_mei_young', 2, 'technique', 'crow', 'finisher'],
  ['fc_mei_mei_young_crow_screen', 'mei_mei_young', 3, 'focus', 'crow', 'guard'],

  ['fc_yuta_okkotsu_jjk0_cursed_katana', 'yuta_okkotsu_jjk0', 0, 'body', 'katana', 'strike'],
  ['fc_yuta_okkotsu_jjk0_reverse_cursed_technique', 'yuta_okkotsu_jjk0', 1, 'technique', 'heal', 'support'],
  ['fc_yuta_okkotsu_jjk0_rikas_curse', 'yuta_okkotsu_jjk0', 2, 'curse', 'spirit', 'support'],
  ['fc_yuta_okkotsu_jjk0_rika_protects', 'yuta_okkotsu_jjk0', 3, 'curse', 'spirit', 'guard'],
  ['fc_yuta_okkotsu_jjk0_cursed_speech_megaphone', 'yuta_okkotsu_jjk0', 2, 'focus', 'voice', 'control', 'fc_yuta_okkotsu_jjk0_rikas_curse'],
]);

function stableHash(value) {
  let hash = 2166136261;
  String(value).split('').forEach((character) => {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return hash >>> 0;
}

function nudgeColor(color, hash) {
  const shift = (channel, bits) => Math.max(0, Math.min(255, channel + (((hash >>> bits) & 0x0f) - 7)));
  const red = shift((color >>> 16) & 0xff, 0);
  const green = shift((color >>> 8) & 0xff, 4);
  const blue = shift(color & 0xff, 8);
  return (red << 16) | (green << 8) | blue;
}

function motifFromId(skillId, characterId) {
  const prefix = `fc_${characterId}_`;
  return skillId.startsWith(prefix) ? skillId.slice(prefix.length) : skillId;
}

function createVisual(row, index) {
  const [id, characterId, slot, affinity, form, motionProfile, replacementFor = null] = row;
  const hash = stableHash(id);
  const palette = PALETTES[affinity];
  const motif = motifFromId(id, characterId);
  const frameChoices = FRAME_CHOICES_BY_FORM[form] || [index % SKILL_ACTION_ATLAS.frameCount];
  const frame = frameChoices[(hash + index) % frameChoices.length];
  const column = frame % SKILL_ACTION_ATLAS.columns;
  const atlasRow = Math.floor(frame / SKILL_ACTION_ATLAS.columns);
  return Object.freeze({
    id,
    characterId,
    slot,
    kind: replacementFor ? 'replacement' : 'primary',
    replacementFor,
    icon: Object.freeze({
      motif,
      form,
      sigil: `${form}-${hash.toString(36)}`,
      rings: 1 + (hash % 3),
      spokes: 3 + ((hash >>> 3) % 6),
      rotation: ((hash >>> 8) % 24) * 15,
      cut: 0.12 + (((hash >>> 13) % 8) * 0.025),
    }),
    palette: Object.freeze({
      family: affinity,
      surface: palette.surface,
      ink: palette.ink,
      accent: nudgeColor(palette.accent, hash),
      semanticAccent: palette.accent,
      flare: palette.flare,
      paper: palette.paper,
    }),
    art: Object.freeze({
      textureKey: SKILL_ACTION_ATLAS.key,
      atlasKey: SKILL_ACTION_ATLAS.key,
      atlasPath: SKILL_ACTION_ATLAS.path,
      frame,
      frameMotif: form,
      column,
      row: atlasRow,
      crop: Object.freeze({
        u: column / SKILL_ACTION_ATLAS.columns,
        v: atlasRow / SKILL_ACTION_ATLAS.rows,
        width: 1 / SKILL_ACTION_ATLAS.columns,
        height: 1 / SKILL_ACTION_ATLAS.rows,
      }),
      variant: `${motif}-${(hash % 7) + 1}`,
      focalX: 0.2 + (((hash >>> 5) % 61) / 100),
      focalY: 0.24 + (((hash >>> 12) % 53) / 100),
      zoom: 1.02 + (((hash >>> 19) % 10) / 100),
      mirror: Boolean((hash >>> 29) & 1),
    }),
    motion: Object.freeze({
      profile: motionProfile,
      direction: ((hash >>> 9) & 1) ? 1 : -1,
      stagger: (hash >>> 16) % 5,
    }),
  });
}

export const SKILL_VISUALS = Object.freeze(Object.fromEntries(
  SKILL_VISUAL_ROWS.map((row, index) => {
    const visual = createVisual(row, index);
    return [visual.id, visual];
  }),
));

export const SKILL_VISUAL_IDS = Object.freeze(Object.keys(SKILL_VISUALS));

export function skillVisualFor(skillOrId) {
  const id = typeof skillOrId === 'string' ? skillOrId : skillOrId && skillOrId.id;
  return id ? (SKILL_VISUALS[id] || null) : null;
}

export function skillVisualEntries() {
  return SKILL_VISUAL_IDS.map((id) => SKILL_VISUALS[id]);
}

export function skillVisualCoverage(skillIds) {
  const requested = Array.from(new Set((skillIds || []).filter(Boolean)));
  const missing = requested.filter((id) => !SKILL_VISUALS[id]);
  const unexpected = SKILL_VISUAL_IDS.filter((id) => !requested.includes(id));
  return Object.freeze({ complete: missing.length === 0, missing, unexpected });
}

export function assertSkillVisualCoverage(skillIds) {
  const coverage = skillVisualCoverage(skillIds);
  if (!coverage.complete) {
    throw new Error(`Missing skill visuals: ${coverage.missing.join(', ')}`);
  }
  return coverage;
}
