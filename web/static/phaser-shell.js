(function () {
  'use strict';

  const COLORS = {
    bg: 0x050711,
    panel: 0x0b1020,
    panel2: 0x111827,
    line: 0x273449,
    text: '#f8fafc',
    muted: '#94a3b8',
    cyan: 0x22d3ee,
    purple: 0xa855f7,
    gold: 0xf59e0b,
    red: 0xef4444,
    green: 0x22c55e,
    white: 0xf8fafc,
    blue: 0x3b82f6,
    black: 0x111827,
  };

  const ENERGY_COLORS = {
    green: 0x22c55e,
    red: 0xef4444,
    blue: 0x3b82f6,
    white: 0xf8fafc,
    black: 0x111827,
  };

  const BOOT = {
    playerId: typeof PLAYER_SESSION_ID !== 'undefined' ? PLAYER_SESSION_ID : 'player',
    battleV2Enabled: typeof BATTLE_V2_ENABLED !== 'undefined' ? BATTLE_V2_ENABLED : false,
    roster: typeof BATTLE_V2_STARTER_ROSTER !== 'undefined' ? BATTLE_V2_STARTER_ROSTER : {},
    firstCreation: typeof FIRST_CREATION !== 'undefined' ? FIRST_CREATION : {},
  };

  const LOCAL_PORTRAIT_FILES = new Set([
    'aoi-todo.svg',
    'gojo-unsealed.svg',
    'gojo-young.svg',
    'hiromi-higuruma.svg',
    'kenjaku.svg',
    'mahito.svg',
    'maki-zenin.svg',
    'megumi-fushiguro.svg',
    'nobara-kugisaki.svg',
    'sukuna-full-power.svg',
    'sukuna-heian-era.svg',
    'uraume.svg',
    'yuji-awakened.svg',
    'yuji-black-flash.svg',
    'yuta-gojo-s-body.svg',
    'yuta-okkotsu-jjk-0.svg',
    'yuta-okkotsu-sendai.svg',
  ]);

  function safeText(value, fallback = '') {
    return String(value === undefined || value === null || value === '' ? fallback : value);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function initials(name) {
    return safeText(name, '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  function readStorage(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Local storage is optional for play.
    }
  }

  function firstCreationRoster() {
    return (BOOT.firstCreation && BOOT.firstCreation.roster) || BOOT.roster || {};
  }

  function preset(name, fallback) {
    const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
    return Array.isArray(presets[name]) ? presets[name].slice(0, 3) : fallback.slice(0, 3);
  }

  function imageKeyFor(id) {
    return `portrait_${safeText(id).replace(/[^a-z0-9_]+/gi, '_')}`;
  }

  function portraitFileFor(id) {
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

  function eventAmount(event) {
    const direct = Number(event && (event.amount || event.damage || (event.payload && (event.payload.amount || event.payload.damage))));
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = safeText(event && event.message).match(/(?:-|for\s+)(\d+)/i);
    return match ? Number(match[1]) : 0;
  }

  function eventTone(event) {
    const type = safeText(event && event.type);
    if (type.includes('heal')) return 'heal';
    if (type.includes('damage') || eventAmount(event)) return 'damage';
    if (type.includes('status')) return 'status';
    if (type.includes('turn')) return 'turn';
    if (type.includes('finish')) return 'finish';
    return 'neutral';
  }

  class LayoutService {
    constructor(scene) {
      this.scene = scene;
    }

    frame() {
      const width = this.scene.scale.width;
      const height = this.scene.scale.height;
      const gameWidth = Math.min(width, 430);
      const x = Math.round((width - gameWidth) / 2);
      return {
        fullWidth: width,
        fullHeight: height,
        x,
        y: 0,
        width: gameWidth,
        height,
        gutter: 16,
        top: 22,
        bottom: height - 22,
        desktop: width > 620,
      };
    }
  }

  class AssetRegistry {
    toneFor(id) {
      const tones = [COLORS.purple, COLORS.cyan, COLORS.gold, COLORS.red, COLORS.green, COLORS.blue];
      let hash = 0;
      safeText(id).split('').forEach((char) => {
        hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
      });
      return tones[Math.abs(hash) % tones.length];
    }
  }

  class GameStore {
    constructor(socketClient) {
      this.socketClient = socketClient;
      this.assets = new AssetRegistry();
      this.listeners = new Set();
      this.playerId = BOOT.playerId || 'player';
      this.playerName = readStorage('jjk_player_name', 'Player');
      this.roomId = readStorage('jjk_room_id', 'lobby');
      this.matchMode = 'cpu';
      this.scene = 'LobbyScene';
      this.state = null;
      this.lobbyStatus = null;
      this.selectedCasterSlot = null;
      this.selectedSkillId = null;
      this.actions = [];
      this.queueSubmitting = false;
      this.toast = '';
      this.draftPage = 0;
      this.draftTarget = 'playerTeam';
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      this.lastActionPayloads = [];
      this.records = this.loadRecords();
      this.playerTeam = preset('story_tutorial', ['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki']);
      this.enemyTeam = preset('jjk0_beginner_special', ['yuta_okkotsu_jjk0', 'maki_zenin', 'toge_inumaki']);
      this.bindSocket();
      window.__phaserShellDebug = {
        store: this,
        getState: () => ({
          scene: this.scene,
          actionCount: this.actions.length,
          selectedCasterSlot: this.selectedCasterSlot,
          selectedSkillId: this.selectedSkillId,
          hasBattle: !!this.state,
          playbackEvents: this.playbackEvents.length,
          recentEvents: this.recentEvents.length,
        }),
      };
    }

    bindSocket() {
      this.socketClient.on('connect', () => {
        this.setStatus('Connected');
        this.notify();
      });
      this.socketClient.on('battle_v2_update', (data) => this.receiveBattleState(data));
      this.socketClient.on('battle_v2_lobby', (data) => this.receiveLobbyState(data));
      this.socketClient.on('battle_v2_error', (data) => {
        this.queueSubmitting = false;
        this.showToast(data && data.message ? data.message : 'Battle v2 error');
      });
      this.socketClient.on('battle_v2_finished', (data) => {
        this.showToast(`Battle finished: ${data && data.winner_id ? data.winner_id : 'winner decided'}`);
      });
      this.socketClient.on('message', (data) => {
        if (data && data.text) this.showToast(data.text);
      });
    }

    setStatus(text) {
      const node = document.getElementById('connection-status');
      if (node) node.textContent = text;
    }

    onChange(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    notify() {
      this.listeners.forEach((listener) => listener());
    }

    showToast(message) {
      this.toast = safeText(message);
      this.notify();
      window.setTimeout(() => {
        if (this.toast === message) {
          this.toast = '';
          this.notify();
        }
      }, 2200);
    }

    changeScene(sceneName) {
      this.scene = sceneName;
      const game = window.JJKPhaserShell && window.JJKPhaserShell.game;
      if (game && game.scene) {
        ['LobbyScene', 'DraftScene', 'CombatScene', 'ResultScene', 'RecordsScene'].forEach((key) => {
          if (key !== sceneName && game.scene.isActive(key)) game.scene.stop(key);
        });
        if (!game.scene.isActive(sceneName)) game.scene.start(sceneName);
      }
      this.notify();
    }

    rosterEntries() {
      return Object.values(firstCreationRoster()).sort((a, b) => safeText(a.name).localeCompare(safeText(b.name)));
    }

    portraitKey(characterOrId) {
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      return imageKeyFor(id || '');
    }

    missions() {
      return ((BOOT.firstCreation && BOOT.firstCreation.missions) || []).slice();
    }

    activeMission() {
      const missions = this.missions();
      const profile = (BOOT.firstCreation && BOOT.firstCreation.profile) || {};
      const completed = new Set(profile.completed_missions || []);
      return missions.find((mission) => !completed.has(mission.id)) || missions[0] || null;
    }

    character(id) {
      return firstCreationRoster()[id] || { id, name: id, skills: [] };
    }

    loadRecords() {
      try {
        return JSON.parse(localStorage.getItem('jjk_v2_records') || '[]');
      } catch (error) {
        return [];
      }
    }

    saveRecords() {
      try {
        localStorage.setItem('jjk_v2_records', JSON.stringify(this.records.slice(0, 12)));
      } catch (error) {
        // Records are non-critical.
      }
    }

    rememberResult(state) {
      if (!state || !state.winner_id || state.__recorded) return;
      state.__recorded = true;
      const mine = this.mineId();
      const iWon = state.winner_id === mine;
      const damage = (state.event_log || []).reduce((total, event) => total + eventAmount(event), 0);
      const biggest = (state.event_log || [])
        .map((event) => ({ message: event.message || event.type, amount: eventAmount(event), type: event.type }))
        .filter((event) => event.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
      this.records.unshift({
        at: new Date().toISOString(),
        result: iWon ? 'Victory' : 'Defeat',
        winner: state.players && state.players[state.winner_id] ? state.players[state.winner_id].name : state.winner_id,
        turns: state.turn_number || 0,
        damage,
        biggest,
      });
      this.records = this.records.slice(0, 12);
      this.saveRecords();
    }

    setIdentity(type, value) {
      const cleaned = safeText(value).trim();
      if (!cleaned) return;
      if (type === 'name') {
        this.playerName = cleaned.slice(0, 24);
        writeStorage('jjk_player_name', this.playerName);
      } else {
        this.roomId = cleaned.slice(0, 32);
        writeStorage('jjk_room_id', this.roomId);
      }
      this.notify();
    }

    setMatchMode(mode) {
      this.matchMode = mode === 'pvp' ? 'pvp' : 'cpu';
      this.notify();
    }

    toggleTeamPick(teamKey, characterId) {
      const team = this[teamKey].slice();
      const existing = team.indexOf(characterId);
      if (existing >= 0) {
        team.splice(existing, 1);
      } else if (team.length < 3) {
        team.push(characterId);
      } else {
        this.showToast('That trio is already full.');
        return;
      }
      this[teamKey] = team;
      this.notify();
    }

    applyPreset(name, teamKey) {
      const team = preset(name, []);
      if (team.length === 3) {
        this[teamKey] = team;
        this.notify();
      }
    }

    setDraftTarget(teamKey) {
      this.draftTarget = teamKey === 'enemyTeam' && this.matchMode === 'cpu' ? 'enemyTeam' : 'playerTeam';
      this.notify();
    }

    startMatch() {
      if (!BOOT.battleV2Enabled) {
        this.showToast('Battle v2 is disabled on this server.');
        return;
      }
      if (this.playerTeam.length !== 3 || (this.matchMode === 'cpu' && this.enemyTeam.length !== 3)) {
        this.showToast('Choose exactly 3 fighters for every active team.');
        return;
      }
      this.state = null;
      this.actions = [];
      this.selectedCasterSlot = null;
      this.selectedSkillId = null;
      this.queueSubmitting = false;
      this.lobbyStatus = null;
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      const payload = {
        room_id: this.matchMode === 'pvp' ? this.roomId : `classic_v2_${Math.random().toString(36).slice(2, 8)}`,
        player_name: this.playerName,
        player_team: this.playerTeam.slice(0, 3),
        roster_mode: 'first_creation',
      };
      if (this.matchMode === 'pvp') {
        this.socketClient.emit('battle_v2_join_pvp', payload);
      } else {
        this.socketClient.emit('battle_v2_start_classic', {
          ...payload,
          enemy_team: this.enemyTeam.slice(0, 3),
        });
      }
      this.changeScene(this.matchMode === 'pvp' ? 'DraftScene' : 'CombatScene');
    }

    receiveLobbyState(data) {
      this.state = null;
      this.lobbyStatus = data && data.status === 'cancelled' ? null : data;
      this.queueSubmitting = false;
      this.changeScene('DraftScene');
    }

    receiveBattleState(data) {
      const log = data && Array.isArray(data.event_log) ? data.event_log : [];
      const nextEvents = log.slice(this.eventCursor);
      this.eventCursor = log.length;
      if (nextEvents.length) {
        this.playbackEvents = nextEvents.slice(-6);
        this.recentEvents = log.slice(-8).reverse();
      }
      this.state = data;
      this.lobbyStatus = null;
      this.queueSubmitting = false;
      const ownPending = (data.pending_actions && data.pending_actions[this.mineId()]) || [];
      const me = this.me();
      if (ownPending.length) {
        this.actions = ownPending.map((action) => ({ ...action }));
      } else if (data.phase === 'planning' || data.phase === 'finished' || data.turn_player_id !== this.mineId() || (me && me.queue_confirmed)) {
        this.actions = [];
      }
      this.ensureSelectedCaster();
      if (data.winner_id) {
        this.rememberResult(data);
        this.changeScene('ResultScene');
      } else {
        this.changeScene('CombatScene');
      }
    }

    playerIds() {
      const ids = this.state ? Object.keys(this.state.players || {}) : [];
      const mine = ids.includes(this.playerId) ? this.playerId : ids[0];
      const enemy = ids.find((id) => id !== mine);
      return { mine, enemy };
    }

    mineId() {
      return this.playerIds().mine || this.playerId;
    }

    enemyId() {
      return this.playerIds().enemy;
    }

    me() {
      return this.state && this.state.players ? this.state.players[this.mineId()] : null;
    }

    foe() {
      return this.state && this.state.players ? this.state.players[this.enemyId()] : null;
    }

    isMyTurn() {
      return !!this.state && this.state.turn_player_id === this.mineId() && this.state.phase !== 'finished';
    }

    controlsLocked() {
      const me = this.me();
      return !this.isMyTurn() || this.queueSubmitting || !!(me && me.queue_confirmed);
    }

    livingSlots(player) {
      return (player && player.team ? player.team : [])
        .map((character, slot) => (character && character.alive ? slot : null))
        .filter((slot) => slot !== null);
    }

    queuedSlots() {
      return new Set(this.actions.map((action) => Number(action.caster_slot)));
    }

    ensureSelectedCaster() {
      const me = this.me();
      if (!this.isMyTurn() || !me || this.controlsLocked()) return;
      const queued = this.queuedSlots();
      const current = me.team && me.team[this.selectedCasterSlot];
      if (current && current.alive && !queued.has(Number(this.selectedCasterSlot))) return;
      const nextSlot = (me.team || []).findIndex((character, slot) => character.alive && !queued.has(slot));
      this.selectedCasterSlot = nextSlot >= 0 ? nextSlot : null;
      this.selectedSkillId = null;
    }

    skillFor(character, skillId) {
      const catalog = this.state && this.state.skill_catalog ? this.state.skill_catalog[character.character_id] : null;
      const roster = this.character(character.character_id);
      const skills = (catalog && catalog.skills) || (roster && roster.skills) || [];
      return skills.find((skill) => skill.id === skillId || skill.original_slot_id === skillId) || null;
    }

    skillsFor(character) {
      const catalog = this.state && this.state.skill_catalog ? this.state.skill_catalog[character.character_id] : null;
      const roster = this.character(character.character_id);
      return (catalog && catalog.skills) || (roster && roster.skills) || [];
    }

    selectedSkill() {
      const me = this.me();
      const caster = me && me.team ? me.team[this.selectedCasterSlot] : null;
      return caster && this.selectedSkillId ? this.skillFor(caster, this.selectedSkillId) : null;
    }

    effectLine(skill) {
      if (!skill) return '';
      if (skill.text) return skill.text;
      const effect = (skill.effects || [])[0] || {};
      if (effect.type === 'damage') return `Deal ${effect.amount || 0} ${effect.damage_type || ''} damage.`;
      if (effect.type === 'heal') return `Heal ${effect.amount || 0} HP.`;
      if (effect.type === 'apply_status') return `Apply ${(effect.payload && effect.payload.name) || effect.status || 'status'}.`;
      return safeText(skill.description || skill.name, 'Tactical skill.');
    }

    targetLabel(skill) {
      const kind = (skill && skill.target_rule && skill.target_rule.kind) || 'enemy';
      if (kind === 'enemy_team') return 'Enemy team';
      if (kind === 'ally_team') return 'Ally team';
      if (kind === 'ally') return 'Ally';
      if (kind === 'self') return 'Self';
      return 'Enemy';
    }

    canTarget(character, slot, side) {
      if (!character || !character.alive || this.controlsLocked() || this.selectedCasterSlot === null || !this.selectedSkillId) return false;
      const skill = this.selectedSkill();
      const kind = (skill && skill.target_rule && skill.target_rule.kind) || 'enemy';
      if (kind === 'enemy') return side === 'enemy';
      if (kind === 'ally') {
        const allowSelf = !!(skill && skill.target_rule && skill.target_rule.allow_self);
        return side === 'mine' && (allowSelf || slot !== this.selectedCasterSlot);
      }
      return false;
    }

    teamTargetSlots(player, skill) {
      const rule = (skill && skill.target_rule) || {};
      const slots = this.livingSlots(player);
      const maxTargets = rule.max_targets || slots.length;
      return slots.slice(0, maxTargets);
    }

    selectCaster(slot) {
      if (this.controlsLocked()) return;
      const me = this.me();
      const fighter = me && me.team ? me.team[slot] : null;
      if (!fighter || !fighter.alive || this.queuedSlots().has(Number(slot))) {
        this.showToast('That fighter cannot queue another action.');
        return;
      }
      this.selectedCasterSlot = slot;
      this.selectedSkillId = null;
      this.notify();
    }

    selectSkill(skillId) {
      if (this.controlsLocked()) return;
      const me = this.me();
      const foe = this.foe();
      const caster = me && me.team ? me.team[this.selectedCasterSlot] : null;
      const skill = caster ? this.skillFor(caster, skillId) : null;
      if (!caster || !skill) {
        this.showToast('Select a ready fighter first.');
        return;
      }
      const cooldown = (caster.cooldowns && caster.cooldowns[skill.id]) || 0;
      const fit = this.skillFit(skill);
      if (cooldown > 0) {
        this.showToast(`Cooldown ${cooldown} turns.`);
        return;
      }
      if (!fit.ok) {
        this.showToast(fit.reason);
        return;
      }
      const kind = (skill.target_rule && skill.target_rule.kind) || 'enemy';
      this.selectedSkillId = skill.id;
      if (kind === 'self') {
        this.addAction(this.selectedCasterSlot, skill.id, this.mineId(), this.selectedCasterSlot, []);
        return;
      }
      if (kind === 'enemy_team') {
        this.addAction(this.selectedCasterSlot, skill.id, this.enemyId(), null, this.teamTargetSlots(foe, skill));
        return;
      }
      if (kind === 'ally_team') {
        this.addAction(this.selectedCasterSlot, skill.id, this.mineId(), null, this.teamTargetSlots(me, skill));
        return;
      }
      this.showToast(kind === 'ally' ? 'Choose a glowing ally.' : 'Choose a glowing enemy.');
      this.notify();
    }

    target(side, slot) {
      if (this.controlsLocked()) return;
      if (this.selectedCasterSlot === null || !this.selectedSkillId) {
        if (side === 'mine') this.selectCaster(slot);
        return;
      }
      const player = side === 'enemy' ? this.foe() : this.me();
      const target = player && player.team ? player.team[slot] : null;
      if (!this.canTarget(target, slot, side)) {
        this.showToast('Illegal target for that skill.');
        return;
      }
      this.addAction(this.selectedCasterSlot, this.selectedSkillId, side === 'enemy' ? this.enemyId() : this.mineId(), slot, []);
    }

    addAction(casterSlot, skillId, targetPlayerId, targetSlot, targetSlots) {
      const id = `phaser_${Date.now()}_${casterSlot}`;
      this.actions = this.actions.filter((action) => Number(action.caster_slot) !== Number(casterSlot));
      this.actions.push({
        id,
        caster_slot: casterSlot,
        skill_id: skillId,
        target_player_id: targetPlayerId,
        target_slot: targetSlot,
        target_slots: targetSlots || [],
      });
      this.selectedSkillId = null;
      this.ensureSelectedCaster();
      this.lastActionPayloads = this.pendingActionPayloads();
      this.socketClient.emit('battle_v2_submit_plan', { actions: this.lastActionPayloads });
      this.notify();
    }

    skillFit(skill) {
      const me = this.me();
      const summary = this.energySummary(me, this.actions);
      const remaining = { ...summary.remaining };
      let wildcardNeeded = summary.wildcardNeeded;
      (skill.cost || []).forEach((color) => {
        if (color === 'black') wildcardNeeded += 1;
        else remaining[color] = (remaining[color] || 0) - 1;
      });
      const short = Object.entries(remaining).filter(([, value]) => value < 0).map(([color]) => color);
      if (short.length) return { ok: false, reason: `Short on ${short.join(', ')}.` };
      const spare = Object.values(remaining).reduce((total, value) => total + Math.max(0, value), 0);
      if (spare < wildcardNeeded) return { ok: false, reason: 'Not enough energy for wildcard cost.' };
      return { ok: true, reason: '' };
    }

    energySummary(player, actions) {
      const energy = (player && player.energy) || {};
      const remaining = {
        green: Number(energy.green || 0),
        red: Number(energy.red || 0),
        blue: Number(energy.blue || 0),
        white: Number(energy.white || 0),
      };
      let wildcardNeeded = 0;
      (actions || []).forEach((action) => {
        const caster = player && player.team ? player.team[action.caster_slot] : null;
        const skill = caster ? this.skillFor(caster, action.skill_id) : null;
        (skill && skill.cost ? skill.cost : []).forEach((color) => {
          if (color === 'black') wildcardNeeded += 1;
          else remaining[color] = (remaining[color] || 0) - 1;
        });
      });
      return { remaining, wildcardNeeded };
    }

    pendingActionPayloads() {
      const me = this.me();
      const energy = me && me.energy ? {
        green: Number(me.energy.green || 0),
        red: Number(me.energy.red || 0),
        blue: Number(me.energy.blue || 0),
        white: Number(me.energy.white || 0),
      } : { green: 0, red: 0, blue: 0, white: 0 };
      const payloads = this.actions.map((action, index) => {
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.skillFor(caster, action.skill_id) : null;
        const wildcardPays = [];
        (skill && skill.cost ? skill.cost : []).forEach((color) => {
          if (color === 'black') {
            const pay = ['green', 'red', 'blue', 'white'].find((item) => energy[item] > 0);
            if (pay) {
              energy[pay] -= 1;
              wildcardPays.push(pay);
            }
          } else {
            energy[color] = (energy[color] || 0) - 1;
          }
        });
        return { ...action, queue_index: index, wildcard_pays: wildcardPays };
      });
      this.lastActionPayloads = payloads;
      return payloads;
    }

    consumePlaybackEvents() {
      const events = this.playbackEvents.slice();
      this.playbackEvents = [];
      return events;
    }

    confirmQueue() {
      if (this.controlsLocked() || !this.actions.length) return;
      this.queueSubmitting = true;
      const payloads = this.pendingActionPayloads();
      this.socketClient.emit('battle_v2_update_queue', {
        queue_order: payloads.map((action) => action.id),
        wildcard_pays: Object.fromEntries(payloads.map((action) => [action.id, action.wildcard_pays || []])),
      });
      this.socketClient.emit('battle_v2_confirm_queue', {});
      this.notify();
    }

    cancelQueue() {
      if (this.controlsLocked()) return;
      this.actions = [];
      this.selectedSkillId = null;
      this.queueSubmitting = false;
      this.socketClient.emit('battle_v2_cancel_queue', {});
      this.notify();
    }

    endTurn() {
      if (this.controlsLocked()) return;
      this.actions = [];
      this.queueSubmitting = true;
      this.socketClient.emit('battle_v2_end_turn', {});
      this.notify();
    }

    convertEnergy() {
      const me = this.me();
      if (!me || this.controlsLocked() || this.actions.length || me.energy_converted_this_turn) {
        this.showToast('Energy conversion is unavailable right now.');
        return;
      }
      const colors = ['green', 'red', 'blue', 'white'];
      const source = colors.find((color) => Number((me.energy || {})[color] || 0) >= 2);
      if (!source) {
        this.showToast('Need 2 matching energy to convert.');
        return;
      }
      const target = colors
        .filter((color) => color !== source)
        .sort((a, b) => Number((me.energy || {})[a] || 0) - Number((me.energy || {})[b] || 0))[0];
      this.socketClient.emit('battle_v2_convert_energy', { source, target });
      this.showToast(`Converting ${source} to ${target}.`);
    }

    resetToLobby() {
      if (!this.state && this.lobbyStatus && this.lobbyStatus.status === 'waiting') {
        this.socketClient.emit('battle_v2_leave_pvp', { room_id: this.lobbyStatus.room_id });
      }
      this.state = null;
      this.lobbyStatus = null;
      this.actions = [];
      this.selectedCasterSlot = null;
      this.selectedSkillId = null;
      this.queueSubmitting = false;
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      this.changeScene('LobbyScene');
    }
  }

  class SocketClient {
    constructor() {
      this.socket = window.io ? window.io() : null;
      this.offlineHandlers = {};
    }

    on(eventName, handler) {
      if (this.socket) this.socket.on(eventName, handler);
      this.offlineHandlers[eventName] = handler;
    }

    emit(eventName, payload) {
      if (this.socket) this.socket.emit(eventName, payload || {});
    }
  }

  class BaseScene extends Phaser.Scene {
    constructor(key) {
      super(key);
      this.keyName = key;
      this.buttons = [];
      this.nodes = [];
      this.layout = null;
      this.store = null;
      this.graphics = null;
      this.unsubscribe = null;
      this.lastTap = null;
    }

    create() {
      this.store = window.JJKPhaserShell.store;
      this.layout = new LayoutService(this);
      this.graphics = this.add.graphics();
      this.input.on('pointerdown', (pointer) => this.handlePointer(pointer));
      this.scale.on('resize', () => this.render());
      this.unsubscribe = this.store.onChange(() => {
        if (this.scene.isActive(this.keyName)) this.render();
      });
      this.render();
    }

    shutdown() {
      if (this.unsubscribe) this.unsubscribe();
    }

    handlePointer(pointer) {
      for (let i = this.buttons.length - 1; i >= 0; i -= 1) {
        const button = this.buttons[i];
        if (pointer.x >= button.x && pointer.x <= button.x + button.w && pointer.y >= button.y && pointer.y <= button.y + button.h) {
          this.lastTap = { x: pointer.x, y: pointer.y, t: this.time.now, disabled: !!button.disabled };
          window.dispatchEvent(new CustomEvent('jjk:ui-tap', { detail: { scene: this.keyName, disabled: !!button.disabled } }));
          if (!button.disabled) button.onClick();
          if (this.scene.isActive(this.keyName)) this.render();
          this.time.delayedCall(180, () => {
            if (this.scene.isActive(this.keyName)) this.render();
          });
          return;
        }
      }
    }

    clearSurface() {
      this.graphics.clear();
      this.nodes.forEach((node) => node.destroy());
      this.nodes = [];
      this.buttons = [];
    }

    text(x, y, value, style) {
      const node = this.add.text(x, y, safeText(value), {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '14px',
        color: COLORS.text,
        ...style,
      });
      this.nodes.push(node);
      return node;
    }

    mono(x, y, value, style) {
      return this.text(x, y, value, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: COLORS.muted,
        ...style,
      });
    }

    drawAppBg(frame) {
      const g = this.graphics;
      g.fillGradientStyle(0x020617, 0x06142d, 0x16081f, 0x030712, 1);
      g.fillRect(0, 0, frame.fullWidth, frame.fullHeight);
      g.fillStyle(0x22d3ee, 0.08);
      g.fillCircle(frame.x + frame.width * 0.18, frame.height * 0.18, frame.width * 0.45);
      g.fillStyle(0xa855f7, 0.08);
      g.fillCircle(frame.x + frame.width * 0.82, frame.height * 0.70, frame.width * 0.56);
      g.fillStyle(COLORS.bg, 0.84);
      g.fillRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.desktop ? 22 : 0);
      g.lineStyle(1, 0xffffff, frame.desktop ? 0.14 : 0);
      g.strokeRoundedRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1, frame.desktop ? 22 : 0);
      for (let i = 0; i < 14; i += 1) {
        const y = frame.y + 78 + i * 44;
        g.lineStyle(1, 0xffffff, 0.035);
        g.beginPath();
        g.moveTo(frame.x + 18, y);
        g.lineTo(frame.x + frame.width - 18, y + (i % 2 ? -12 : 12));
        g.strokePath();
      }
    }

    topBar(frame, title, backHandler) {
      this.mono(frame.x + frame.gutter, frame.top + 3, 'CURSED CLASH', {
        color: '#fde68a',
        fontSize: '11px',
        fontStyle: '700',
      });
      this.text(frame.x + frame.gutter, frame.top + 18, title, {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '25px',
        fontStyle: '900',
        color: '#f8fafc',
      });
      if (backHandler) {
        this.iconButton(frame.x + frame.width - frame.gutter - 42, frame.top + 4, 42, 36, '<', backHandler);
      }
    }

    toast(frame) {
      this.drawTapPulse();
      window.__phaserShellButtons = this.buttons.map((button) => ({
        scene: this.keyName,
        label: button.label || 'hotspot',
        x: Math.round(button.x),
        y: Math.round(button.y),
        w: Math.round(button.w),
        h: Math.round(button.h),
        disabled: !!button.disabled,
      }));
      if (!this.store.toast) return;
      const g = this.graphics;
      const x = frame.x + 18;
      const y = frame.height - 106;
      const w = frame.width - 36;
      g.fillStyle(0x111827, 0.94);
      g.fillRoundedRect(x, y, w, 48, 12);
      g.lineStyle(1.5, COLORS.gold, 0.62);
      g.strokeRoundedRect(x, y, w, 48, 12);
      this.mono(x + 14, y + 16, this.store.toast, { color: '#fde68a', fontSize: '11px' });
    }

    drawTapPulse() {
      if (!this.lastTap || this.time.now - this.lastTap.t > 180) return;
      const age = (this.time.now - this.lastTap.t) / 180;
      const radius = 10 + age * 20;
      const color = this.lastTap.disabled ? COLORS.red : COLORS.gold;
      this.graphics.lineStyle(2, color, 0.75 * (1 - age));
      this.graphics.strokeCircle(this.lastTap.x, this.lastTap.y, radius);
    }

    button(x, y, w, h, label, onClick, options) {
      const opts = options || {};
      const g = this.graphics;
      const fill = opts.fill === undefined ? COLORS.panel2 : opts.fill;
      const stroke = opts.stroke === undefined ? COLORS.line : opts.stroke;
      const alpha = opts.disabled ? 0.42 : (opts.alpha === undefined ? 0.96 : opts.alpha);
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(x, y, w, h, opts.radius === undefined ? 10 : opts.radius);
      g.lineStyle(opts.strokeWidth || 1.5, stroke, opts.strokeAlpha === undefined ? 0.75 : opts.strokeAlpha);
      g.strokeRoundedRect(x, y, w, h, opts.radius === undefined ? 10 : opts.radius);
      const text = this.text(x + w / 2, y + h / 2 - 8, label, {
        fontFamily: opts.mono ? '"JetBrains Mono", monospace' : 'Inter, Arial, sans-serif',
        fontSize: opts.fontSize || '13px',
        fontStyle: '800',
        color: opts.color || COLORS.text,
        align: 'center',
      }).setOrigin(0.5, 0);
      if (opts.maxWidth) text.setWordWrapWidth(opts.maxWidth);
      this.buttons.push({ x, y, w, h, label, onClick, disabled: !!opts.disabled });
      window.__phaserShellButtons = this.buttons.map((button) => ({
        scene: this.keyName,
        label: button.label,
        x: Math.round(button.x),
        y: Math.round(button.y),
        w: Math.round(button.w),
        h: Math.round(button.h),
        disabled: button.disabled,
      }));
    }

    iconButton(x, y, w, h, label, onClick, options) {
      this.button(x, y, w, h, label, onClick, {
        fill: COLORS.panel,
        stroke: COLORS.line,
        fontSize: '16px',
        mono: true,
        ...(options || {}),
      });
    }

    cardPanel(x, y, w, h, tone, alpha) {
      const g = this.graphics;
      g.fillStyle(COLORS.panel, alpha === undefined ? 0.88 : alpha);
      g.fillRoundedRect(x, y, w, h, 12);
      g.lineStyle(1.5, tone || COLORS.line, 0.46);
      g.strokeRoundedRect(x, y, w, h, 12);
    }

    energyOrbs(x, y, energy, size) {
      const colors = ['green', 'red', 'blue', 'white'];
      colors.forEach((color, index) => {
        const count = Number((energy && energy[color]) || 0);
        const cx = x + index * (size + 12);
        this.graphics.fillStyle(ENERGY_COLORS[color], count ? 0.95 : 0.12);
        this.graphics.fillCircle(cx, y, size / 2);
        this.graphics.lineStyle(1, ENERGY_COLORS[color], 0.75);
        this.graphics.strokeCircle(cx, y, size / 2);
        this.mono(cx + size / 2 + 2, y - 7, String(count), { fontSize: '10px', color: '#e2e8f0' });
      });
    }

    portrait(characterOrId, x, y, size, options) {
      const opts = options || {};
      const id = typeof characterOrId === 'string'
        ? characterOrId
        : (characterOrId && (characterOrId.id || characterOrId.character_id));
      const name = typeof characterOrId === 'string'
        ? safeText(this.store.character(characterOrId).name, characterOrId)
        : safeText(characterOrId && characterOrId.name, id);
      const key = this.store.portraitKey(id);
      const tone = this.store.assets.toneFor(id || name);
      this.graphics.fillStyle(tone, opts.dead ? 0.13 : 0.22);
      this.graphics.fillCircle(x + size / 2, y + size / 2, size / 2);
      this.graphics.lineStyle(opts.selected ? 3 : 1.5, opts.tone || tone, opts.targetable ? 1 : 0.72);
      this.graphics.strokeCircle(x + size / 2, y + size / 2, size / 2);
      if (this.textures.exists(key)) {
        const image = this.add.image(x + size / 2, y + size / 2, key);
        image.setDisplaySize(size - 6, size - 6);
        image.setAlpha(opts.dead ? 0.38 : 0.96);
        this.nodes.push(image);
      } else {
        this.text(x + size / 2, y + size / 2 - 11, initials(name), {
          fontSize: `${Math.max(18, Math.round(size * 0.32))}px`,
          fontStyle: '900',
        }).setOrigin(0.5, 0);
      }
    }

    render() {}
  }

  class BootScene extends BaseScene {
    constructor() {
      super('BootScene');
    }

    preload() {
      Object.keys(firstCreationRoster()).forEach((id) => {
        const file = portraitFileFor(id);
        if (LOCAL_PORTRAIT_FILES.has(file)) {
          this.load.svg(imageKeyFor(id), `/static/assets/portraits/${file}`, { width: 192, height: 192 });
        }
      });
    }

    create() {
      this.store = window.JJKPhaserShell.store;
      this.scene.start('LobbyScene');
    }
  }

  class LobbyScene extends BaseScene {
    constructor() {
      super('LobbyScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.topBar(frame, 'Mobile Arena');
      const x = frame.x + frame.gutter;
      let y = 92;
      this.cardPanel(x, y, frame.width - 32, 126, COLORS.purple, 0.78);
      this.text(x + 18, y + 18, 'CURSED CLASH', {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '34px',
        fontStyle: '900',
      });
      this.mono(x + 20, y + 60, 'Portrait Phaser shell / server-authoritative combat', { color: '#c4b5fd' });
      this.button(x + 18, y + 84, (frame.width - 72) / 2, 28, `Name: ${this.store.playerName}`, () => {
        const next = window.prompt('Player name', this.store.playerName);
        if (next !== null) this.store.setIdentity('name', next);
      }, { fill: 0x161b2f, stroke: COLORS.purple, fontSize: '11px', mono: true });
      this.button(x + 36 + (frame.width - 72) / 2, y + 84, (frame.width - 72) / 2, 28, `Room: ${this.store.roomId}`, () => {
        const next = window.prompt('Room code', this.store.roomId);
        if (next !== null) this.store.setIdentity('room', next);
      }, { fill: 0x161b2f, stroke: COLORS.cyan, fontSize: '11px', mono: true });

      y += 150;
      this.button(x, y, frame.width - 32, 96, 'Quick Play', () => {
        this.store.setMatchMode('cpu');
        this.store.changeScene('DraftScene');
      }, { fill: 0x182033, stroke: COLORS.gold, fontSize: '20px' });
      this.mono(x + 18, y + 62, 'Draft your trio and fight a CPU team immediately.', { color: '#fde68a' });

      y += 112;
      this.button(x, y, frame.width - 32, 72, 'Private PvP', () => {
        this.store.setMatchMode('pvp');
        this.store.changeScene('DraftScene');
      }, { fill: 0x081f2b, stroke: COLORS.cyan, fontSize: '18px' });
      this.mono(x + 18, y + 48, 'Uses the same room code. Opponent joins separately.', { color: '#a5f3fc' });

      y += 88;
      const half = (frame.width - 44) / 2;
      this.button(x, y, half, 58, 'Roster', () => this.store.changeScene('DraftScene'), { fill: 0x101827, stroke: COLORS.line });
      this.button(x + half + 12, y, half, 58, 'Records', () => this.store.changeScene('RecordsScene'), { fill: 0x101827, stroke: COLORS.green });

      y += 84;
      this.cardPanel(x, y, frame.width - 32, 118, COLORS.line, 0.66);
      this.mono(x + 16, y + 14, 'RECENT RECORDS', { color: '#cbd5e1' });
      const records = this.store.records.slice(0, 3);
      if (!records.length) {
        this.mono(x + 16, y + 48, 'No finished domains yet.', { color: '#64748b' });
      } else {
        records.forEach((record, index) => {
          this.mono(x + 16, y + 42 + index * 22, `${record.result} / ${record.turns}T / ${record.damage} DMG`, {
            color: record.result === 'Victory' ? '#86efac' : '#fca5a5',
          });
        });
      }
      this.toast(frame);
    }
  }

  class DraftScene extends BaseScene {
    constructor() {
      super('DraftScene');
    }

    renderTeamDock(frame, y) {
      const x = frame.x + frame.gutter;
      const slotW = (frame.width - 64) / 3;
      this.mono(x, y - 18, this.store.matchMode === 'pvp' ? 'MY PRIVATE DOMAIN TRIO' : 'MY TRIO', { color: '#bfdbfe' });
      this.store.playerTeam.forEach((id, index) => this.renderDraftSlot(x + index * (slotW + 8), y, slotW, id, index, COLORS.cyan));
      if (this.store.matchMode === 'cpu') {
        this.mono(x, y + 68, 'CPU TRIO', { color: '#fca5a5' });
        this.store.enemyTeam.forEach((id, index) => this.renderDraftSlot(x + index * (slotW + 8), y + 86, slotW, id, index, COLORS.red));
      } else if (this.store.lobbyStatus && this.store.lobbyStatus.status === 'waiting') {
        this.mono(x, y + 74, `Waiting in room ${this.store.lobbyStatus.room_id}.`, { color: '#a5f3fc' });
      }
    }

    renderDraftSlot(x, y, w, id, index, tone) {
      const character = this.store.character(id);
      this.cardPanel(x, y, w, 54, tone, 0.7);
      this.portrait(character, x + 6, y + 9, 34, { tone });
      this.mono(x + 8, y + 7, `S${index + 1}`, { color: '#e2e8f0', fontSize: '9px' });
      this.text(x + 46, y + 13, safeText(character.name, id), {
        fontSize: '11px',
        fontStyle: '800',
        wordWrap: { width: w - 52 },
      });
    }

    renderRosterCard(character, x, y, w, h, teamKey) {
      const selected = this.store[teamKey].includes(character.id);
      const tone = selected ? (teamKey === 'playerTeam' ? COLORS.cyan : COLORS.red) : this.store.assets.toneFor(character.id);
      this.cardPanel(x, y, w, h, tone, selected ? 0.94 : 0.74);
      this.portrait(character, x + 10, y + 12, 48, { tone, selected });
      this.text(x + 68, y + 12, character.name, {
        fontSize: '12px',
        fontStyle: '800',
        wordWrap: { width: w - 78 },
      });
      this.mono(x + 68, y + 43, character.role || 'Fighter', { fontSize: '9px', color: '#cbd5e1' });
      this.mono(x + 10, y + 72, ((character.skills || [])[0] || {}).name || 'Skill kit', {
        fontSize: '9px',
        color: selected ? '#fde68a' : '#94a3b8',
      });
      if (selected) {
        this.mono(x + w - 44, y + h - 22, 'LOCKED', { color: '#86efac', fontSize: '9px' });
      }
      this.buttons.push({ x, y, w, h, label: `Roster ${character.name}`, onClick: () => this.store.toggleTeamPick(this.store.draftTarget, character.id) });
    }

    renderMissionPreview(frame, y) {
      const mission = this.store.activeMission();
      if (!mission) return 0;
      const x = frame.x + frame.gutter;
      this.cardPanel(x, y, frame.width - 32, 76, COLORS.gold, 0.62);
      this.mono(x + 12, y + 10, 'MISSION OBJECTIVE', { color: '#fde68a', fontSize: '9px' });
      this.text(x + 12, y + 27, mission.title || mission.id, { fontSize: '13px', fontStyle: '900' });
      this.mono(x + 12, y + 50, (mission.objectives || []).slice(0, 2).join(' / ') || mission.description || 'Win the domain.', {
        color: '#cbd5e1',
        fontSize: '8px',
      });
      return 88;
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.topBar(frame, 'Draft', () => this.store.resetToLobby());
      const x = frame.x + frame.gutter;
      let y = 88;
      y += this.renderMissionPreview(frame, y);
      const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
      const presetNames = Object.keys(presets).slice(0, 4);
      this.mono(x, y, 'PRESETS', { color: '#fde68a' });
      const small = (frame.width - 44) / 2;
      presetNames.slice(0, 2).forEach((name, index) => {
        this.button(x + index * (small + 12), y + 18, small, 34, name.replace(/_/g, ' '), () => this.store.applyPreset(name, 'playerTeam'), {
          fill: 0x161b2f,
          stroke: COLORS.gold,
          fontSize: '10px',
          mono: true,
        });
      });
      if (this.store.matchMode === 'cpu') {
        presetNames.slice(2, 4).forEach((name, index) => {
          this.button(x + index * (small + 12), y + 58, small, 34, `CPU ${name.replace(/_/g, ' ')}`, () => this.store.applyPreset(name, 'enemyTeam'), {
            fill: 0x1b1118,
            stroke: COLORS.red,
            fontSize: '10px',
            mono: true,
          });
        });
      }

      y += this.store.matchMode === 'cpu' ? 130 : 94;
      this.renderTeamDock(frame, y);
      y += this.store.matchMode === 'cpu' ? 166 : 88;

      const targetW = (frame.width - 44) / 2;
      this.button(x, y, targetW, 32, 'Edit Player', () => this.store.setDraftTarget('playerTeam'), {
        fill: this.store.draftTarget === 'playerTeam' ? COLORS.cyan : 0x111827,
        stroke: COLORS.cyan,
        fontSize: '10px',
        mono: true,
      });
      this.button(x + targetW + 12, y, targetW, 32, this.store.matchMode === 'cpu' ? 'Edit CPU' : 'PvP Opponent', () => this.store.setDraftTarget('enemyTeam'), {
        fill: this.store.draftTarget === 'enemyTeam' ? COLORS.red : 0x111827,
        stroke: this.store.matchMode === 'cpu' ? COLORS.red : COLORS.line,
        fontSize: '10px',
        mono: true,
        disabled: this.store.matchMode !== 'cpu',
      });
      y += 44;

      this.mono(x, y, this.store.draftTarget === 'enemyTeam' ? 'TAP ROSTER CARD TO EDIT CPU TEAM' : 'TAP ROSTER CARD TO EDIT PLAYER TEAM', { color: '#cbd5e1' });
      const roster = this.store.rosterEntries();
      const pageSize = frame.height < 900 ? 4 : 6;
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = clamp(this.store.draftPage, 0, pageMax);
      const page = roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize);
      const cardW = (frame.width - 44) / 2;
      page.forEach((character, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const teamKey = this.store.draftTarget;
        this.renderRosterCard(character, x + col * (cardW + 12), y + 24 + row * 102, cardW, 90, teamKey);
      });
      const navY = Math.min(frame.height - 88, y + 340);
      this.button(x, navY, 74, 38, 'Prev', () => {
        this.store.draftPage = Math.max(0, this.store.draftPage - 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === 0, fill: 0x111827, mono: true });
      this.mono(x + 88, navY + 12, `Page ${this.store.draftPage + 1}/${pageMax + 1}`, { color: '#94a3b8' });
      this.button(x + frame.width - 106, navY, 74, 38, 'Next', () => {
        this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
        this.store.notify();
      }, { disabled: this.store.draftPage === pageMax, fill: 0x111827, mono: true });

      this.button(x, frame.height - 62, frame.width - 32, 46, this.store.lobbyStatus ? 'Waiting For Opponent' : 'Ignite Battle', () => this.store.startMatch(), {
        fill: this.store.lobbyStatus ? 0x1f2937 : COLORS.purple,
        stroke: this.store.lobbyStatus ? COLORS.cyan : COLORS.gold,
        fontSize: '15px',
        disabled: !!this.store.lobbyStatus,
      });
      this.toast(frame);
    }
  }

  class CombatScene extends BaseScene {
    constructor() {
      super('CombatScene');
    }

    renderFighter(character, side, slot, x, y, w, h) {
      const store = this.store;
      const selected = side === 'mine' && store.selectedCasterSlot === slot;
      const queuedIndex = store.actions.findIndex((action) => Number(action.caster_slot) === slot);
      const targetable = store.canTarget(character, slot, side);
      const dead = !character || !character.alive;
      const tone = targetable ? COLORS.gold : selected ? COLORS.purple : queuedIndex >= 0 ? COLORS.green : side === 'enemy' ? COLORS.red : COLORS.cyan;
      this.cardPanel(x, y, w, h, tone, dead ? 0.38 : 0.82);
      this.portrait(character, x + w / 2 - 30, y + 8, 60, { tone, dead, selected, targetable });
      const hpPct = clamp(Number(character.hp || 0) / Math.max(1, Number(character.max_hp || 1)), 0, 1);
      this.graphics.fillStyle(0x020617, 0.85);
      this.graphics.fillRoundedRect(x + 10, y + 70, w - 20, 8, 4);
      this.graphics.fillStyle(hpPct <= 0.3 ? COLORS.red : hpPct <= 0.6 ? COLORS.gold : COLORS.green, 1);
      this.graphics.fillRoundedRect(x + 10, y + 70, (w - 20) * hpPct, 8, 4);
      this.text(x + w / 2, y + 84, character.name, {
        fontSize: '11px',
        fontStyle: '800',
        align: 'center',
        wordWrap: { width: w - 12 },
      }).setOrigin(0.5, 0);
      this.mono(x + w / 2, y + h - 20, dead ? 'DOWN' : queuedIndex >= 0 ? `Q${queuedIndex + 1}` : `${character.hp}/${character.max_hp}`, {
        color: targetable ? '#fde68a' : dead ? '#64748b' : '#cbd5e1',
        fontSize: '9px',
      }).setOrigin(0.5, 0);
      (character.statuses || []).slice(0, 2).forEach((status, index) => {
        this.graphics.fillStyle(0x020617, 0.82);
        this.graphics.fillRoundedRect(x + 8, y + 8 + index * 17, w - 16, 14, 7);
        this.graphics.lineStyle(1, COLORS.purple, 0.52);
        this.graphics.strokeRoundedRect(x + 8, y + 8 + index * 17, w - 16, 14, 7);
        this.mono(x + 14, y + 10 + index * 17, safeText(status.name || status.id, 'status').slice(0, 12), {
          color: '#ddd6fe',
          fontSize: '8px',
        });
      });
      this.buttons.push({ x, y, w, h, label: `${side} ${slot}`, onClick: () => store.target(side, slot), disabled: false });
    }

    renderTeam(team, side, frame, y) {
      const x = frame.x + frame.gutter;
      const gap = 8;
      const w = (frame.width - 32 - gap * 2) / 3;
      this.mono(x, y - 18, side === 'enemy' ? 'ENEMY TEAM' : 'PLAYER TEAM', {
        color: side === 'enemy' ? '#fca5a5' : '#bfdbfe',
      });
      (team || []).forEach((character, slot) => {
        this.renderFighter(character, side, slot, x + slot * (w + gap), y, w, 124);
      });
    }

    renderSkillCard(skill, caster, x, y, w, h) {
      const cooldown = (caster.cooldowns && caster.cooldowns[skill.id]) || 0;
      const fit = this.store.skillFit(skill);
      const disabled = cooldown > 0 || !fit.ok || this.store.queuedSlots().has(Number(this.store.selectedCasterSlot)) || this.store.controlsLocked();
      const selected = this.store.selectedSkillId === skill.id;
      const tone = selected ? COLORS.gold : (ENERGY_COLORS[(skill.cost || [])[0]] || COLORS.purple);
      this.cardPanel(x, y, w, h, tone, disabled ? 0.38 : 0.86);
      this.mono(x + 10, y + 9, this.store.targetLabel(skill).toUpperCase(), { color: '#cbd5e1', fontSize: '9px' });
      this.text(x + 10, y + 24, skill.name, {
        fontSize: '12px',
        fontStyle: '900',
        wordWrap: { width: w - 20 },
      });
      (skill.cost || []).slice(0, 4).forEach((color, index) => {
        this.graphics.fillStyle(ENERGY_COLORS[color] || COLORS.gold, 0.95);
        this.graphics.fillCircle(x + 14 + index * 14, y + h - 16, 5);
      });
      this.mono(x + 10, y + 62, cooldown > 0 ? `CD ${cooldown}` : fit.ok ? this.store.effectLine(skill).slice(0, 45) : fit.reason, {
        color: disabled ? '#94a3b8' : '#fde68a',
        fontSize: '8px',
      });
      this.buttons.push({ x, y, w, h, label: `Skill ${skill.name}`, disabled, onClick: () => this.store.selectSkill(skill.id) });
    }

    renderQueue(frame, y) {
      const x = frame.x + frame.gutter;
      this.mono(x, y, `QUEUE ${this.store.actions.length}/3`, { color: '#86efac' });
      if (!this.store.actions.length) {
        this.mono(x + 82, y, 'Tap ally -> skill -> target.', { color: '#94a3b8' });
        return;
      }
      const me = this.store.me();
      this.store.actions.forEach((action, index) => {
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.store.skillFor(caster, action.skill_id) : null;
        this.mono(x, y + 18 + index * 18, `${index + 1}. ${caster ? caster.name : 'Fighter'} / ${skill ? skill.name : action.skill_id}`, {
          color: '#e2e8f0',
          fontSize: '9px',
        });
      });
    }

    renderReplay(frame, y) {
      const events = this.store.recentEvents.slice(0, 3);
      if (!events.length) return;
      const x = frame.x + frame.gutter;
      this.cardPanel(x, y, frame.width - 32, 54, COLORS.line, 0.55);
      this.mono(x + 12, y + 8, 'REPLAY', { color: '#fde68a', fontSize: '8px' });
      events.forEach((event, index) => {
        const tone = eventTone(event);
        const color = tone === 'damage' ? '#fca5a5' : tone === 'heal' ? '#86efac' : tone === 'status' ? '#c4b5fd' : '#cbd5e1';
        this.mono(x + 70, y + 8 + index * 14, safeText(event.message || event.type).slice(0, 42), {
          color,
          fontSize: '8px',
        });
      });
    }

    playEvents(frame) {
      const events = this.store.consumePlaybackEvents();
      if (!events.length) return;
      events.slice(0, 5).forEach((event, index) => {
        this.time.delayedCall(index * 260, () => this.playEvent(event, frame));
      });
    }

    playEvent(event, frame) {
      const tone = eventTone(event);
      const amount = eventAmount(event);
      const color = tone === 'damage'
        ? '#fca5a5'
        : tone === 'heal'
          ? '#86efac'
          : tone === 'status'
            ? '#c4b5fd'
            : '#fde68a';
      const x = frame.x + frame.width / 2;
      const y = tone === 'heal' ? 400 : tone === 'turn' ? 250 : 188;
      const banner = this.add.text(x, y - 26, safeText(event.message || event.type).slice(0, 44), {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        fontStyle: '800',
        color,
        backgroundColor: '#020617',
        padding: { x: 10, y: 6 },
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(20);
      const floater = this.add.text(x, y + 10, amount ? (tone === 'heal' ? `+${amount}` : `-${amount}`) : safeText(event.type, 'EVENT').replace(/_/g, ' ').toUpperCase(), {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: amount ? '26px' : '18px',
        fontStyle: '900',
        color,
      }).setOrigin(0.5, 0.5).setDepth(21);
      if (tone === 'damage') {
        this.cameras.main.shake(150, 0.006);
      }
      this.tweens.add({
        targets: [banner, floater],
        y: '-=34',
        alpha: 0,
        duration: 900,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          banner.destroy();
          floater.destroy();
        },
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      const state = this.store.state;
      if (!state) {
        this.topBar(frame, 'Opening Domain', () => this.store.resetToLobby());
        this.mono(frame.x + frame.gutter, 130, 'Waiting for battle state from server...', { color: '#cbd5e1' });
        this.toast(frame);
        return;
      }
      const me = this.store.me();
      const foe = this.store.foe();
      this.topBar(frame, `Turn ${state.turn_number || 1}`, () => this.store.resetToLobby());
      this.energyOrbs(frame.x + frame.gutter + 152, 50, me && me.energy, 13);
      this.button(frame.x + frame.width - frame.gutter - 82, 42, 82, 28, 'Convert', () => this.store.convertEnergy(), {
        fill: 0x111827,
        stroke: COLORS.cyan,
        fontSize: '10px',
        mono: true,
        disabled: this.store.controlsLocked() || !!this.store.actions.length || !!(me && me.energy_converted_this_turn),
      });
      this.renderTeam(foe && foe.team, 'enemy', frame, 92);
      const prompt = state.winner_id
        ? 'Battle finished'
        : this.store.controlsLocked()
          ? 'Waiting for resolution'
          : this.store.selectedSkillId
            ? 'Tap a glowing target'
            : this.store.selectedCasterSlot !== null
              ? 'Choose a skill'
              : 'Tap an ally fighter';
      this.cardPanel(frame.x + frame.gutter, 234, frame.width - 32, 42, COLORS.gold, 0.68);
      this.mono(frame.x + frame.gutter + 14, 248, prompt.toUpperCase(), { color: '#fde68a', fontSize: '11px' });
      this.renderReplay(frame, 280);
      this.renderTeam(me && me.team, 'mine', frame, 350);
      const selected = me && me.team ? me.team[this.store.selectedCasterSlot] : null;
      const dockY = Math.max(456, frame.height - 294);
      this.cardPanel(frame.x, dockY, frame.width, frame.height - dockY, COLORS.line, 0.94);
      if (selected) {
        this.text(frame.x + frame.gutter, dockY + 16, selected.name, { fontSize: '18px', fontStyle: '900' });
        this.mono(frame.x + frame.gutter, dockY + 40, 'Skill cards show cost / cooldown / target / effect.', { color: '#94a3b8' });
        const skills = this.store.skillsFor(selected).slice(0, 4);
        const cardW = (frame.width - 44) / 2;
        skills.forEach((skill, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          this.renderSkillCard(skill, selected, frame.x + frame.gutter + col * (cardW + 12), dockY + 62 + row * 86, cardW, 76);
        });
      } else {
        this.text(frame.x + frame.gutter, dockY + 22, 'Awaiting Command', { fontSize: '18px', fontStyle: '900' });
        this.mono(frame.x + frame.gutter, dockY + 50, 'Start by tapping one of your living fighters.', { color: '#94a3b8' });
      }
      this.renderQueue(frame, frame.height - 92);
      this.button(frame.x + frame.gutter, frame.height - 48, 86, 34, 'Cancel', () => this.store.cancelQueue(), {
        fill: 0x111827,
        stroke: COLORS.line,
        mono: true,
        disabled: !this.store.actions.length || this.store.controlsLocked(),
      });
      this.button(frame.x + frame.width - frame.gutter - 190, frame.height - 48, 82, 34, 'End', () => this.store.endTurn(), {
        fill: 0x111827,
        stroke: COLORS.line,
        mono: true,
        disabled: this.store.controlsLocked(),
      });
      this.button(frame.x + frame.width - frame.gutter - 96, frame.height - 48, 96, 34, this.store.queueSubmitting ? 'Resolving' : 'Confirm', () => this.store.confirmQueue(), {
        fill: COLORS.purple,
        stroke: COLORS.gold,
        mono: true,
        disabled: !this.store.actions.length || this.store.controlsLocked(),
      });
      this.toast(frame);
      this.playEvents(frame);
    }
  }

  class ResultScene extends BaseScene {
    constructor() {
      super('ResultScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      const state = this.store.state;
      const mine = this.store.mineId();
      const victory = state && state.winner_id === mine;
      this.topBar(frame, victory ? 'Victory' : 'Defeat', () => this.store.resetToLobby());
      const x = frame.x + frame.gutter;
      this.cardPanel(x, 108, frame.width - 32, 180, victory ? COLORS.gold : COLORS.red, 0.84);
      this.text(frame.x + frame.width / 2, 134, victory ? 'DOMAIN WON' : 'DOMAIN LOST', {
        fontFamily: 'Cinzel, Inter, serif',
        fontSize: '32px',
        fontStyle: '900',
        color: victory ? '#fde68a' : '#fca5a5',
      }).setOrigin(0.5, 0);
      const winner = state && state.players && state.players[state.winner_id] ? state.players[state.winner_id].name : 'Unknown';
      this.mono(frame.x + frame.width / 2, 184, `${winner} controls the domain`, { color: '#cbd5e1' }).setOrigin(0.5, 0);
      const last = this.store.records[0] || {};
      this.mono(x + 22, 236, `Turns: ${last.turns || (state && state.turn_number) || 0}`, { color: '#e2e8f0' });
      this.mono(x + 160, 236, `Damage: ${last.damage || 0}`, { color: '#e2e8f0' });
      this.cardPanel(x, 314, frame.width - 32, 150, COLORS.line, 0.72);
      this.mono(x + 16, 332, 'BIGGEST STRIKES', { color: '#fde68a' });
      const strikes = (last.biggest && last.biggest.length ? last.biggest : ((state && state.event_log) || [])
        .map((event) => ({ message: event.message || event.type, amount: eventAmount(event) }))
        .filter((event) => event.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3));
      if (!strikes.length) {
        this.mono(x + 16, 366, 'No strike data recorded.', { color: '#94a3b8' });
      } else {
        strikes.forEach((event, index) => {
          this.mono(x + 16, 362 + index * 26, safeText(event.message).slice(0, 44), { color: '#cbd5e1', fontSize: '9px' });
          this.mono(x + frame.width - 86, 362 + index * 26, `${event.amount} DMG`, { color: '#fca5a5', fontSize: '9px' });
        });
      }
      const mission = this.store.activeMission();
      this.cardPanel(x, 486, frame.width - 32, 92, COLORS.gold, 0.58);
      this.mono(x + 16, 503, 'MISSION ROUTE', { color: '#fde68a', fontSize: '9px' });
      this.text(x + 16, 520, mission ? mission.title : 'First Creation Progress', { fontSize: '13px', fontStyle: '900' });
      const unlocks = mission && mission.unlocks && mission.unlocks.length ? `Unlocks: ${mission.unlocks.join(' / ')}` : 'Progress saved to your profile.';
      this.mono(x + 16, 548, victory ? unlocks : 'Replay the route to clear the objective.', { color: '#cbd5e1', fontSize: '9px' });
      this.button(x, frame.height - 120, frame.width - 32, 44, 'Rematch', () => this.store.changeScene('DraftScene'), {
        fill: COLORS.panel2,
        stroke: COLORS.cyan,
      });
      this.button(x, frame.height - 62, frame.width - 32, 44, 'Lobby', () => this.store.resetToLobby(), {
        fill: COLORS.purple,
        stroke: COLORS.gold,
      });
      this.toast(frame);
    }
  }

  class RecordsScene extends BaseScene {
    constructor() {
      super('RecordsScene');
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.topBar(frame, 'Records', () => this.store.changeScene('LobbyScene'));
      const x = frame.x + frame.gutter;
      const wins = this.store.records.filter((record) => record.result === 'Victory').length;
      const losses = this.store.records.filter((record) => record.result === 'Defeat').length;
      this.cardPanel(x, 96, frame.width - 32, 76, COLORS.green, 0.76);
      this.text(x + 16, 116, `${wins}W / ${losses}L`, { fontSize: '27px', fontStyle: '900' });
      this.mono(x + 18, 148, 'Local device battle records', { color: '#cbd5e1' });
      const y = 196;
      if (!this.store.records.length) {
        this.mono(x, y, 'No finished battles yet.', { color: '#94a3b8' });
      }
      this.store.records.slice(0, 9).forEach((record, index) => {
        const rowY = y + index * 54;
        this.cardPanel(x, rowY, frame.width - 32, 44, record.result === 'Victory' ? COLORS.green : COLORS.red, 0.62);
        this.mono(x + 14, rowY + 9, `${record.result} / ${record.turns} turns`, {
          color: record.result === 'Victory' ? '#86efac' : '#fca5a5',
        });
        this.mono(x + 190, rowY + 9, `${record.damage} dmg`, { color: '#cbd5e1' });
      });
      this.button(x, frame.height - 62, frame.width - 32, 44, 'Lobby', () => this.store.changeScene('LobbyScene'), {
        fill: COLORS.panel2,
        stroke: COLORS.cyan,
      });
      this.toast(frame);
    }
  }

  function startShell() {
    const element = document.getElementById('v2-phaser-shell');
    if (!element || !window.Phaser) return;
    const socketClient = new SocketClient();
    const store = new GameStore(socketClient);
    window.JJKPhaserShell = { store };
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: element,
      backgroundColor: '#050711',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: Math.max(320, element.clientWidth || window.innerWidth || 390),
        height: Math.max(640, element.clientHeight || window.innerHeight || 844),
      },
      audio: { noAudio: true },
      render: { antialias: true, pixelArt: false },
      scene: [BootScene, LobbyScene, DraftScene, CombatScene, ResultScene, RecordsScene],
    });
    window.JJKPhaserShell.game = game;
    store.onChange(() => {
      if (game.scene && store.scene && !game.scene.isActive(store.scene)) {
        game.scene.start(store.scene);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startShell, { once: true });
  } else {
    startShell();
  }
})();
