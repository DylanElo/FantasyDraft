/* Reproducible, browser-local state fixture for the mobile visual QA pack.
 * Load only through the local page's developer console/CDP Runtime.evaluate.
 * It mutates the in-memory Phaser store and never sends or persists data.
 */
(() => {
  function store() {
    const current = window.__phaserShellDebug && window.__phaserShellDebug.store;
    if (!current) throw new Error('JJK Phaser debug store is not ready.');
    return current;
  }

  function fighter(current, characterId) {
    const spec = current.character(characterId);
    return {
      character_id: characterId,
      name: spec.name,
      alive: true,
      hp: 100,
      max_hp: 100,
      destructible_defense: 0,
      statuses: [],
      cooldowns: {},
      skill_replacements: {},
      base_skill_ids: (spec.skills || []).map((skill) => skill.id),
    };
  }

  function battle(current, options = {}) {
    const mine = current.playerId || 'qa-player';
    const enemy = 'qa-enemy';
    const playerIds = ['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki'];
    const enemyIds = ['maki_zenin', 'panda', 'mai_zenin'];
    return {
      state_revision: 7,
      turn_number: options.turnNumber || 3,
      phase: options.phase || 'planning',
      turn_player_id: mine,
      winner_id: options.winnerId || null,
      result_type: options.resultType || null,
      paused: false,
      phase_seconds_remaining: 41,
      domain: null,
      event_log: options.eventLog || [],
      pending_actions: {},
      players: {
        [mine]: {
          id: mine,
          name: 'Player',
          team: playerIds.map((id) => fighter(current, id)),
          active_slots: [0, 1, 2],
          energy: { green: 2, blue: 2, white: 1, red: 1 },
          queue_confirmed: false,
        },
        [enemy]: {
          id: enemy,
          name: 'Transmuted Curses',
          team: enemyIds.map((id) => fighter(current, id)),
          active_slots: [0, 1, 2],
          energy: { green: 1, blue: 1, white: 1, red: 1 },
          queue_confirmed: false,
        },
      },
    };
  }

  function resetTransient(current) {
    current.actions = [];
    current.actionWildPays = {};
    current.queueReviewOpen = false;
    current.queueSubmitting = false;
    current.selectedCasterSlot = null;
    current.selectedSkillId = null;
    current.detailSkillId = null;
    current.detailCharacterId = null;
    current.connectionState = 'connected';
    current.toast = '';
  }

  function seedLongNameTeam(current) {
    current.playerTeam = [
      'satoru_gojo_young',
      'suguru_geto_young',
      'shoko_ieiri_young',
    ];
  }

  window.applyJjkVisualQaState = (name) => {
    const current = store();
    resetTransient(current);

    if (name === 'first-creation-roster') {
      current.state = null;
      seedLongNameTeam(current);
      current.draftPage = 999;
      current.changeScene('FirstCreationScene');
      return;
    }

    if (name === 'first-creation-detail') {
      current.state = null;
      seedLongNameTeam(current);
      current.detailCharacterId = 'yuta_okkotsu_jjk0';
      current.changeScene('FirstCreationScene');
      return;
    }

    const state = battle(current, name === 'result' ? {
      phase: 'finished',
      resultType: 'WIN',
      winnerId: current.playerId || 'qa-player',
      turnNumber: 9,
      eventLog: [
        { type: 'damage', message: 'Black Flash dealt 45 damage', payload: { amount: 45 } },
        { type: 'damage', message: 'Nail Barrage dealt 30 damage', payload: { amount: 30 } },
        { type: 'damage', message: 'Divine Dogs dealt 20 damage', payload: { amount: 20 } },
      ],
    } : {});
    current.state = state;

    if (name === 'queue-review') {
      const mine = current.playerId || 'qa-player';
      const enemy = 'qa-enemy';
      const skills = state.players[mine].team.map((member, index) => {
        const kit = current.character(member.character_id).skills;
        if (index === 0) return kit.find((skill) => (skill.cost || []).includes('black')) || kit[0];
        return kit[0];
      });
      current.actions = skills.map((skill, index) => ({
        id: `qa-action-${index + 1}`,
        caster_slot: index,
        skill_id: skill.id,
        target_player_id: enemy,
        target_slot: index === 1 ? 1 : 0,
        target_slots: [],
      }));
      current.queueReviewOpen = true;
      current.selectedCasterSlot = null;
      current.changeScene('CombatScene');
      return;
    }

    if (name === 'skill-detail') {
      current.selectedCasterSlot = 0;
      const yujiSkills = current.character('yuji_itadori').skills;
      current.detailSkillId = [...yujiSkills].sort((a, b) => b.name.length - a.name.length)[0].id;
      current.changeScene('CombatScene');
      return;
    }

    if (name === 'result') {
      current.records = [{
        result: 'Victory',
        turns: 9,
        damage: 95,
        biggest: [
          { message: 'Black Flash dealt 45 damage', amount: 45 },
          { message: 'Nail Barrage dealt 30 damage', amount: 30 },
          { message: 'Divine Dogs dealt 20 damage', amount: 20 },
        ],
      }];
      current.changeScene('ResultScene');
      return;
    }

    throw new Error(`Unknown visual QA state: ${name}`);
  };
})();
