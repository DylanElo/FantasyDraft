import { BOOT, CORE_ENERGY } from '../core/runtime-config.js?v=17';
import { safeText } from '../core/text.js?v=17';
import { readStorage, writeStorage } from '../core/storage.js?v=17';
import { AssetRegistry } from '../core/asset-registry.js?v=17';
import { firstCreationRoster, imageKeyFor, preset, presetTitle } from '../core/roster.js?v=17';
import { eventAmount } from '../fx/event-metrics.js?v=17';

export class GameStore {
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
      this.detailSkillId = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      this.actions = [];
      this.actionWildPays = {};
      this.queueReviewOpen = false;
      this.queueSubmitting = false;
      this.toast = '';
      this.connectionState = 'connected';
      this.draftPage = 0;
      this.draftTarget = 'playerTeam';
      this.creationPresetPage = 0;
      this.missionPage = 0;
      this.detailCharacterId = null;
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      this.lastActionPayloads = [];
      this.commandNonceCounter = 0;
      this.resumeSession = this.loadResumeSession();
      this.ignoreBattleUpdates = false;
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
          detailSkillId: this.detailSkillId,
          queueReviewOpen: this.queueReviewOpen,
          detailCharacterId: this.detailCharacterId,
          hasBattle: !!this.state,
          playbackEvents: this.playbackEvents.length,
          recentEvents: this.recentEvents.length,
        }),
      };
    }

    bindSocket() {
      this.socketClient.on('connect', () => {
        this.connectionState = 'connected';
        this.setStatus('Connected');
        if (this.resumeSession) {
          this.socketClient.emit('battle_v2_resume', { ...this.resumeSession });
        }
        this.notify();
      });
      this.socketClient.on('disconnect', () => {
        this.connectionState = 'disconnected';
        this.setStatus('Reconnecting…');
        this.notify();
      });
      this.socketClient.on('battle_v2_session', (data) => this.saveResumeSession(data));
      this.socketClient.on('battle_v2_resume_rejected', (data) => {
        this.clearResumeSession();
        this.showToast(data && data.message ? data.message : 'Battle session expired.');
      });
      this.socketClient.on('battle_v2_update', (data) => this.receiveBattleState(data));
      this.socketClient.on('battle_v2_lobby', (data) => this.receiveLobbyState(data));
      this.socketClient.on('battle_v2_error', (data) => {
        this.queueSubmitting = false;
        this.showToast(data && data.message ? data.message : 'Battle v2 error');
      });
      this.socketClient.on('battle_v2_finished', (data) => {
        this.showToast(this.finishedMessage(data));
      });
      this.socketClient.on('message', (data) => {
        if (data && data.text) this.showToast(data.text);
      });
    }

    finishedMessage(data) {
      const winnerId = data && data.winner_id;
      const reason = this.state && this.state.finish_reason;
      const iWon = winnerId && winnerId === this.mineId();
      if (reason === 'disconnect' || reason === 'disconnect_budget') {
        if (!winnerId) return 'Both players disconnected. No contest.';
        return iWon ? 'Your opponent disconnected. You win by forfeit.' : 'You disconnected too long and forfeited the match.';
      }
      return `Battle finished: ${winnerId || 'winner decided'}`;
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

    commandPayload(payload = {}, revisionOffset = 0) {
      this.commandNonceCounter += 1;
      const revision = Number((this.state && this.state.state_revision) || 0) + revisionOffset;
      return {
        ...payload,
        state_revision: revision,
        client_action_nonce: `${Date.now()}-${this.commandNonceCounter}`,
      };
    }

    loadResumeSession() {
      try {
        const value = JSON.parse(readStorage('jjk_battle_resume', '{}'));
        return value && value.room_id && value.player_id && value.resume_token ? value : null;
      } catch (error) {
        return null;
      }
    }

    saveResumeSession(data) {
      if (!data || !data.room_id || !data.player_id || !data.resume_token) return;
      this.resumeSession = {
        room_id: data.room_id,
        player_id: data.player_id,
        resume_token: data.resume_token,
      };
      writeStorage('jjk_battle_resume', JSON.stringify(this.resumeSession));
    }

    clearResumeSession() {
      this.resumeSession = null;
      writeStorage('jjk_battle_resume', '{}');
    }

    changeScene(sceneName) {
      this.scene = sceneName;
      const game = window.JJKPhaserShell && window.JJKPhaserShell.game;
      if (game && game.scene) {
        ['LobbyScene', 'FirstCreationScene', 'MissionMapScene', 'DraftScene', 'CombatScene', 'ResultScene', 'RecordsScene'].forEach((key) => {
          if (key !== sceneName && game.scene.isActive(key)) game.scene.stop(key);
        });
        if (!game.scene.isActive(sceneName)) game.scene.start(sceneName);
      }
      this.notify();
    }

    rosterEntries() {
      return Object.values(firstCreationRoster()).sort((a, b) => safeText(a.name).localeCompare(safeText(b.name)));
    }

    presetEntries() {
      const presets = (BOOT.firstCreation && BOOT.firstCreation.presets) || {};
      return Object.keys(presets).map((id) => ({ id, title: presetTitle(id), team: preset(id, []) }));
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
        this.detailCharacterId = null;
        this.notify();
      }
    }

    applyRecommendedTeam(mission) {
      if (!mission || !Array.isArray(mission.recommended_team)) return;
      const team = mission.recommended_team.filter((id) => !!firstCreationRoster()[id]).slice(0, 3);
      if (team.length === 3) {
        this.playerTeam = team;
        this.matchMode = 'cpu';
        this.draftTarget = 'playerTeam';
        this.detailCharacterId = null;
        this.changeScene('FirstCreationScene');
      } else {
        this.showToast('That mission team is not fully available yet.');
      }
    }

    openCharacterDetail(characterId) {
      if (!firstCreationRoster()[characterId]) return;
      this.detailCharacterId = characterId;
      this.notify();
    }

    closeCharacterDetail() {
      this.detailCharacterId = null;
      this.notify();
    }

    openSkillDetail(skillId) {
      this.detailSkillId = skillId;
      this.notify();
    }

    closeSkillDetail() {
      this.detailSkillId = null;
      this.notify();
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
      this.clearResumeSession();
      this.actions = [];
      this.actionWildPays = {};
      this.queueReviewOpen = false;
      this.selectedCasterSlot = null;
      this.selectedSkillId = null;
      this.queueSubmitting = false;
      this.lobbyStatus = null;
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      this.ignoreBattleUpdates = false;
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
      if (this.ignoreBattleUpdates) return;
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
        this.ensureWildcardPayments();
      } else if (data.phase === 'planning' || data.phase === 'finished' || data.turn_player_id !== this.mineId() || (me && me.queue_confirmed)) {
        this.actions = [];
        this.actionWildPays = {};
        this.queueReviewOpen = false;
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
      const replacementId = (character.skill_replacements && character.skill_replacements[skillId]) || skillId;
      const effective = skills.find((skill) => skill.id === replacementId || skill.original_slot_id === replacementId) || null;
      return effective && replacementId !== skillId
        ? { ...effective, id: skillId, effective_skill_id: replacementId, original_slot_id: skillId }
        : effective;
    }

    skillsFor(character) {
      const catalog = this.state && this.state.skill_catalog ? this.state.skill_catalog[character.character_id] : null;
      const roster = this.character(character.character_id);
      const skills = (catalog && catalog.skills) || (roster && roster.skills) || [];
      const replacements = character.skill_replacements || {};
      const replacementIds = new Set(Object.values(replacements));
      return skills.filter((skill) => !replacementIds.has(skill.id)).map((skill) => this.skillFor(character, skill.id));
    }

    skillCooldown(character, skill) {
      if (!character || !skill) return 0;
      return (character.cooldowns && character.cooldowns[skill.effective_skill_id || skill.id]) || 0;
    }

    adjustedCost(character, skill) {
      const cost = [...((skill && skill.cost) || [])];
      const delta = ((character && character.statuses) || []).reduce((total, status) => Number(status.duration || 0) !== 0 ? total + Number((status.payload && status.payload.black_cost_delta) || 0) : total, 0);
      if (delta > 0) return cost.concat(Array(delta).fill('black'));
      let discount = Math.max(0, -delta);
      return cost.filter((color) => color !== 'black' || discount-- <= 0);
    }

    skillIsHarmful(skill) {
      const kind = (skill && skill.target_rule && skill.target_rule.kind) || 'enemy';
      const effects = (skill && skill.effects) || [];
      if (kind === 'enemy' || kind === 'enemy_team') return effects.some((effect) => effect.target !== 'self') || (skill.classes || []).includes('Control');
      return effects.some((effect) => effect.target !== 'self' && ['damage', 'health_steal', 'drain_energy', 'remove_status', 'counter'].includes(effect.type));
    }

    statusBlocksSkill(character, skill) {
      const classes = (skill && skill.classes) || [];
      for (const status of ((character && character.statuses) || [])) {
        if (Number(status.duration || 0) === 0) continue;
        const payload = status.payload || {};
        const stunned = payload.stun_classes || [];
        if (stunned.includes('all') || classes.some((skillClass) => stunned.includes(skillClass))) return `Blocked by ${status.name || 'stun'}`;
        if (payload.stun_harmful && this.skillIsHarmful(skill)) return `Harmful skills blocked by ${status.name || 'stun'}`;
        if (payload.block_non_damaging_skills && !(skill.effects || []).some((effect) => effect.target !== 'self' && ['damage', 'health_steal'].includes(effect.type))) return `Non-damaging skills blocked by ${status.name || 'control'}`;
        if (payload.block_counters && (skill.effects || []).some((effect) => effect.payload && effect.payload.counter)) return `Counters blocked by ${status.name || 'control'}`;
      }
      return '';
    }

    skillDisabledReason(character, skill) {
      const cooldown = this.skillCooldown(character, skill);
      if (cooldown > 0) return `Cooldown ${cooldown}`;
      return this.statusBlocksSkill(character, skill) || this.skillFit(skill, character).reason;
    }

    hasEffectFlag(skill, key, value = true) {
      return ((skill && skill.effects) || []).some((effect) => effect.payload && effect.payload[key] === value);
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
      const playerId = side === 'enemy' ? this.enemyId() : this.mineId();
      if (this.targetingStage === 'alternate') return !(this.pendingPrimaryTarget && this.pendingPrimaryTarget.playerId === playerId && this.pendingPrimaryTarget.slot === slot);
      if (this.targetingStage === 'venom_secondary') return side === 'enemy' && (!this.pendingPrimaryTarget || this.pendingPrimaryTarget.slot !== slot);
      if (this.targetingStage === 'venom_primary') return side === 'enemy' && (character.statuses || []).some((status) => status.id === 'poison' && Number(status.duration || 0) !== 0);
      const kind = (skill && skill.target_rule && skill.target_rule.kind) || 'enemy';
      if (this.targetBlocksSkill(character, skill)) return false;
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
      return slots
        .filter((slot) => !this.targetBlocksSkill(player && player.team ? player.team[slot] : null, skill))
        .slice(0, maxTargets);
    }

    targetHasInvulnerability(character) {
      return !!(character && character.statuses || []).some((status) => (
        Number(status.duration || 0) !== 0
        && status.payload
        && status.payload.invulnerable
      ));
    }

    targetHasAntiDomain(character) {
      return !!(character && character.statuses || []).some((status) => (
        Number(status.duration || 0) !== 0
        && (
          status.id === 'anti_domain'
          || (status.payload && status.payload.anti_domain)
        )
      ));
    }

    skillBypassesInvulnerability(skill, target) {
      if (!skill) return false;
      const classes = skill.classes || [];
      if (classes.includes('Bypassing')) return true;
      const effects = skill.effects || [];
      if (effects.some((effect) => effect.payload && effect.payload.bypass_invulnerability)) return true;
      const domainOrSureHit = classes.includes('Domain') || effects.some((effect) => effect.damage_type === 'sure_hit');
      if (!domainOrSureHit) return false;
      return !this.targetHasAntiDomain(target);
    }

    targetBlocksSkill(character, skill) {
      if (!this.targetHasInvulnerability(character) || this.skillBypassesInvulnerability(skill, character)) return false;
      const statuses = (character && character.statuses) || [];
      if (statuses.some((status) => status.payload && status.payload.invulnerable_to_all)) return true;
      if (this.skillIsHarmful(skill)) return true;
      return statuses.some((status) => status.payload && status.payload.invulnerable_to_helpful);
    }

    hasManualTargetForSkill(skill, side) {
      const player = side === 'enemy' ? this.foe() : this.me();
      return this.livingSlots(player).some((slot) => {
        const character = player && player.team ? player.team[slot] : null;
        if (this.targetBlocksSkill(character, skill)) return false;
        const kind = (skill && skill.target_rule && skill.target_rule.kind) || 'enemy';
        if (kind === 'enemy') return side === 'enemy';
        if (kind === 'ally') {
          const allowSelf = !!(skill && skill.target_rule && skill.target_rule.allow_self);
          return side === 'mine' && (allowSelf || slot !== this.selectedCasterSlot);
        }
        return false;
      });
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
      this.detailSkillId = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      this.notify();
    }

    selectSkill(skillId) {
      if (this.selectedSkillId === skillId) {
        this.openSkillDetail(skillId);
        return;
      }
      if (this.controlsLocked()) return;
      const me = this.me();
      const foe = this.foe();
      const caster = me && me.team ? me.team[this.selectedCasterSlot] : null;
      const skill = caster ? this.skillFor(caster, skillId) : null;
      if (!caster || !skill) {
        this.showToast('Select a ready fighter first.');
        return;
      }
      const cooldown = this.skillCooldown(caster, skill);
      const fit = this.skillFit(skill, caster);
      const blocked = this.statusBlocksSkill(caster, skill);
      if (cooldown > 0) {
        this.showToast(`Cooldown ${cooldown} turns.`);
        return;
      }
      if (blocked) {
        this.showToast(blocked);
        return;
      }
      if (!fit.ok) {
        this.showToast(fit.reason);
        return;
      }
      const kind = (skill.target_rule && skill.target_rule.kind) || 'enemy';
      this.selectedSkillId = skill.id;
      this.detailSkillId = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      if (this.hasEffectFlag(skill, 'conditional_targeting', 'venom_bloom')) {
        const poisoned = this.livingSlots(foe).filter((slot) => (foe.team[slot].statuses || []).some((status) => status.id === 'poison' && Number(status.duration || 0) !== 0));
        if (!poisoned.length) {
          this.addAction(this.selectedCasterSlot, skill.id, this.enemyId(), null, this.livingSlots(foe));
          return;
        }
        this.targetingStage = 'venom_primary';
        this.showToast('Choose a poisoned primary target.');
        this.notify();
        return;
      }
      if (kind === 'self') {
        this.addAction(this.selectedCasterSlot, skill.id, this.mineId(), this.selectedCasterSlot, []);
        return;
      }
      if (kind === 'enemy_team') {
        const slots = this.teamTargetSlots(foe, skill);
        if (!slots.length) {
          this.showToast('No legal targets for that skill.');
          return;
        }
        this.addAction(this.selectedCasterSlot, skill.id, this.enemyId(), null, slots);
        return;
      }
      if (kind === 'ally_team') {
        const slots = this.teamTargetSlots(me, skill);
        if (!slots.length) {
          this.showToast('No legal targets for that skill.');
          return;
        }
        this.addAction(this.selectedCasterSlot, skill.id, this.mineId(), null, slots);
        return;
      }
      if (!this.hasManualTargetForSkill(skill, kind === 'ally' ? 'mine' : 'enemy')) {
        this.showToast('No legal targets for that skill.');
        this.selectedSkillId = null;
        this.notify();
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
      const skill = this.selectedSkill();
      const playerId = side === 'enemy' ? this.enemyId() : this.mineId();
      if (this.targetingStage === 'alternate') {
        const primary = this.pendingPrimaryTarget;
        this.addAction(this.selectedCasterSlot, this.selectedSkillId, primary.playerId, primary.slot, [], { alternate_target_player_id: playerId, alternate_target_slot: slot });
        return;
      }
      if (this.targetingStage === 'venom_primary') {
        this.pendingPrimaryTarget = { playerId, slot };
        this.targetingStage = 'venom_secondary';
        this.showToast('Choose a different secondary spread target.');
        this.notify();
        return;
      }
      if (this.targetingStage === 'venom_secondary') {
        const primary = this.pendingPrimaryTarget;
        this.addAction(this.selectedCasterSlot, this.selectedSkillId, primary.playerId, primary.slot, [primary.slot, slot], { secondary_target_slot: slot });
        return;
      }
      if (this.hasEffectFlag(skill, 'controlled_redirect')) {
        this.pendingPrimaryTarget = { playerId, slot };
        this.targetingStage = 'alternate';
        this.showToast('Choose the alternate redirect destination.');
        this.notify();
        return;
      }
      this.addAction(this.selectedCasterSlot, this.selectedSkillId, side === 'enemy' ? this.enemyId() : this.mineId(), slot, []);
    }

    addAction(casterSlot, skillId, targetPlayerId, targetSlot, targetSlots, extras = {}) {
      const id = `phaser_${Date.now()}_${casterSlot}`;
      this.actions = this.actions.filter((action) => Number(action.caster_slot) !== Number(casterSlot));
      this.actionWildPays = Object.fromEntries(Object.entries(this.actionWildPays).filter(([actionId]) => this.actions.some((action) => action.id === actionId)));
      this.actions.push({
        id,
        caster_slot: casterSlot,
        skill_id: skillId,
        target_player_id: targetPlayerId,
        target_slot: targetSlot,
        target_slots: targetSlots || [],
        ...extras,
      });
      this.selectedSkillId = null;
      this.detailSkillId = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      this.ensureSelectedCaster();
      this.ensureWildcardPayments();
      this.lastActionPayloads = this.pendingActionPayloads();
      this.socketClient.emit('battle_v2_submit_plan', this.commandPayload({ actions: this.lastActionPayloads }));
      this.notify();
    }

    skillFit(skill, caster = null) {
      const me = this.me();
      const summary = this.energySummary(me, this.actions);
      const remaining = { ...summary.remaining };
      let wildcardNeeded = summary.wildcardNeeded;
      this.adjustedCost(caster, skill).forEach((color) => {
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
        this.adjustedCost(caster, skill).forEach((color) => {
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
        blue: Number(me.energy.blue || 0),
        white: Number(me.energy.white || 0),
        red: Number(me.energy.red || 0),
      } : { green: 0, blue: 0, white: 0, red: 0 };
      const payloads = this.actions.map((action, index) => {
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.skillFor(caster, action.skill_id) : null;
        const wildcardPays = [];
        const preferredPays = this.actionWildPays[action.id] || [];
        let preferredIndex = 0;
        this.adjustedCost(caster, skill).forEach((color) => {
          if (color === 'black') {
            const preferred = preferredPays[preferredIndex];
            preferredIndex += 1;
            const pay = preferred && energy[preferred] > 0 ? preferred : CORE_ENERGY.find((item) => energy[item] > 0);
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

    ensureWildcardPayments() {
      const payloads = this.pendingActionPayloads();
      const next = {};
      payloads.forEach((action) => {
        if ((action.wildcard_pays || []).length) next[action.id] = action.wildcard_pays.slice();
      });
      this.actionWildPays = next;
      return payloads;
    }

    openQueueReview() {
      if (this.controlsLocked() || !this.actions.length) return;
      this.ensureWildcardPayments();
      this.queueReviewOpen = true;
      this.notify();
    }

    queueReviewFit() {
      if (!this.actions.length) return { ok: false, reason: 'Queue is empty.' };
      const me = this.me();
      const energy = { green: 0, blue: 0, white: 0, red: 0, ...((me && me.energy) || {}) };
      for (const action of this.actions) {
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.skillFor(caster, action.skill_id) : null;
        if (!caster || !skill) return { ok: false, reason: 'Queued action is no longer available.' };
        const pays = this.actionWildPays[action.id] || [];
        let wildIndex = 0;
        for (const color of this.adjustedCost(caster, skill)) {
          const pay = color === 'black' ? pays[wildIndex++] : color;
          if (!CORE_ENERGY.includes(pay) || Number(energy[pay] || 0) <= 0) {
            return { ok: false, reason: color === 'black' ? 'Assign every Wild payment.' : `Not enough ${pay} energy.` };
          }
          energy[pay] -= 1;
        }
        if (pays.length !== wildIndex) return { ok: false, reason: 'Wild payment count changed.' };
      }
      return { ok: true, reason: '' };
    }

    closeQueueReview() {
      this.queueReviewOpen = false;
      this.notify();
    }

    moveQueuedAction(actionId, direction) {
      if (this.controlsLocked()) return;
      const index = this.actions.findIndex((action) => action.id === actionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= this.actions.length) return;
      const next = this.actions.slice();
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      this.actions = next;
      this.ensureWildcardPayments();
      this.notify();
    }

    wildcardOptionsFor(actionId, wildcardIndex) {
      const me = this.me();
      const energy = me && me.energy ? {
        green: Number(me.energy.green || 0),
        blue: Number(me.energy.blue || 0),
        white: Number(me.energy.white || 0),
        red: Number(me.energy.red || 0),
      } : { green: 0, blue: 0, white: 0, red: 0 };
      for (const action of this.actions) {
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.skillFor(caster, action.skill_id) : null;
        this.adjustedCost(caster, skill).forEach((color) => {
          if (color !== 'black') energy[color] = (energy[color] || 0) - 1;
        });
        const wildCount = this.adjustedCost(caster, skill).filter((color) => color === 'black').length;
        for (let index = 0; index < wildCount; index += 1) {
          if (action.id === actionId && index === wildcardIndex) {
            return CORE_ENERGY.filter((color) => (energy[color] || 0) > 0);
          }
          const preferred = (this.actionWildPays[action.id] || [])[index];
          const pay = preferred && energy[preferred] > 0 ? preferred : CORE_ENERGY.find((color) => energy[color] > 0);
          if (pay) energy[pay] -= 1;
        }
      }
      return CORE_ENERGY.filter((color) => (energy[color] || 0) > 0);
    }

    cycleWildcardPay(actionId, wildcardIndex) {
      if (this.controlsLocked()) return;
      const options = this.wildcardOptionsFor(actionId, wildcardIndex);
      if (!options.length) {
        this.showToast('No energy can pay that random cost.');
        return;
      }
      const pays = (this.actionWildPays[actionId] || []).slice();
      const current = pays[wildcardIndex] || options[0];
      const currentIndex = options.indexOf(current);
      pays[wildcardIndex] = options[(currentIndex + 1) % options.length];
      this.actionWildPays[actionId] = pays;
      this.ensureWildcardPayments();
      this.notify();
    }

    consumePlaybackEvents() {
      const events = this.playbackEvents.slice();
      this.playbackEvents = [];
      return events;
    }

    confirmQueue() {
      const fit = this.queueReviewFit();
      if (this.controlsLocked() || !fit.ok) {
        if (!fit.ok) this.showToast(fit.reason);
        return;
      }
      this.queueSubmitting = true;
      this.queueReviewOpen = false;
      const payloads = this.pendingActionPayloads();
      this.socketClient.emit('battle_v2_update_queue', this.commandPayload({
        queue_order: payloads.map((action) => action.id),
        wildcard_pays: Object.fromEntries(payloads.map((action) => [action.id, action.wildcard_pays || []])),
      }));
      this.socketClient.emit('battle_v2_confirm_queue', this.commandPayload({}, 1));
      this.notify();
    }

    cancelQueue() {
      if (this.controlsLocked()) return;
      this.actions = [];
      this.actionWildPays = {};
      this.selectedSkillId = null;
      this.detailSkillId = null;
      this.queueSubmitting = false;
      this.queueReviewOpen = false;
      this.socketClient.emit('battle_v2_cancel_queue', this.commandPayload());
      this.notify();
    }

    endTurn() {
      if (this.controlsLocked()) return;
      this.actions = [];
      this.actionWildPays = {};
      this.queueSubmitting = true;
      this.queueReviewOpen = false;
      this.socketClient.emit('battle_v2_end_turn', this.commandPayload());
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
      this.socketClient.emit('battle_v2_convert_energy', this.commandPayload({ source, target }));
      this.showToast(`Converting ${source} to ${target}.`);
    }

    resetToLobby() {
      if (!this.state && this.lobbyStatus && this.lobbyStatus.status === 'waiting') {
        this.socketClient.emit('battle_v2_leave_pvp', { room_id: this.lobbyStatus.room_id });
      }
      if (this.state && !this.state.winner_id) {
        this.ignoreBattleUpdates = true;
        this.socketClient.emit('battle_v2_surrender', this.commandPayload());
      }
      this.state = null;
      this.clearResumeSession();
      this.lobbyStatus = null;
      this.actions = [];
      this.actionWildPays = {};
      this.selectedCasterSlot = null;
      this.selectedSkillId = null;
      this.queueSubmitting = false;
      this.queueReviewOpen = false;
      this.detailCharacterId = null;
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      this.changeScene('LobbyScene');
    }
  }
