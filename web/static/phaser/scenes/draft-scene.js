/* TEAM BUILDER — mobile-app-v2 composition: skewed section banner, 3-slot
   pedestal over a violet glow floor, 4-column blade-cut roster grid with
   checkmarks, Enter Arena CTA disabled until the trio is full. */

import { BOOT, COLORS } from '../core/runtime-config.js?v=18';
import { shortText } from '../core/text.js?v=18';
import { presetTitle } from '../core/roster.js?v=18';
import { DraftRosterScene } from './draft-roster-scene.js?v=18';
import { bladePoints } from '../components/blade.js?v=18';
import { fillPoly } from '../components/plate.js?v=18';

export class DraftScene extends DraftRosterScene {
    constructor(key) {
      super(key || 'DraftScene');
    }

    renderPedestal(frame, y, slotH) {
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      const slotW = (w - 20) / 3;
      // Violet glow floor under the trio.
      const g = this.graphics;
      for (let i = 6; i >= 1; i -= 1) {
        g.fillStyle(COLORS.curse500, 0.07);
        g.fillEllipse(x + w / 2, y + slotH + 4, w * 0.84 * (i / 6), 26 * (i / 6));
      }
      const team = this.store[this.store.draftTarget] || [];
      for (let i = 0; i < 3; i += 1) {
        const sx = x + i * (slotW + 10);
        const id = team[i];
        if (id) {
          this.portraitPlate(id, sx, y, slotW, slotH, { corners: 'both', rim: COLORS.keyline, rimWidth: 3 });
          this.hotspot(sx, y, slotW, slotH, `Slot ${i + 1}`, () => this.store.toggleTeamPick(this.store.draftTarget, id));
        } else {
          const points = bladePoints(sx, y, slotW, slotH, 16, 'both');
          fillPoly(this.graphics, points, COLORS.ink900, 0.9);
          // Dashed placeholder border.
          this.graphics.lineStyle(2, COLORS.ink500, 0.9);
          for (let p = 0; p < points.length; p += 1) {
            const a = points[p];
            const b = points[(p + 1) % points.length];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const dashes = Math.max(2, Math.floor(len / 12));
            for (let d = 0; d < dashes; d += 2) {
              const t0 = d / dashes;
              const t1 = Math.min(1, (d + 1) / dashes);
              this.graphics.beginPath();
              this.graphics.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
              this.graphics.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
              this.graphics.strokePath();
            }
          }
          this.label(sx + slotW / 2, y + slotH / 2, `Slot ${i + 1}`, 10, { color: COLORS.dim }).setOrigin(0.5, 0.5);
        }
      }
    }

    renderRosterGrid(frame, y, maxBottom) {
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      const cols = 4;
      const gap = 8;
      const cardW = (w - gap * (cols - 1)) / cols;
      const cardH = cardW * (4 / 3);
      const rows = Math.max(1, Math.floor((maxBottom - y + gap) / (cardH + gap)));
      const pageSize = rows * cols;
      const roster = this.store.rosterEntries();
      const pageMax = Math.max(0, Math.ceil(roster.length / pageSize) - 1);
      this.store.draftPage = Math.max(0, Math.min(this.store.draftPage, pageMax));
      const page = roster.slice(this.store.draftPage * pageSize, this.store.draftPage * pageSize + pageSize);
      const teamKey = this.store.draftTarget;
      const team = this.store[teamKey] || [];

      page.forEach((character, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cx = x + col * (cardW + gap);
        const cy = y + row * (cardH + gap);
        const picked = team.includes(character.id);
        this.portraitPlate(character, cx, cy, cardW, cardH, {
          cut: 12,
          rim: picked ? COLORS.curse400 : COLORS.keyline,
          rimWidth: picked ? 3 : 2.5,
          alpha: picked ? 1 : 0.88,
        });
        if (picked) {
          this.graphics.fillStyle(COLORS.keyline, 1);
          this.graphics.fillCircle(cx + cardW - 12, cy + 12, 11);
          this.graphics.fillStyle(COLORS.curse500, 1);
          this.graphics.fillCircle(cx + cardW - 12, cy + 12, 9);
          this.text(cx + cardW - 12, cy + 12, '✓', {
            fontSize: '11px', fontStyle: '900', color: '#FFFFFF',
          }).setOrigin(0.5, 0.5);
        }
        this.hotspot(cx, cy, cardW, cardH, `Roster ${character.name}`, () => this.store.toggleTeamPick(teamKey, character.id));
      });

      const gridBottom = y + Math.max(1, Math.ceil(page.length / cols)) * (cardH + gap) - gap;
      if (pageMax > 0) {
        const navY = gridBottom + 8;
        this.plateButton(x, navY, 56, 34, '<', () => {
          this.store.draftPage = Math.max(0, this.store.draftPage - 1);
          this.store.notify();
        }, { tone: 'ink', fontSize: 13, disabled: this.store.draftPage === 0 });
        this.stat(x + w / 2, navY + 17, `${this.store.draftPage + 1}/${pageMax + 1}`, 11, { color: COLORS.dim }).setOrigin(0.5, 0.5);
        this.plateButton(x + w - 56, navY, 56, 34, '>', () => {
          this.store.draftPage = Math.min(pageMax, this.store.draftPage + 1);
          this.store.notify();
        }, { tone: 'ink', fontSize: 13, disabled: this.store.draftPage === pageMax });
        return navY + 34;
      }
      return gridBottom;
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.kanjiWatermark(frame);
      this.layer();

      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      const editingCpu = this.store.draftTarget === 'enemyTeam';

      // Header: back, skewed banner, display title.
      this.iconButton(frame.x + frame.width - frame.gutter - 44, 14, 44, 38, '<', () => this.store.resetToLobby());
      this.skewTag(x, 16, editingCpu ? 'Set the CPU Trio' : 'Assemble Your Trio', { fontSize: 10 });
      this.display(x, 40, 'Team Builder', 28);

      // Preset chips (apply to the team being edited).
      const presets = Object.keys((BOOT.firstCreation && BOOT.firstCreation.presets) || {})
        .slice(0, this.store.matchMode === 'cpu' ? 2 : 3);
      let chipX = x;
      presets.forEach((name) => {
        const label = shortText(presetTitle(name), 16);
        const chipW = Math.max(64, label.length * 6.4 + 20);
        this.plateButton(chipX, 82, chipW, 30, label, () => this.store.applyPreset(name, this.store.draftTarget), {
          tone: 'ink', fontSize: 9,
        });
        chipX += chipW + 7;
      });
      // CPU/practice edit toggle.
      if (this.store.matchMode === 'cpu') {
        this.plateButton(x + w - 92, 82, 92, 30, editingCpu ? 'Your Trio' : 'CPU Trio', () => {
          this.store.setDraftTarget(editingCpu ? 'playerTeam' : 'enemyTeam');
        }, { tone: 'ink', fontSize: 9, color: editingCpu ? COLORS.redText : undefined });
      }

      // CPU difficulty selector (reclaims the vertical space by pushing the
      // pedestal down only when a CPU trio is in play).
      let pedestalY = 126;
      if (this.store.matchMode === 'cpu') {
        this.label(x, 122, 'CPU Difficulty', 9, { color: COLORS.redText });
        const diffW = (w - 16) / 3;
        ['easy', 'normal', 'hard'].forEach((level, index) => {
          const active = this.store.difficulty === level;
          this.plateButton(x + index * (diffW + 8), 136, diffW, 30, level, () => this.store.setDifficulty(level), {
            tone: active ? 'gold' : 'ink', fontSize: 10,
          });
        });
        pedestalY = 176;
      }

      // Pedestal.
      const slotH = 150;
      this.renderPedestal(frame, pedestalY, slotH);

      // Roster grid fills the middle.
      const ctaH = 60;
      const ctaY = frame.height - 16 - ctaH;
      this.layer();
      this.renderRosterGrid(frame, pedestalY + slotH + 22, ctaY - 12);

      // Enter Arena CTA.
      this.layer();
      const ready = (this.store.playerTeam || []).length === 3
        && (this.store.matchMode !== 'cpu' || (this.store.enemyTeam || []).length === 3);
      const waiting = !!this.store.lobbyStatus;
      this.plateButton(x, ctaY, w, ctaH, waiting ? 'Waiting for opponent' : 'Enter Arena', () => this.store.startMatch(), {
        tone: 'primary', corners: 'both', display: true, fontSize: 20,
        disabled: !ready || waiting,
      });
      if (waiting && this.store.lobbyStatus.room_id) {
        this.stat(x + w / 2, ctaY - 10, `Room ${this.store.lobbyStatus.room_id}`, 10, { color: COLORS.tealText }).setOrigin(0.5, 1);
      }

      this.renderCharacterDetailSheet(frame, this.store.draftTarget);
      this.toast(frame);
    }
  }
