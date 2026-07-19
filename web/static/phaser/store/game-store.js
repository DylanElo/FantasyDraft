import { BOOT, CORE_ENERGY, energyName } from '../core/runtime-config.js?v=42';
import { safeText } from '../core/text.js?v=42';
import { readStorage, writeStorage } from '../core/storage.js?v=42';
import { AssetRegistry } from '../core/asset-registry.js?v=42';
import { firstCreationRoster, preset, presetTitle } from '../core/roster.js?v=42';
import { damageEventAmount } from '../fx/event-metrics.js?v=42';

export const MATCH_LAUNCH_TIMEOUT_MS = 10000;
export const MAX_RETIRED_MATCH_IDS = 8;

export class GameStore {
    constructor(socketClient) {
      this.socketClient = socketClient;
      this.assets = new AssetRegistry();
      this.listeners = new Set();
      this.playerId = BOOT.playerId || 'player';
      this.playerName = readStorage('jjk_player_name', 'Player');
      this.roomId = readStorage('jjk_room_id', 'lobby');
      this.matchMode = 'cpu';
      this.difficulty = 'normal';
      this.scene = 'LobbyScene';
      this.state = null;
      this.lobbyStatus = null;
      this.matchLaunchPending = false;
      this.matchLaunchError = '';
      this.matchLaunchTimer = null;
      this.matchLaunchAttempt = 0;
      this.matchupReturnScene = 'DraftScene';
      this.selectedCasterSlot = null;
      this.selectedSkillId = null;
      this.detailSkillId = null;
      this.inspectedFighter = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      this.actions = [];
      this.actionWildPays = {};
      this.queueReviewOpen = false;
      this.queueSubmitting = false;
      this.transmuteOpen = false;
      this.transmuteSources = [];
      this.transmuteTarget = null;
      this.toast = '';
      this.toastSerial = 0;
      this.connectionState = typeof this.socketClient.isConnected === 'function' && !this.socketClient.isConnected()
        ? 'connecting'
        : 'connected';
      this.disconnectDeadline = null;
      this.draftPage = 0;
      this.draftTarget = 'playerTeam';
      this.creationPresetPage = 0;
      this.missionPage = 0;
      this.detailCharacterId = null;
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      this.visiblePublicAction = null;
      this.visiblePublicActionUntil = 0;
      this.phaseTimerSnapshotSeconds = null;
      this.phaseTimerSnapshotAt = null;
      this.uiClockToken = '';
      this.lastActionPayloads = [];
      this.commandNonceCounter = 0;
      this.pendingCommand = null;
      this.resumeSession = this.loadResumeSession();
      this.ignoreBattleUpdates = false;
      this.retiredMatchIds = new Set();
      // Live-updated from the most recent battle_v2_update's
      // first_creation_account field; falls back to the page-load bootstrap
      // profile only until the first update arrives, so mission counters,
      // unlocks, and the active route reflect the server without a reload.
      this.firstCreationAccount = null;
      this.records = this.loadRecords();
      this.playerTeam = preset('story_tutorial', ['yuji_itadori', 'megumi_fushiguro', 'nobara_kugisaki']);
      this.enemyTeam = preset('jjk0_beginner_special', ['yuta_okkotsu_jjk0', 'maki_zenin', 'toge_inumaki']);
      this.bindSocket();
      window.setInterval(() => {
        const phaseSecond = this.phaseSecondsRemaining();
        const visibleAction = this.currentVisibleAction();
        const token = [
          this.disconnectSecondsRemaining(),
          Number.isFinite(phaseSecond) ? phaseSecond : '-',
          visibleAction ? this.visiblePublicActionUntil : 0,
        ].join(':');
        if (token !== this.uiClockToken) {
          this.uiClockToken = token;
          this.notify();
        }
      }, 250);
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
          portraitDiagnostics: this.assets.portraitLoadDiagnostics(),
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
        this.pendingCommand = null;
        this.queueSubmitting = false;
        if (this.scene === 'MatchupScene' && !this.state) {
          const matchmakingStarted = !!(this.matchLaunchPending || this.lobbyStatus);
          this.lobbyStatus = null;
          this.failMatchLaunch(matchmakingStarted
            ? 'Connection lost before matchmaking completed. Reconnect and try again.'
            : 'Arena connection was lost. Reconnect before entering the match.');
          return;
        }
        this.setStatus('Reconnecting…');
        this.notify();
      });
      const connectionFailed = () => {
        this.connectionState = 'disconnected';
        this.pendingCommand = null;
        this.queueSubmitting = false;
        this.setStatus('Connection failed');
        if (this.scene === 'MatchupScene' && !this.state) {
          this.lobbyStatus = null;
          this.failMatchLaunch('Arena server could not be reached. Check the address and try again.');
          return;
        }
        this.notify();
      };
      this.socketClient.on('connect_error', connectionFailed);
      this.socketClient.on('reconnect_failed', connectionFailed);
      this.socketClient.on('battle_v2_session', (data) => this.saveResumeSession(data));
      this.socketClient.on('battle_v2_resume_rejected', (data) => {
        this.clearResumeSession();
        this.showToast(data && data.message ? data.message : 'Battle session expired.');
      });
      this.socketClient.on('battle_v2_update', (data) => this.receiveBattleState(data));
      this.socketClient.on('battle_v2_lobby', (data) => this.receiveLobbyState(data));
      this.socketClient.on('battle_v2_error', (data) => {
        const failedCommand = this.pendingCommand;
        const failedLaunch = this.matchLaunchPending;
        this.pendingCommand = null;
        this.queueSubmitting = false;
        this.matchLaunchPending = false;
        this.clearMatchLaunchTimeout();
        if (
          failedCommand
          && ['queue_update_before_confirm', 'queue_confirm'].includes(failedCommand.kind)
          && this.actions.length
          && this.state
          && this.state.phase === 'queue_review'
        ) {
          this.queueReviewOpen = true;
        }
        const message = data && data.message ? String(data.message) : 'Battle command failed.';
        if (failedLaunch && this.scene === 'MatchupScene') {
          this.matchLaunchError = safeText(message);
          this.setStatus('Arena request rejected');
        }
        this.showToast(message.toLowerCase().includes('stale state revision')
          ? 'Battle state refreshed. Review your queue and try again.'
          : message);
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
      const toast = safeText(message);
      this.toastSerial = Number(this.toastSerial || 0) + 1;
      const serial = this.toastSerial;
      this.toast = toast;
      this.notify();
      window.setTimeout(() => {
        if (this.toastSerial === serial) {
          this.toast = '';
          this.notify();
        }
      }, 2200);
    }

    clearToast() {
      this.toastSerial = Number(this.toastSerial || 0) + 1;
      if (!this.toast) return;
      this.toast = '';
      this.notify();
    }

    clearMatchLaunchTimeout() {
      this.matchLaunchAttempt = Number(this.matchLaunchAttempt || 0) + 1;
      if (this.matchLaunchTimer !== null && typeof window.clearTimeout === 'function') {
        window.clearTimeout(this.matchLaunchTimer);
      }
      this.matchLaunchTimer = null;
    }

    armMatchLaunchTimeout() {
      this.clearMatchLaunchTimeout();
      const attempt = this.matchLaunchAttempt;
      this.matchLaunchTimer = window.setTimeout(() => {
        if (attempt !== this.matchLaunchAttempt || !this.matchLaunchPending || this.state || this.lobbyStatus) return;
        this.failMatchLaunch('The arena did not answer in time. Check the connection and try again.');
      }, MATCH_LAUNCH_TIMEOUT_MS);
    }

    failMatchLaunch(message) {
      const failure = safeText(message, 'Arena connection failed. Try again.');
      const alreadyVisible = !this.matchLaunchPending && this.matchLaunchError === failure;
      this.clearMatchLaunchTimeout();
      this.matchLaunchPending = false;
      this.matchLaunchError = failure;
      this.setStatus('Connection failed');
      if (!alreadyVisible) this.showToast(failure);
    }

    matchConnectionReady() {
      if (this.connectionState !== 'connected') return false;
      return typeof this.socketClient.isConnected !== 'function' || this.socketClient.isConnected();
    }

    commandPayload(payload = {}) {
      this.commandNonceCounter += 1;
      const revision = Number((this.state && this.state.state_revision) || 0);
      return {
        ...payload,
        state_revision: revision,
        client_action_nonce: `${Date.now()}-${this.commandNonceCounter}`,
      };
    }

    beginCommand(eventName, payload = {}, kind = eventName) {
      if (this.pendingCommand || !this.state) return false;
      const envelope = this.commandPayload(payload);
      this.pendingCommand = {
        eventName,
        kind,
        stateRevision: envelope.state_revision,
        nonce: envelope.client_action_nonce,
        matchId: this.state.match_id || null,
      };
      this.socketClient.emit(eventName, envelope);
      return true;
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
      const shell = window.JJKPhaserShell;
      const game = shell && shell.game;
      const sceneManager = game && game.scene;
      const bootReady = Boolean(shell && shell.bootReady);
      const bootActive = Boolean(sceneManager && sceneManager.isActive && sceneManager.isActive('BootScene'));
      // Socket resume/update events may arrive before Boot finishes loading or
      // during its exit fade. Keep the requested destination in store state,
      // but let Boot perform the one initial Phaser transition so its loader is
      // never stopped or raced by a second scene manager mutation.
      if (bootReady && !bootActive && sceneManager) {
        ['LobbyScene', 'FirstCreationScene', 'MissionMapScene', 'DraftScene', 'MatchupScene', 'CombatScene', 'ResultScene', 'RecordsScene'].forEach((key) => {
          if (key !== sceneName && sceneManager.isActive(key)) sceneManager.stop(key);
        });
        if (!sceneManager.isActive(sceneName)) sceneManager.start(sceneName);
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
      return this.assets.portraitKeyFor(characterOrId);
    }

    portraitMetadata(characterOrId) {
      return this.assets.portraitFor(characterOrId);
    }

    portraitFocal(characterOrId, context = 'square') {
      return this.assets.portraitFocalFor(characterOrId, context);
    }

    missions() {
      return ((BOOT.firstCreation && BOOT.firstCreation.missions) || []).slice();
    }

    /* The live, socket-updated profile (mission counters, unlocks) once any
       battle_v2_update with first_creation_account has arrived; falls back
       to the page-load bootstrap snapshot only before that. */
    firstCreationProfile() {
      return this.firstCreationAccount || (BOOT.firstCreation && BOOT.firstCreation.profile) || {};
    }

    activeMission() {
      const missions = this.missions();
      const profile = this.firstCreationProfile();
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
      // A draw or no-contest has no winner_id but is still a real terminal
      // result -- result_type (WIN/DRAW/NO_CONTEST/FORFEIT) is set for all of
      // them, so that's the correct "did this match actually finish" gate.
      if (!state || !state.result_type || state.__recorded) return;
      state.__recorded = true;
      const mine = this.mineId();
      const resultLabel = !state.winner_id
        ? (state.result_type === 'NO_CONTEST' ? 'No Contest' : 'Draw')
        : state.winner_id === mine
          ? 'Victory'
          : 'Defeat';
      const damage = (state.event_log || []).reduce((total, event) => total + damageEventAmount(event), 0);
      const biggest = (state.event_log || [])
        .map((event) => ({ message: event.message || event.type, amount: damageEventAmount(event), type: event.type }))
        .filter((event) => event.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
      const player = state.players && mine ? state.players[mine] : null;
      const team = player && Array.isArray(player.team)
        ? player.team.slice(0, 3).map((fighter) => ({
          id: fighter && (fighter.character_id || fighter.id),
          name: fighter && (fighter.name || fighter.character_id || fighter.id),
        })).filter((fighter) => fighter.id)
        : [];
      this.records.unshift({
        at: new Date().toISOString(),
        result: resultLabel,
        winner: state.winner_id && state.players && state.players[state.winner_id]
          ? state.players[state.winner_id].name
          : resultLabel,
        turns: state.turn_number || 0,
        damage,
        biggest,
        team,
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

    setDifficulty(difficulty) {
      this.difficulty = ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal';
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

    openFirstCreation() {
      // First Creation is always the CPU onboarding/starter route. Keep this
      // transition atomic so visiting Private Room cannot leave a stale PvP
      // mode behind when the player later enters through Mission Map.
      this.matchMode = 'cpu';
      this.draftTarget = 'playerTeam';
      this.detailCharacterId = null;
      this.changeScene('FirstCreationScene');
    }

    applyRecommendedTeam(mission) {
      if (!mission || !Array.isArray(mission.recommended_team)) return;
      const team = mission.recommended_team.filter((id) => !!firstCreationRoster()[id]).slice(0, 3);
      if (team.length === 3) {
        this.playerTeam = team;
        this.openFirstCreation();
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
      this.inspectedFighter = null;
      this.clearToast();
      this.detailSkillId = skillId;
      this.notify();
    }

    closeSkillDetail() {
      this.detailSkillId = null;
      this.notify();
    }

    inspectFighter(side, slot) {
      const player = side === 'enemy' ? this.foe() : this.me();
      const character = player && player.team ? player.team[slot] : null;
      if (!character) return;
      this.detailSkillId = null;
      this.inspectedFighter = { side: side === 'enemy' ? 'enemy' : 'mine', slot: Number(slot) };
      this.clearToast();
      this.notify();
    }

    closeFighterInspection() {
      this.inspectedFighter = null;
      this.notify();
    }

    inspectedFighterState() {
      if (!this.inspectedFighter) return null;
      const player = this.inspectedFighter.side === 'enemy' ? this.foe() : this.me();
      const character = player && player.team ? player.team[this.inspectedFighter.slot] : null;
      return character ? { ...this.inspectedFighter, character } : null;
    }

    setDraftTarget(teamKey) {
      this.draftTarget = teamKey === 'enemyTeam' && this.matchMode === 'cpu' ? 'enemyTeam' : 'playerTeam';
      this.notify();
    }

    openMatchup() {
      if (!BOOT.battleV2Enabled) {
        this.showToast('Battle v2 is disabled on this server.');
        return;
      }
      if (this.playerTeam.length !== 3 || (this.matchMode === 'cpu' && this.enemyTeam.length !== 3)) {
        this.showToast('Choose exactly 3 fighters for every active team.');
        return;
      }
      // First Creation and the reusable Team Setup share Matchup, but Back
      // must restore the surface that actually opened the review.
      this.matchupReturnScene = this.scene === 'FirstCreationScene' ? 'FirstCreationScene' : 'DraftScene';
      this.detailCharacterId = null;
      this.lobbyStatus = null;
      this.matchLaunchPending = false;
      this.matchLaunchError = '';
      this.clearMatchLaunchTimeout();
      this.changeScene('MatchupScene');
    }

    returnFromMatchup() {
      if (this.scene !== 'MatchupScene' || this.matchLaunchPending) return;
      if (!this.state && this.lobbyStatus && this.lobbyStatus.status !== 'cancelled') {
        this.resetToLobby();
        return;
      }
      const returnScene = this.matchupReturnScene === 'FirstCreationScene' ? 'FirstCreationScene' : 'DraftScene';
      this.lobbyStatus = null;
      this.changeScene(returnScene);
    }

    retireMatchId(matchId) {
      const normalized = String(matchId || '').trim();
      if (!normalized) return;
      if (!(this.retiredMatchIds instanceof Set)) this.retiredMatchIds = new Set();
      this.retiredMatchIds.delete(normalized);
      this.retiredMatchIds.add(normalized);
      while (this.retiredMatchIds.size > MAX_RETIRED_MATCH_IDS) {
        const oldest = this.retiredMatchIds.values().next().value;
        this.retiredMatchIds.delete(oldest);
      }
    }

    isRetiredMatchId(matchId) {
      const normalized = String(matchId || '').trim();
      return !!normalized
        && this.retiredMatchIds instanceof Set
        && this.retiredMatchIds.has(normalized);
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
      // Every fresh CPU and PvP match must pass through the dedicated
      // matchup review. Legacy callers (notably First Creation) therefore
      // open the review on their first invocation instead of emitting.
      if (this.scene !== 'MatchupScene') {
        this.openMatchup();
        return;
      }
      if (this.matchLaunchPending) return;
      if (!this.matchConnectionReady()) {
        this.failMatchLaunch('Arena server is not connected yet. Check the address and try again.');
        return;
      }
      this.retireMatchId(this.state && this.state.match_id);
      this.state = null;
      this.disconnectDeadline = null;
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
      this.matchLaunchPending = true;
      this.matchLaunchError = '';
      this.armMatchLaunchTimeout();
      const payload = {
        room_id: this.matchMode === 'pvp' ? this.roomId : `classic_v2_${Math.random().toString(36).slice(2, 8)}`,
        player_name: this.playerName,
        player_team: this.playerTeam.slice(0, 3),
        roster_mode: 'first_creation',
      };
      // Stay on Matchup until a viewer-specific authoritative battle update
      // arrives. This avoids rendering a speculative Combat state.
      this.changeScene('MatchupScene');
      if (this.matchMode === 'pvp') {
        this.socketClient.emit('battle_v2_join_pvp', payload);
      } else {
        this.socketClient.emit('battle_v2_start_classic', {
          ...payload,
          enemy_team: this.enemyTeam.slice(0, 3),
          difficulty: this.difficulty,
        });
      }
    }

    receiveLobbyState(data) {
      this.clearMatchLaunchTimeout();
      this.state = null;
      this.pendingCommand = null;
      this.disconnectDeadline = null;
      const cancelled = !!(data && data.status === 'cancelled');
      this.lobbyStatus = cancelled ? null : data;
      this.queueSubmitting = false;
      this.matchLaunchPending = false;
      this.matchLaunchError = '';
      if (cancelled) {
        // A player-initiated cancel changes to Lobby before the server ack.
        // Do not let that later ack pull the app back into team setup.
        if (this.scene === 'MatchupScene') this.returnFromMatchup();
        else this.notify();
        return;
      }
      this.changeScene('MatchupScene');
    }

    receiveBattleState(data) {
      if (this.ignoreBattleUpdates || !data || this.isRetiredMatchId(data.match_id)) return;
      this.clearMatchLaunchTimeout();
      this.matchLaunchError = '';
      const currentMatchId = this.state && this.state.match_id;
      const nextMatchId = data.match_id;
      const sameMatch = !!this.state && (
        currentMatchId && nextMatchId
          ? currentMatchId === nextMatchId
          : !currentMatchId && !nextMatchId
      );
      const currentRevision = Number(this.state && this.state.state_revision);
      const nextRevision = Number(data.state_revision);
      if (
        sameMatch
        && Number.isFinite(currentRevision)
        && Number.isFinite(nextRevision)
        && nextRevision < currentRevision
      ) {
        return;
      }

      if (!sameMatch && this.state) {
        this.eventCursor = 0;
        this.playbackEvents = [];
        this.recentEvents = [];
        this.visiblePublicAction = null;
        this.visiblePublicActionUntil = 0;
        this.inspectedFighter = null;
      }
      const pendingCommand = this.pendingCommand;
      const pendingMatches = !!pendingCommand && (
        !pendingCommand.matchId || !nextMatchId || pendingCommand.matchId === nextMatchId
      );
      const completedCommand = pendingMatches
        && Number.isFinite(nextRevision)
        && nextRevision > pendingCommand.stateRevision
        ? pendingCommand
        : null;
      if (completedCommand || (pendingCommand && !pendingMatches)) {
        this.pendingCommand = null;
      }
      if (completedCommand && completedCommand.kind === 'convert_energy') {
        this.transmuteOpen = false;
        this.transmuteSources = [];
        this.transmuteTarget = null;
      }

      const log = data && Array.isArray(data.event_log) ? data.event_log : [];
      const nextEvents = log.slice(this.eventCursor);
      this.eventCursor = log.length;
      if (nextEvents.length) {
        this.playbackEvents = nextEvents.slice(-6);
        this.recentEvents = log.slice(-8).reverse();
        const visibleAction = nextEvents.slice().reverse().find((event) => (
          safeText(event && event.type) === 'skill_resolved'
        ));
        if (visibleAction) {
          this.visiblePublicAction = visibleAction;
          this.visiblePublicActionUntil = Date.now() + 4800;
        }
      }
      this.state = data;
      const transmutePlayer = this.me();
      const transmuteStillAllowed = sameMatch
        && data.phase === 'planning'
        && data.turn_player_id === this.mineId()
        && !data.paused
        && !data.result_type
        && !(transmutePlayer && transmutePlayer.energy_converted_this_turn);
      if (this.transmuteOpen && !transmuteStillAllowed) {
        this.transmuteOpen = false;
        this.transmuteSources = [];
        this.transmuteTarget = null;
      }
      const phaseSeconds = Number(data.phase_seconds_remaining);
      this.phaseTimerSnapshotSeconds = Number.isFinite(phaseSeconds) ? Math.max(0, phaseSeconds) : null;
      this.phaseTimerSnapshotAt = Date.now();
      if (data.first_creation_account) {
        this.firstCreationAccount = data.first_creation_account;
      }
      this.disconnectDeadline = data.paused && data.disconnect_grace_seconds_remaining != null
        ? Date.now() + Number(data.disconnect_grace_seconds_remaining) * 1000
        : null;
      this.lobbyStatus = null;
      this.matchLaunchPending = false;
      const ownPending = (data.pending_actions && data.pending_actions[this.mineId()]) || [];
      const me = this.me();
      if (ownPending.length) {
        const queueOrder = (data.queue_order && data.queue_order[this.mineId()]) || [];
        const queueIndex = new Map(queueOrder.map((actionId, index) => [actionId, index]));
        this.actions = ownPending
          .map((action, index) => ({ ...action, _serverIndex: index }))
          .sort((left, right) => (
            (queueIndex.has(left.id) ? queueIndex.get(left.id) : queueOrder.length + left._serverIndex)
            - (queueIndex.has(right.id) ? queueIndex.get(right.id) : queueOrder.length + right._serverIndex)
          ))
          .map(({ _serverIndex, ...action }) => action);
        this.actionWildPays = Object.fromEntries(
          this.actions
            .filter((action) => Array.isArray(action.wildcard_pays) && action.wildcard_pays.length)
            .map((action) => [action.id, action.wildcard_pays.slice()]),
        );
        this.ensureWildcardPayments();
      } else if (data.phase === 'planning' || data.phase === 'finished' || data.turn_player_id !== this.mineId() || (me && me.queue_confirmed)) {
        this.actions = [];
        this.actionWildPays = {};
        this.queueReviewOpen = false;
      }

      const shouldConfirmQueue = !!completedCommand
        && completedCommand.kind === 'queue_update_before_confirm'
        && data.phase === 'queue_review'
        && data.turn_player_id === this.mineId()
        && this.actions.length > 0
        && !(me && me.queue_confirmed)
        && this.queueReviewFit().ok;
      if (!shouldConfirmQueue && (!this.pendingCommand || completedCommand)) {
        this.queueSubmitting = false;
      }
      this.ensureSelectedCaster();
      // Route every terminal result (WIN/FORFEIT/DRAW/NO_CONTEST) to
      // ResultScene, not just a decisive winner_id -- a draw or no-contest
      // still finishes the match and previously never left CombatScene.
      if (data.phase === 'finished') {
        this.rememberResult(data);
        this.changeScene('ResultScene');
      } else {
        this.changeScene('CombatScene');
      }
      if (shouldConfirmQueue) {
        this.queueSubmitting = true;
        this.queueReviewOpen = false;
        if (!this.beginCommand('battle_v2_confirm_queue', {}, 'queue_confirm')) {
          this.queueSubmitting = false;
          this.queueReviewOpen = true;
          this.showToast('Queue changed before confirmation. Review it and try again.');
        }
        this.notify();
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
      return (
        this.connectionState !== 'connected'
        || !!(this.state && this.state.paused)
        || !!(this.state && this.state.result_type)
        || !this.isMyTurn()
        || !!this.pendingCommand
        || this.queueSubmitting
        || !!(me && me.queue_confirmed)
      );
    }

    disconnectSecondsRemaining() {
      if (this.disconnectDeadline == null) return null;
      return Math.max(0, Math.ceil((this.disconnectDeadline - Date.now()) / 1000));
    }

    phaseSecondsRemaining() {
      if (!this.state || !['planning', 'queue_review'].includes(this.state.phase)) return null;
      if (!Number.isFinite(this.phaseTimerSnapshotSeconds)) return null;
      if (this.state.paused || !Number.isFinite(this.phaseTimerSnapshotAt)) {
        return Math.max(0, Math.ceil(this.phaseTimerSnapshotSeconds));
      }
      const elapsed = Math.max(0, (Date.now() - this.phaseTimerSnapshotAt) / 1000);
      return Math.max(0, Math.ceil(this.phaseTimerSnapshotSeconds - elapsed));
    }

    currentVisibleAction() {
      if (!this.visiblePublicAction || Date.now() >= this.visiblePublicActionUntil) return null;
      return this.visiblePublicAction;
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
      // The server treats selecting the opposing side as hostile even when a
      // compact/public catalog omits effect specs. Do not infer "helpful" from
      // missing client detail or an invulnerable enemy will glow selectable.
      if (kind === 'enemy' || kind === 'enemy_team') return true;
      return effects.some((effect) => effect.target !== 'self' && ['damage', 'health_steal', 'drain_energy', 'remove_status', 'counter'].includes(effect.type));
    }

    statusBlocksSkill(character, skill) {
      const classes = ((skill && skill.classes) || []).map((value) => safeText(value).toLowerCase());
      const activeStatuses = ((character && character.statuses) || []).filter((status) => Number(status.duration || 0) !== 0);
      const ignoresStun = activeStatuses.some((status) => status.payload && status.payload.ignore_stun);
      const kind = (skill && skill.target_rule && skill.target_rule.kind) || 'enemy';
      for (const status of activeStatuses) {
        const payload = status.payload || {};
        const statusName = safeText(status.name || status.id || 'Status');
        const stunned = (payload.stun_classes || []).map((value) => safeText(value).toLowerCase());
        if (!ignoresStun && (stunned.includes('all') || classes.some((skillClass) => stunned.includes(skillClass)))) {
          return `${statusName}: this skill class is disabled.`;
        }
        if (!ignoresStun && payload.stun_harmful && this.skillIsHarmful(skill)) {
          return `${statusName}: harmful skills are disabled.`;
        }
        if (payload.cannot_target_allies && ['ally', 'ally_team'].includes(kind)) {
          return `${statusName}: ally skills are disabled.`;
        }
        if (payload.block_non_damaging_skills && !(skill.effects || []).some((effect) => effect.target !== 'self' && ['damage', 'health_steal'].includes(effect.type))) {
          return `${statusName}: non-damaging skills are disabled.`;
        }
        if (payload.block_counters && (skill.effects || []).some((effect) => effect.payload && effect.payload.counter)) {
          return `${statusName}: counters are disabled.`;
        }
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
      this.inspectedFighter = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      this.clearToast();
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
      this.inspectedFighter = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      if (this.hasEffectFlag(skill, 'conditional_targeting', 'venom_bloom')) {
        const poisoned = this.livingSlots(foe).filter((slot) => (foe.team[slot].statuses || []).some((status) => status.id === 'poison' && Number(status.duration || 0) !== 0));
        if (!poisoned.length) {
          this.addAction(this.selectedCasterSlot, skill.id, this.enemyId(), null, this.livingSlots(foe));
          return;
        }
        this.targetingStage = 'venom_primary';
        this.clearToast();
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
          this.showToast('No selectable targets for that skill.');
          return;
        }
        this.addAction(this.selectedCasterSlot, skill.id, this.enemyId(), null, slots);
        return;
      }
      if (kind === 'ally_team') {
        const slots = this.teamTargetSlots(me, skill);
        if (!slots.length) {
          this.showToast('No selectable targets for that skill.');
          return;
        }
        this.addAction(this.selectedCasterSlot, skill.id, this.mineId(), null, slots);
        return;
      }
      if (!this.hasManualTargetForSkill(skill, kind === 'ally' ? 'mine' : 'enemy')) {
        this.showToast('No selectable targets for that skill.');
        this.selectedSkillId = null;
        this.notify();
        return;
      }
      this.clearToast();
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
        this.showToast('That fighter cannot be targeted by this skill.');
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
        this.clearToast();
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
        this.clearToast();
        this.notify();
        return;
      }
      this.addAction(this.selectedCasterSlot, this.selectedSkillId, side === 'enemy' ? this.enemyId() : this.mineId(), slot, []);
    }

    addAction(casterSlot, skillId, targetPlayerId, targetSlot, targetSlots, extras = {}) {
      if (this.controlsLocked()) return false;
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
      this.inspectedFighter = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      this.clearToast();
      this.ensureSelectedCaster();
      this.ensureWildcardPayments();
      this.lastActionPayloads = this.pendingActionPayloads();
      if (!this.beginCommand('battle_v2_submit_plan', { actions: this.lastActionPayloads }, 'submit_plan')) {
        this.showToast('Wait for the battle state to finish updating.');
        return false;
      }
      this.notify();
      return true;
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
      if (short.length) return { ok: false, reason: `Short on ${short.map(energyName).join(', ')}.` };
      const spare = Object.values(remaining).reduce((total, value) => total + Math.max(0, value), 0);
      if (spare < wildcardNeeded) return { ok: false, reason: 'Short on Wild energy.' };
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
      this.inspectedFighter = null;
      this.clearToast();
      this.queueReviewOpen = true;
      this.notify();
    }

    queueReviewFit() {
      if (!this.actions.length) return { ok: false, reason: 'Queue is empty.', actionId: null, remaining: null };
      const me = this.me();
      const energy = { green: 0, blue: 0, white: 0, red: 0, ...((me && me.energy) || {}) };
      for (const action of this.actions) {
        const caster = me && me.team ? me.team[action.caster_slot] : null;
        const skill = caster ? this.skillFor(caster, action.skill_id) : null;
        if (!caster || !skill) return { ok: false, reason: 'Queued action is no longer available.', actionId: action.id, remaining: { ...energy } };
        const pays = this.actionWildPays[action.id] || [];
        let wildIndex = 0;
        for (const color of this.adjustedCost(caster, skill)) {
          const pay = color === 'black' ? pays[wildIndex++] : color;
          if (!CORE_ENERGY.includes(pay) || Number(energy[pay] || 0) <= 0) {
            return {
              ok: false,
              reason: color === 'black' ? 'Assign every Wild payment.' : `Not enough ${pay} energy.`,
              actionId: action.id,
              remaining: { ...energy },
            };
          }
          energy[pay] -= 1;
        }
        if (pays.length !== wildIndex) return { ok: false, reason: 'Wild payment count changed.', actionId: action.id, remaining: { ...energy } };
      }
      return { ok: true, reason: '', actionId: null, remaining: { ...energy } };
    }

    closeQueueReview() {
      this.queueReviewOpen = false;
      this.clearToast();
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
      const started = this.beginCommand('battle_v2_update_queue', {
        queue_order: payloads.map((action) => action.id),
        wildcard_pays: Object.fromEntries(payloads.map((action) => [action.id, action.wildcard_pays || []])),
      }, 'queue_update_before_confirm');
      if (!started) {
        this.queueSubmitting = false;
        this.queueReviewOpen = true;
        this.showToast('Wait for the battle state to finish updating.');
      }
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
      this.beginCommand('battle_v2_cancel_queue', {}, 'cancel_queue');
      this.notify();
    }

    endTurn() {
      if (this.controlsLocked()) return;
      this.actions = [];
      this.actionWildPays = {};
      this.queueSubmitting = true;
      this.queueReviewOpen = false;
      this.beginCommand('battle_v2_end_turn', {}, 'end_turn');
      this.notify();
    }

    canTransmuteEnergy() {
      const me = this.me();
      const total = CORE_ENERGY.reduce(
        (sum, color) => sum + Number((me && me.energy && me.energy[color]) || 0),
        0,
      );
      return !!me
        && !!this.state
        && this.state.phase === 'planning'
        && !this.controlsLocked()
        && !this.actions.length
        && !me.energy_converted_this_turn
        && total >= 5;
    }

    openTransmute() {
      if (!this.canTransmuteEnergy()) {
        this.showToast('Transmute needs 5 available energy before you queue actions.');
        return;
      }
      this.selectedSkillId = null;
      this.detailSkillId = null;
      this.targetingStage = null;
      this.pendingPrimaryTarget = null;
      this.transmuteSources = [];
      this.transmuteTarget = null;
      this.transmuteOpen = true;
      this.notify();
    }

    closeTransmute() {
      this.transmuteOpen = false;
      this.transmuteSources = [];
      this.transmuteTarget = null;
      this.notify();
    }

    transmuteSourceCount(color) {
      return this.transmuteSources.filter((source) => source === color).length;
    }

    addTransmuteSource(color) {
      const me = this.me();
      if (!this.transmuteOpen || !CORE_ENERGY.includes(color) || !me) return;
      if (this.transmuteSources.length >= 5) return;
      const available = Number((me.energy || {})[color] || 0);
      if (this.transmuteSourceCount(color) >= available) {
        this.showToast('No more of that energy is available to sacrifice.');
        return;
      }
      this.transmuteSources = [...this.transmuteSources, color];
      this.notify();
    }

    removeTransmuteSource(color) {
      if (!this.transmuteOpen || !CORE_ENERGY.includes(color)) return;
      const index = this.transmuteSources.lastIndexOf(color);
      if (index < 0) return;
      this.transmuteSources = this.transmuteSources.filter((_, sourceIndex) => sourceIndex !== index);
      this.notify();
    }

    selectTransmuteTarget(color) {
      if (!this.transmuteOpen || !CORE_ENERGY.includes(color)) return;
      this.transmuteTarget = color;
      this.notify();
    }

    confirmTransmute() {
      if (!this.canTransmuteEnergy() || !this.transmuteOpen) {
        this.closeTransmute();
        return;
      }
      if (this.transmuteSources.length !== 5) {
        this.showToast(`Choose ${5 - this.transmuteSources.length} more energy to sacrifice.`);
        return;
      }
      if (!CORE_ENERGY.includes(this.transmuteTarget)) {
        this.showToast('Choose the energy type you want to create.');
        return;
      }
      const sources = this.transmuteSources.slice();
      const target = this.transmuteTarget;
      if (this.beginCommand('battle_v2_convert_energy', { sources, target }, 'convert_energy')) {
        this.transmuteOpen = false;
        this.showToast('Transmutation submitted. The server is validating it.');
        this.notify();
      }
    }

    convertEnergy() {
      this.openTransmute();
    }

    resetToLobby() {
      this.retireMatchId(this.state && this.state.match_id);
      if (!this.state && this.lobbyStatus && this.lobbyStatus.status !== 'cancelled') {
        this.socketClient.emit('battle_v2_leave_pvp', { room_id: this.lobbyStatus.room_id });
      }
      // Only surrender a match that's actually still live -- a finished draw
      // or no-contest has no winner_id either, but result_type is already
      // set for it, so it must not send a surrender on the way out.
      if (this.state && !this.state.result_type) {
        this.ignoreBattleUpdates = true;
        this.socketClient.emit('battle_v2_surrender', this.commandPayload());
      }
      this.state = null;
      this.pendingCommand = null;
      this.disconnectDeadline = null;
      this.clearResumeSession();
      this.lobbyStatus = null;
      this.actions = [];
      this.actionWildPays = {};
      this.selectedCasterSlot = null;
      this.selectedSkillId = null;
      this.queueSubmitting = false;
      this.matchLaunchPending = false;
      this.matchLaunchError = '';
      this.clearMatchLaunchTimeout();
      this.matchupReturnScene = 'DraftScene';
      this.queueReviewOpen = false;
      this.transmuteOpen = false;
      this.transmuteSources = [];
      this.transmuteTarget = null;
      this.detailCharacterId = null;
      this.detailSkillId = null;
      this.inspectedFighter = null;
      this.eventCursor = 0;
      this.playbackEvents = [];
      this.recentEvents = [];
      this.visiblePublicAction = null;
      this.visiblePublicActionUntil = 0;
      this.phaseTimerSnapshotSeconds = null;
      this.phaseTimerSnapshotAt = null;
      this.clearToast();
      this.changeScene('LobbyScene');
    }
  }
