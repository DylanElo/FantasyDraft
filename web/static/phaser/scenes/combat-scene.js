import {
  CORE_ENERGY,
  CULLING_COLORS,
  ENERGY_COLORS,
  ENERGY_LABELS,
} from '../core/runtime-config.js?v=57';
import { clamp, safeText } from '../core/text.js?v=57';
import {
  activeStatuses,
  statusCardLabel,
} from '../core/status-presentation.js?v=57';
import {
  renderCombatLogSheet,
  renderConnecting,
  renderFighterStatusSheet,
  renderSkillDetailSheet,
  renderTransmuteSheet,
} from './combat-sheets.js?v=57';
import {
  renderCompactStatusHud,
  renderResolutionReceipt,
  renderVisibleActionBanner,
  visibleActionSummary,
} from './combat-hud.js?v=57';
import {
  compactSkillCardDisabledReason,
  renderBottomActions,
  renderCommandDeck,
  renderIntegratedSkillArtwork,
  renderMiniTimeline,
  renderSkillButton,
  renderTechniqueArtwork,
  skillPresentation,
} from './combat-skill-deck.js?v=57';
import {
  actionTargetMark,
  renderBattlefield,
  renderFighterLane,
  renderFighterPlate,
  renderIdentityStrip,
  renderPortraitPlate,
  renderQueueMarks,
  renderReplayLine,
} from './combat-fighter-field.js?v=57';
import { IncidentCutLayouts, Season3UI } from '../ui/season3-ui.js?v=57';
import { CombatQueueReviewScene } from './combat-queue-review-scene.js?v=57';

export { compactSkillCardDisabledReason };

const {
  world: drawCurrentWorld,
  energyPip: drawEnergyPip,
} = Season3UI.current;

const WORLD_KEY = 'culling-current-rooftop';
const LOCATION_LINE = 'TOKYO MUNICIPAL ROOFTOP';

export class CombatScene extends CombatQueueReviewScene {
  constructor() {
    super('CombatScene');
  }

  syncButtonDebug() {
    if (this.domUI && typeof this.domUI.setCombatState === 'function') {
      const snapshot = this.store && typeof this.store.combatAccessibilitySnapshot === 'function'
        ? this.store.combatAccessibilitySnapshot()
        : null;
      this.domUI.setCombatState(snapshot);
    }
    super.syncButtonDebug();
  }

  renderIntegratedSkillArtwork(skill, region, options = {}) {
    return renderIntegratedSkillArtwork.call(this, skill, region, options);
  }

  combatLayout(frame) {
    const layout = IncidentCutLayouts.combat(frame);
    return { ...layout, compressed: layout.compact, dockY: layout.identityY };
  }

  renderWorld(frame) {
    drawCurrentWorld(this, frame, WORLD_KEY, {
      topWash: 0.04,
      bottomWash: 0.42,
      bottomHeight: Math.round(frame.height * 0.32),
      accents: false,
    });
    const g = this.graphics;
    // A few raw print cuts bind the controls to the painted rooftop without
    // covering the open targeting lane.
    g.lineStyle(2, CULLING_COLORS.cyan, 0.12);
    g.beginPath();
    g.moveTo(frame.x - 8, frame.top + 92);
    g.lineTo(frame.x + frame.width * 0.48, frame.top + 76);
    g.lineTo(frame.x + frame.width + 8, frame.top + 90);
    g.strokePath();
    g.lineStyle(2, CULLING_COLORS.vermilion, 0.1);
    g.beginPath();
    g.moveTo(frame.x + frame.width * 0.58, frame.top + 116);
    g.lineTo(frame.x + frame.width + 12, frame.top + 104);
    g.strokePath();
  }

  renderTopHud(frame, state, me, layout) {
    return renderCompactStatusHud.call(this, frame, state, me, layout);
  }


  renderEnergyMeter(x, y, w, h, energy, disabled = false) {
    const slots = CORE_ENERGY.map((color) => ({ color, label: ENERGY_LABELS[color] }));
    const step = w / 4;
    slots.forEach((slot, index) => {
      const count = Number((energy && energy[slot.color]) || 0);
      const cx = x + step * (index + 0.5);
      const cy = y + 14;
      drawEnergyPip(this, cx, cy, slot.color, {
        backingColor: CULLING_COLORS.charcoal,
        backingAlpha: disabled ? 0.08 : 0.14,
        backingRadius: 9,
        radius: 7,
        fillAlpha: disabled ? 0.3 : count ? 0.96 : 0.13,
        strokeRadius: 8.5,
        strokeColor: slot.color === 'white' ? CULLING_COLORS.charcoal : ENERGY_COLORS[slot.color],
        strokeAlpha: disabled ? 0.28 : 0.72,
        label: slot.label,
        labelColor: slot.color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText,
        labelFontStyle: '700',
        labelOffsetY: -5,
        below: String(count),
        belowColor: disabled ? CULLING_COLORS.mutedText : CULLING_COLORS.text,
        belowFontStyle: '700',
        belowOffsetY: 9,
      });
    });
    this.mono(x + w / 2, y + h - 13, 'TRANSMUTE 5:1', {
      color: disabled ? CULLING_COLORS.mutedText : '#007C84',
      fontSize: '12px',
      fontStyle: '700',
    }).setOrigin(0.5, 0);
  }

  renderPortraitPlate(character, x, y, w, h, options = {}) {
    return renderPortraitPlate.call(this, character, x, y, w, h, options);
  }

  actionTargetMark(side, slot) {
    return actionTargetMark.call(this, side, slot);
  }

  visibleStatusLabels(character) {
    return activeStatuses(character).slice(0, 2).map((status) => statusCardLabel(status));
  }

  statusSourceSkillName(status) {
    const payload = (status && status.payload) || {};
    const sourceSkillId = payload.source_skill_id || status.source_skill_id;
    if (!sourceSkillId) return '';
    const state = this.store.state || {};
    const sourcePlayer = state.players && state.players[status.source_player_id];
    const source = sourcePlayer && sourcePlayer.team ? sourcePlayer.team[status.source_slot] : null;
    const catalog = source && state.skill_catalog && state.skill_catalog[source.character_id];
    const skill = catalog && (catalog.skills || []).find((entry) => (
      entry.id === sourceSkillId || entry.original_slot_id === sourceSkillId
    ));
    return safeText((skill && skill.name) || payload.source_skill_name || sourceSkillId).replaceAll('_', ' ');
  }

  activeVisibleSkillForFighter(side, slot) {
    const sourcePlayerId = side === 'enemy' ? this.store.enemyId() : this.store.mineId();
    const state = this.store.state || {};
    for (const player of Object.values(state.players || {})) {
      for (const character of (player && player.team) || []) {
        for (const status of activeStatuses(character)) {
          if (status.source_player_id !== sourcePlayerId || Number(status.source_slot) !== Number(slot)) continue;
          const sourceSkillName = this.statusSourceSkillName(status);
          if (sourceSkillName) return sourceSkillName;
        }
      }
    }
    return '';
  }

  renderFighterPlate(character, side, slot, x, y, w, h) {
    return renderFighterPlate.call(this, character, side, slot, x, y, w, h);
  }

  renderFighterLane(team, side, frame, layout) {
    return renderFighterLane.call(this, team, side, frame, layout);
  }

  renderQueueMarks(frame, layout, y) {
    return renderQueueMarks.call(this, frame, layout, y);
  }

  renderReplayLine(frame, layout) {
    return renderReplayLine.call(this, frame, layout);
  }

  visibleActionSummary(action) {
    return visibleActionSummary.call(this, action);
  }

  renderVisibleActionBanner(frame, layout) {
    return renderVisibleActionBanner.call(this, frame, layout);
  }

  renderResolutionReceipt(frame, layout) {
    return renderResolutionReceipt.call(this, frame, layout);
  }


  renderBattlefield(frame, layout, prompt) {
    return renderBattlefield.call(this, frame, layout, prompt);
  }

  renderTechniqueArtwork(skill, index, x, y, w, h, tone, disabled, cost, selected = false) {
    return renderTechniqueArtwork.call(this, skill, index, x, y, w, h, tone, disabled, cost, selected);
  }

  skillPresentation(skill, caster) {
    return skillPresentation.call(this, skill, caster);
  }

  renderSkillButton(skill, caster, index, x, y, w, h) {
    return renderSkillButton.call(this, skill, caster, index, x, y, w, h);
  }

  renderIdentityStrip(frame, layout, selected) {
    return renderIdentityStrip.call(this, frame, layout, selected);
  }

  renderBottomActions(frame, layout) {
    return renderBottomActions.call(this, frame, layout);
  }

  renderMiniTimeline(frame, layout) {
    return renderMiniTimeline.call(this, frame, layout);
  }

  renderCommandDeck(frame, layout, selected) {
    return renderCommandDeck.call(this, frame, layout, selected);
  }

  renderSkillDetailSheet(frame, caster, skill) {
    return renderSkillDetailSheet.call(this, frame, caster, skill);
  }

  renderFighterStatusSheet(frame, inspected) {
    return renderFighterStatusSheet.call(this, frame, inspected);
  }

  renderCombatLogSheet(frame) {
    return renderCombatLogSheet.call(this, frame);
  }

  renderTransmuteSheet(frame) {
    return renderTransmuteSheet.call(this, frame);
  }

  renderConnecting(frame) {
    return renderConnecting.call(this, frame);
  }

  render() {
    const frame = this.layout.frame();
    this.clearSurface();
    this.renderWorld(frame);
    const state = this.store.state;
    if (!state) {
      this.renderConnecting(frame);
      this.toast(frame, { theme: 'light' });
      this.syncButtonDebug();
      return;
    }

    const me = this.store.me();
    const foe = this.store.foe();
    const selected = me && me.team ? me.team[this.store.selectedCasterSlot] : null;
    const layout = this.combatLayout(frame);
    this.playbackTargets = {};

    if (this.store.queueReviewOpen) {
      this.presentationLayerCall('renderTargetLane', { selectedSkill: null });
      this.presentationLayerCall('renderSelectedFighter', { character: null });
      this.renderTopHud(frame, state, me, layout);
      this.renderMiniTimeline(frame, layout);
      this.renderFighterLane(foe && foe.team, 'enemy', frame, layout);
      this.renderBattlefield(frame, layout, 'FINALIZE THE STORYBOARD');
      this.renderFighterLane(me && me.team, 'mine', frame, layout);
      this.renderQueueReviewSheet(frame);
      this.toast(frame, { theme: 'light' });
      this.playEvents(frame);
      this.renderPresentationSettingsSheet(frame, {
        onExit: () => this.store.resetToLobby(),
        exitLabel: 'EXIT BATTLE',
      });
      this.syncButtonDebug();
      return;
    }

    this.renderTopHud(frame, state, me, layout);
    this.renderVisibleActionBanner(frame, layout);

    if (this.store.combatLogOpen) {
      this.renderCombatLogSheet(frame);
      this.toast(frame, { theme: 'light' });
      this.renderPresentationSettingsSheet(frame, {
        onExit: () => this.store.resetToLobby(),
        exitLabel: 'EXIT BATTLE',
      });
      this.syncButtonDebug();
      return;
    }

    if (this.store.transmuteOpen) {
      this.renderTransmuteSheet(frame);
      this.toast(frame, { theme: 'light' });
      this.renderPresentationSettingsSheet(frame, {
        onExit: () => this.store.resetToLobby(),
        exitLabel: 'EXIT BATTLE',
      });
      this.syncButtonDebug();
      return;
    }

    const inspected = typeof this.store.inspectedFighterState === 'function'
      ? this.store.inspectedFighterState()
      : null;
    if (inspected) {
      this.renderFighterStatusSheet(frame, inspected);
      this.renderPresentationSettingsSheet(frame, {
        onExit: () => this.store.resetToLobby(),
        exitLabel: 'EXIT BATTLE',
      });
      this.syncButtonDebug();
      return;
    }

    if (this.store.detailSkillId && selected) {
      const detailSkill = this.store.skillFor(selected, this.store.detailSkillId);
      if (detailSkill) {
        this.renderSkillDetailSheet(frame, selected, detailSkill);
        this.toast(frame, { theme: 'light' });
        this.renderPresentationSettingsSheet(frame, {
          onExit: () => this.store.resetToLobby(),
          exitLabel: 'EXIT BATTLE',
        });
        this.syncButtonDebug();
        return;
      }
      this.store.detailSkillId = null;
    }

    const targetStagePrompt = this.store.targetingStage === 'alternate'
      ? 'TAP A CYAN ALTERNATE TARGET'
      : this.store.targetingStage === 'venom_secondary'
        ? 'TAP A CYAN SECONDARY TARGET'
        : this.store.targetingStage === 'venom_primary'
          ? 'TAP A CYAN POISONED TARGET'
          : 'TAP A CYAN FIGHTER TO TARGET';
    const connection = this.store.combatConnectionStatus();
    const lockedPrompt = connection.key === 'resuming'
      ? 'RESTORING BATTLE SESSION'
      : ['connecting', 'reconnecting'].includes(connection.key)
        ? 'RECONNECTING TO ARENA'
        : connection.key === 'paused_for_reconnect'
          ? 'BATTLE PAUSED FOR RECONNECT'
          : this.store.queueSubmitting
            ? this.store.pendingCommand && this.store.pendingCommand.kind === 'end_turn'
              ? 'PASSING TURN'
              : 'SERVER VALIDATING QUEUE'
            : this.store.pendingCommand
              ? 'SERVER VALIDATING ACTION'
              : !this.store.isMyTurn()
                ? 'OPPONENT TURN IN PROGRESS'
                : me && me.queue_confirmed
                  ? 'QUEUE CONFIRMED / WAITING'
                  : 'WAITING FOR SERVER';
    const visiblePlayback = typeof this.store.currentVisibleAction === 'function'
      && !!this.store.currentVisibleAction();
    const prompt = state.winner_id
      ? 'BATTLE FINISHED'
      : visiblePlayback
        ? 'TURN RESOLUTION'
      : this.store.controlsLocked()
        ? lockedPrompt
        : this.store.selectedSkillId
          ? targetStagePrompt
          : this.store.selectedCasterSlot !== null
            ? 'SELECT ONE OF FOUR TECHNIQUES'
            : 'SELECT ONE OF YOUR FIGHTERS';

    this.renderFighterLane(foe && foe.team, 'enemy', frame, layout);
    this.renderBattlefield(frame, layout, prompt);
    this.renderFighterLane(me && me.team, 'mine', frame, layout);
    const resolutionPlayback = visiblePlayback || ['resolving', 'turn_end'].includes(state.phase);
    if (!resolutionPlayback) {
      this.renderMiniTimeline(frame, layout);
      this.renderCommandDeck(frame, layout, selected);
    } else {
      this.renderResolutionReceipt(frame, layout);
    }
    this.toast(frame, { theme: 'light' });
    this.playEvents(frame);
    this.renderPresentationSettingsSheet(frame, {
      onExit: () => this.store.resetToLobby(),
      exitLabel: 'EXIT BATTLE',
    });
    this.syncButtonDebug();
  }
}
