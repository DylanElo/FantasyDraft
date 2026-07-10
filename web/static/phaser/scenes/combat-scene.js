/* COMBAT — mobile-app-v2 composition: versus header meeting at a gold VS
   diamond, "Your Turn" gold tag, inset energy tray, cut-corner fighter card
   rows (teal pulse on legal targets, gold ACTIVE on the selected caster),
   perspective-grid battlefield with a center prompt banner, and a command
   console of 4 technique tabs + ONE focused technique panel. */

import { COLORS, CORE_ENERGY } from '../core/runtime-config.js?v=18';
import { shortText } from '../core/text.js?v=18';
import { CombatQueueReviewScene } from './combat-queue-review-scene.js?v=18';
import { bannerPoints, bladePoints } from '../components/blade.js?v=18';
import { drawPlatePoly, drawWell, fillPoly } from '../components/plate.js?v=18';
import { drawCostPips, drawEnergyPip, drawHpBar, drawSkewTag } from '../components/widgets.js?v=18';

const CARD_W = 104;
const CARD_PORTRAIT_H = 84;
const CARD_H = 122;

export class CombatScene extends CombatQueueReviewScene {
    constructor() {
      super('CombatScene');
      this.focusTabBySlot = {};
    }

    teamHp(player) {
      let hp = 0;
      let max = 0;
      ((player && player.team) || []).forEach((character) => {
        hp += Number(character.hp || 0);
        max += Math.max(1, Number(character.max_hp || 1));
      });
      return { hp, max: Math.max(1, max) };
    }

    renderVersusHeader(frame, me, foe) {
      const x = frame.x + 14;
      const w = frame.width - 28;
      const y = 14;
      const mine = this.teamHp(me);
      const theirs = this.teamHp(foe);
      const barW = (w - 54) / 2;
      drawHpBar(this.graphics, x, y + 8, barW, 10, mine.hp / mine.max, 'hp');
      drawHpBar(this.graphics, x + w - barW, y + 8, barW, 10, theirs.hp / theirs.max, 'danger');
      // Gold VS diamond between the two bars.
      const cx = frame.x + frame.width / 2;
      const cy = y + 13;
      const r = 19;
      drawPlatePoly(this.graphics, [
        { x: cx, y: cy - r },
        { x: cx + r, y: cy },
        { x: cx, y: cy + r },
        { x: cx - r, y: cy },
      ], { fillTop: COLORS.gold300, fillBottom: COLORS.gold500 });
      this.display(cx, cy, 'VS', 13, { color: COLORS.inkText }).setOrigin(0.5, 0.5);
    }

    renderTurnRow(frame, state, me) {
      const y = 48;
      const x = frame.x + 14;
      // Turn tag — gold when it is your turn, ink otherwise; red once the
      // opponent disconnects (offline, or paused inside their grace window).
      const myTurn = this.store.isMyTurn();
      const disconnectSeconds = this.store.disconnectSecondsRemaining();
      const connectionWarning = this.store.connectionState === 'disconnected'
        ? 'Offline'
        : disconnectSeconds !== null
          ? `Paused ${disconnectSeconds}s`
          : null;
      drawSkewTag(this, this.graphics, x, y, connectionWarning || (myTurn ? 'Your Turn' : 'Enemy Turn'), {
        bg: connectionWarning ? COLORS.red500 : myTurn ? COLORS.gold400 : COLORS.ink700,
        color: connectionWarning ? '#FFFFFF' : myTurn ? '#0E0B16' : COLORS.muted,
        fontSize: 10,
      });
      // Inset energy tray.
      const energy = (me && me.energy) || {};
      const pips = [];
      CORE_ENERGY.forEach((color) => {
        for (let i = 0; i < Math.min(4, Number(energy[color] || 0)); i += 1) pips.push(color);
      });
      const shown = pips.slice(0, 7);
      const trayW = Math.max(74, shown.length * 21 + 22);
      const trayX = frame.x + frame.width - 14 - 40 - trayW;
      const trayPoints = bladePoints(trayX, y - 2, trayW, 28, 10, 'none');
      drawWell(this.graphics, trayPoints, COLORS.ink900);
      if (shown.length) {
        shown.forEach((color, index) => {
          drawEnergyPip(this, this.graphics, trayX + 14 + index * 21, y + 12, color, 17);
        });
        if (pips.length > shown.length) {
          this.stat(trayX + trayW - 6, y + 12, `+${pips.length - shown.length}`, 9, { color: COLORS.dim }).setOrigin(1, 0.5);
        }
      } else {
        this.label(trayX + trayW / 2, y + 12, 'No energy', 8, { color: COLORS.dim }).setOrigin(0.5, 0.5);
      }
      // Convert (2 same -> 1 chosen) — compact chip beside the tray.
      const convertDisabled = this.store.controlsLocked() || !!this.store.actions.length || !!(me && me.energy_converted_this_turn);
      this.plateButton(frame.x + frame.width - 14 - 34, y - 4, 34, 32, '⇄', () => this.store.convertEnergy(), {
        tone: 'ink', fontSize: 13, disabled: convertDisabled,
      });
      // Turn counter + leave, inline right of the tag.
      this.stat(x + 128, y + 12, `T${state.turn_number || 1}`, 10, { color: COLORS.dim }).setOrigin(0, 0.5);
      this.hotspot(x + 150, y - 4, 64, 32, 'Leave Battle', () => this.store.resetToLobby());
      this.label(x + 156, y + 12, 'Leave', 8, { color: COLORS.dim }).setOrigin(0, 0.5);
    }

    fighterCard(character, side, slot, x, y) {
      const store = this.store;
      const selected = side === 'mine' && store.selectedCasterSlot === slot && !store.controlsLocked();
      const targetable = store.canTarget(character, slot, side);
      const queuedIndex = side === 'mine' ? store.actions.findIndex((action) => Number(action.caster_slot) === slot) : -1;
      const dead = !character || !character.alive;
      const rim = targetable ? COLORS.target : selected ? COLORS.selection : COLORS.keyline;

      const cardPoints = bladePoints(x, y, CARD_W, CARD_H, 14, 'br');
      // Base plate + keyline.
      drawPlatePoly(this.graphics, cardPoints, {
        fillTop: COLORS.ink800,
        fillBottom: COLORS.ink900,
        alpha: dead ? 0.6 : 1,
      });
      // Portrait fills the top.
      if (!dead || character) {
        this.portraitPlate(character || { name: 'Down' }, x + 2, y + 2, CARD_W - 4, CARD_PORTRAIT_H, {
          cut: 0, corners: 'none', rim: COLORS.keyline, rimWidth: 1, dead,
          focusY: 0.35,
        });
      }
      const g = this.graphics;
      // Side tint over the portrait bottom: red for enemies only.
      const tint = side === 'enemy' ? COLORS.red600 : COLORS.ink950;
      for (let i = 0; i < 5; i += 1) {
        g.fillStyle(tint, (side === 'enemy' ? 0.06 : 0.11) * i);
        g.fillRect(x + 2, y + 2 + CARD_PORTRAIT_H * (0.55 + 0.09 * i), CARD_W - 4, CARD_PORTRAIT_H * 0.09 + 1);
      }
      // Info strip.
      this.label(x + 8, y + CARD_PORTRAIT_H + 8, shortText((character && character.name) || 'Down', 12).split(' ')[0], 8.5, {
        color: dead ? COLORS.dim : COLORS.text,
      });
      const hp = Number((character && character.hp) || 0);
      const maxHp = Math.max(1, Number((character && character.max_hp) || 1));
      drawHpBar(g, x + 8, y + CARD_PORTRAIT_H + 22, CARD_W - 16, 8, hp / maxHp, side === 'enemy' ? 'danger' : 'hp');
      // Rim above everything on the card.
      const rimG = this.layer();
      if (rim !== COLORS.keyline || selected) {
        rimG.lineStyle(3, rim, 1);
      } else {
        rimG.lineStyle(2, COLORS.keyline, 1);
      }
      rimG.beginPath();
      rimG.moveTo(cardPoints[0].x, cardPoints[0].y);
      for (let i = 1; i < cardPoints.length; i += 1) rimG.lineTo(cardPoints[i].x, cardPoints[i].y);
      rimG.closePath();
      rimG.strokePath();
      if (targetable) this.fx({ kind: 'pulsePoly', poly: cardPoints, offsetMs: slot * 140 });
      // ACTIVE tag on the selected caster.
      if (selected) {
        drawSkewTag(this, rimG, x + 4, y + 4, 'Active', {
          bg: COLORS.gold400, color: '#0E0B16', fontSize: 7, height: 15, padX: 5, keyline: false,
        });
      }
      if (queuedIndex >= 0) {
        fillPoly(rimG, bladePoints(x + CARD_W - 24, y + 4, 20, 18, 6, 'br'), COLORS.ink950, 0.92);
        this.stat(x + CARD_W - 14, y + 13, String(queuedIndex + 1), 10, { color: COLORS.goldTextSoft }).setOrigin(0.5, 0.5);
      }
      const protectedTarget = this.store.targetHasInvulnerability(character)
        && !this.store.skillBypassesInvulnerability(this.store.selectedSkill(), character);
      if (protectedTarget && !dead) {
        this.label(x + CARD_W / 2, y + CARD_PORTRAIT_H - 8, 'Invuln', 7, { color: COLORS.text }).setOrigin(0.5, 0.5);
      }
      // Status beads.
      ((character && character.statuses) || []).slice(0, 3).forEach((status, index) => {
        rimG.fillStyle(COLORS.ink500, 1);
        rimG.fillCircle(x + 12 + index * 14, y + CARD_PORTRAIT_H - 8, 6);
        this.stat(x + 12 + index * 14, y + CARD_PORTRAIT_H - 8, shortText(status.name || status.id, 1).toUpperCase(), 7, {
          color: '#FFFFFF',
        }).setOrigin(0.5, 0.5);
      });
      if (dead) {
        this.label(x + CARD_W / 2, y + CARD_PORTRAIT_H / 2, 'Down', 10, { color: COLORS.redText }).setOrigin(0.5, 0.5);
      }
      // Register playback anchor + hit area.
      const playerId = side === 'mine' ? this.store.mineId() : this.store.enemyId();
      if (playerId) {
        this.playbackTargets = this.playbackTargets || {};
        this.playbackTargets[`${playerId}:${slot}`] = {
          x: x + CARD_W / 2, y: y + CARD_PORTRAIT_H / 2, side, slot, size: CARD_PORTRAIT_H,
          tone: side === 'enemy' ? COLORS.red500 : COLORS.ink300,
        };
      }
      this.hotspot(x, y, CARD_W, CARD_H, `${side} ${slot}`, () => this.store.target(side, slot));
    }

    renderCardRow(team, side, frame, y) {
      const gap = 10;
      const rowW = CARD_W * 3 + gap * 2;
      const x0 = frame.x + (frame.width - rowW) / 2;
      (team || []).forEach((character, slot) => {
        this.fighterCard(character, side, slot, x0 + slot * (CARD_W + gap), y);
      });
    }

    renderBattlefield(frame, top, bottom, prompt, armed) {
      const g = this.graphics;
      const h = bottom - top;
      if (h < 30) return;
      // Perspective grid floor, violet, converging upward.
      const cx = frame.x + frame.width / 2;
      const horizon = top - h * 0.6;
      g.lineStyle(1.5, COLORS.curse500, 0.16);
      for (let i = 0; i <= 5; i += 1) {
        const t = i / 5;
        const y = top + h * t * t;
        g.beginPath();
        g.moveTo(frame.x - 20, y);
        g.lineTo(frame.x + frame.width + 20, y);
        g.strokePath();
      }
      for (let i = -6; i <= 6; i += 1) {
        const xBottom = cx + i * (frame.width / 7);
        const xTop = cx + i * (frame.width / 26);
        g.beginPath();
        g.moveTo(xTop, Math.max(top, horizon + (top - horizon)));
        g.lineTo(xBottom, bottom);
        g.strokePath();
      }
      // Center prompt banner.
      const bannerW = Math.min(frame.width - 70, Math.max(210, prompt.length * 7 + 80));
      const bannerH = 30;
      const points = bannerPoints(cx - bannerW / 2, top + h / 2 - bannerH / 2, bannerW, bannerH, 18);
      fillPoly(g, points, COLORS.ink950, 0.85);
      this.text(cx, top + h / 2, prompt, {
        fontSize: '12px',
        fontStyle: '600',
        color: armed ? COLORS.tealText : COLORS.muted,
        align: 'center',
      }).setOrigin(0.5, 0.5);
    }

    focusedSkillIndex(caster, skills) {
      const slot = Number(this.store.selectedCasterSlot);
      const armedIndex = skills.findIndex((skill) => skill.id === this.store.selectedSkillId);
      if (armedIndex >= 0) return armedIndex;
      const remembered = this.focusTabBySlot[slot];
      return remembered !== undefined && remembered < skills.length ? remembered : 0;
    }

    renderConsole(frame, consoleY, caster) {
      const g = this.layer();
      // Console slab.
      g.fillStyle(COLORS.ink900, 1);
      g.fillRect(frame.x, consoleY, frame.width, frame.height - consoleY);
      g.fillStyle(COLORS.keyline, 1);
      g.fillRect(frame.x, consoleY, frame.width, 2.5);
      const x = frame.x + 14;
      const w = frame.width - 28;

      if (!caster) {
        this.display(x, consoleY + 16, 'Select a fighter', 17);
        this.text(x, consoleY + 44, 'Tap one of your fighters to open their techniques.', {
          fontSize: '11px', color: COLORS.muted,
        });
        this.renderConsoleFooter(frame, x, w);
        return;
      }

      const skills = this.store.skillsFor(caster).slice(0, 4);
      const tab = this.focusedSkillIndex(caster, skills);
      const skill = skills[tab];

      // Technique tabs.
      const tabY = consoleY + 12;
      const tabW = (w - 6 * 3) / 4;
      skills.forEach((s, index) => {
        const tx = x + index * (tabW + 6);
        const active = index === tab;
        const cooldown = this.store.skillCooldown(caster, s);
        const usable = cooldown <= 0 && !this.store.statusBlocksSkill(caster, s) && this.store.skillFit(s, caster).ok;
        this.plateButton(tx, tabY, tabW, 44, `tab ${s.id}`, () => {
          this.focusTabBySlot[Number(this.store.selectedCasterSlot)] = index;
          if (this.store.selectedSkillId && this.store.selectedSkillId !== s.id) {
            this.store.selectedSkillId = null;
          }
          this.store.notify();
        }, {
          tone: active ? 'primary' : 'ink',
          showLabel: false,
          cut: 8,
          ledge: active ? undefined : null,
        });
        const nameNode = this.label(tx + tabW / 2, tabY + 12, shortText(s.name, 12), 7, {
          color: active ? '#FFFFFF' : COLORS.muted,
        });
        nameNode.setOrigin(0.5, 0.5);
        nameNode.setAlpha(usable ? 1 : 0.55);
        const adjusted = this.store.adjustedCost(caster, s);
        const costW = Math.min(4, adjusted.length) * 11;
        drawCostPips(this, this.layer(), tx + tabW / 2 - costW / 2, tabY + 30, adjusted.slice(0, 4), 8, 3);
      });

      // Focused technique panel.
      const panelY = tabY + 52;
      const panelH = 88;
      this.platePanel(x, panelY, w, panelH, { fillTop: COLORS.ink800, fillBottom: COLORS.ink800 });
      if (skill) {
        const cooldown = this.store.skillCooldown(caster, skill);
        const ruleBlock = this.store.statusBlocksSkill(caster, skill);
        const fit = this.store.skillFit(skill, caster);
        const slotQueued = this.store.queuedSlots().has(Number(this.store.selectedCasterSlot));
        const locked = this.store.controlsLocked();
        const blocked = cooldown > 0 ? `CD ${cooldown}` : ruleBlock || (!fit.ok ? fit.reason : slotQueued ? 'Already queued' : locked ? 'Waiting' : '');
        const armed = this.store.selectedSkillId === skill.id;
        const infoW = w - 108;
        this.text(x + 12, panelY + 10, shortText(skill.name, 26), { fontSize: '14px', fontStyle: '900' });
        this.text(x + 12, panelY + 30, shortText(this.store.effectLine(skill), 74), {
          fontSize: '10.5px', fontStyle: '500', color: COLORS.muted,
          wordWrap: { width: infoW - 16 },
        });
        this.stat(x + 12, panelY + panelH - 20, `CD ${skill.cooldown || 0}`, 10, { color: COLORS.goldText });
        this.label(x + 58, panelY + panelH - 19, this.store.targetLabel(skill), 8, { color: COLORS.dim });
        const costList = this.store.adjustedCost(caster, skill).slice(0, 5);
        drawCostPips(this, this.layer(), x + infoW - costList.length * 15, panelY + 14, costList, 12, 3);
        if (blocked) {
          drawSkewTag(this, this.graphics, x + 118, panelY + panelH - 26, shortText(blocked, 22), {
            bg: COLORS.red600, fontSize: 7, height: 15, padX: 6,
          });
        }
        this.plateButton(x + w - 92, panelY + panelH / 2 - 22, 80, 44, armed ? 'Armed ▲' : 'Use', () => {
          if (armed) {
            this.store.selectedSkillId = null;
            this.store.notify();
          } else {
            this.store.selectSkill(skill.id);
          }
        }, {
          tone: armed ? 'gold' : 'primary',
          fontSize: 12,
          disabled: !!blocked,
        });
      }

      this.renderConsoleFooter(frame, x, w);
    }

    renderConsoleFooter(frame, x, w) {
      const y = frame.height - 52;
      const locked = this.store.controlsLocked();
      this.plateButton(x, y, 74, 40, 'Reset', () => this.store.cancelQueue(), {
        tone: 'ghost', fontSize: 11,
        disabled: !this.store.actions.length || locked,
      });
      this.plateButton(x + 82, y, 88, 40, 'End Turn', () => this.store.endTurn(), {
        tone: 'ink', fontSize: 11, disabled: locked,
      });
      const reviewLabel = this.store.queueSubmitting ? 'Resolving' : `Review Queue (${this.store.actions.length})`;
      this.plateButton(x + 178, y, w - 178, 40, reviewLabel, () => this.store.openQueueReview(), {
        tone: 'primary', fontSize: 12,
        disabled: !this.store.actions.length || locked,
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      const state = this.store.state;
      if (!state) {
        this.topBar(frame, 'Opening Arena', () => this.store.resetToLobby());
        const waitingLabel = this.store.connectionState === 'disconnected'
          ? 'Reconnecting…'
          : 'Waiting for battle state from the server…';
        this.text(frame.x + frame.gutter, 130, waitingLabel, {
          fontSize: '12px', color: this.store.connectionState === 'disconnected' ? COLORS.redText : COLORS.muted,
        });
        this.toast(frame);
        return;
      }
      const me = this.store.me();
      const foe = this.store.foe();
      this.store.ensureSelectedCaster();
      const caster = me && me.team ? me.team[this.store.selectedCasterSlot] : null;
      this.playbackTargets = {};

      const consoleH = frame.height < 760 ? 232 : 252;
      const consoleY = frame.height - consoleH;
      const enemyY = 92;
      const allyY = consoleY - CARD_H - 10;

      this.renderVersusHeader(frame, me, foe);
      this.renderTurnRow(frame, state, me);

      const armed = !!this.store.selectedSkillId;
      const prompt = state.winner_id
        ? 'Battle finished'
        : this.store.queueReviewOpen
          ? 'Review queued techniques'
          : this.store.controlsLocked()
            ? 'Waiting for resolution…'
            : armed
              ? `Choose a target — ${shortText((this.store.selectedSkill() || {}).name, 20)}`
              : this.store.actions.length
                ? `${this.store.actions.length}/3 actions queued`
                : 'Pick a fighter, arm a technique';

      this.renderCardRow(foe && foe.team, 'enemy', frame, enemyY);
      this.layer();
      this.renderBattlefield(frame, enemyY + CARD_H + 8, allyY - 8, prompt, armed);
      this.renderCardRow(me && me.team, 'mine', frame, allyY);
      if (!this.store.queueReviewOpen) {
        this.renderConsole(frame, consoleY, caster);
      }
      this.renderQueueReviewSheet(frame);
      this.toast(frame);
      this.playEvents(frame);
    }
  }
