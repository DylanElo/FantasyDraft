/* MISSION MAP — Student Era route: mission plates with objectives and a
   recommended trio, locked later arcs, First Creation CTA. */

import { COLORS } from '../core/runtime-config.js?v=18';
import { clamp, shortText, titleize } from '../core/text.js?v=18';
import { BaseScene } from './base-scene.js?v=18';
import { drawBladePlate } from '../components/plate.js?v=18';

export class MissionMapScene extends BaseScene {
    constructor() {
      super('MissionMapScene');
    }

    renderMissionCard(mission, x, y, w, h, index) {
      this.platePanel(x, y, w, h);
      this.skewTag(x + 12, y + 10, titleize(mission.tier || 'starter'), {
        fontSize: 7, height: 16, padX: 6,
        bg: index === 0 ? COLORS.gold400 : COLORS.ink700,
        color: index === 0 ? '#0E0B16' : COLORS.muted,
      });
      this.text(x + 14, y + 32, shortText(mission.title || mission.id, 31), { fontSize: '15px', fontStyle: '900' });
      this.text(x + 14, y + 54, shortText(mission.description || 'Clear this route to unlock the next dossier.', 60), {
        fontSize: '10px', fontStyle: '500', color: COLORS.muted, wordWrap: { width: w - 28 },
      });
      (mission.objectives || []).slice(0, 2).forEach((objective, objectiveIndex) => {
        this.label(x + 14, y + 80 + objectiveIndex * 15, `· ${shortText(objective, 46)}`, 8, { color: COLORS.dim });
      });
      this.label(x + 14, y + h - 48, 'Recommended Team', 8, { color: COLORS.goldTextSoft });
      (mission.recommended_team || []).slice(0, 3).forEach((id, portraitIndex) => {
        this.portrait(this.store.character(id), x + 14 + portraitIndex * 38, y + h - 36, 30, {});
      });
      this.layer();
      this.plateButton(x + w - 110, y + h - 46, 96, 36, 'Use Team', () => this.store.applyRecommendedTeam(mission), {
        tone: 'gold', fontSize: 10,
      });
    }

    renderLockedRoutes(frame, y) {
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;
      this.label(x + 2, y, 'Locked Routes', 8, { color: COLORS.dim });
      ['Shibuya Incident', 'Culling Game', 'Shinjuku Showdown'].forEach((route, index) => {
        const rw = (w - 16) / 3;
        const rx = x + index * (rw + 8);
        drawBladePlate(this.graphics, rx, y + 14, rw, 38, {
          fillTop: COLORS.ink900,
          fillBottom: COLORS.ink900,
          cut: 10,
          bevel: false,
        });
        this.text(rx + rw / 2, y + 27, '🔒', { fontSize: '9px' }).setOrigin(0.5, 0.5);
        this.label(rx + rw / 2, y + 42, shortText(route, 16), 6.5, { color: COLORS.dim }).setOrigin(0.5, 0.5);
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.drawAppBg(frame);
      this.kanjiWatermark(frame, '任');
      this.layer();
      const x = frame.x + frame.gutter;
      const w = frame.width - frame.gutter * 2;

      this.iconButton(frame.x + frame.width - frame.gutter - 44, 14, 44, 38, '<', () => this.store.changeScene('LobbyScene'));
      this.skewTag(x, 16, 'Student Era Route', { fontSize: 10 });
      this.display(x, 40, 'Missions', 28);
      this.text(x, 76, 'Clear starter missions to reveal later arcs.', {
        fontSize: '11px', fontStyle: '500', color: COLORS.muted,
      });

      const missions = this.store.missions();
      const pageSize = frame.height < 790 ? 1 : 2;
      const maxPage = Math.max(0, Math.ceil(missions.length / pageSize) - 1);
      this.store.missionPage = clamp(this.store.missionPage, 0, maxPage);
      const page = missions.slice(this.store.missionPage * pageSize, this.store.missionPage * pageSize + pageSize);
      let y = 104;
      page.forEach((mission, index) => {
        this.renderMissionCard(mission, x, y + index * 190, w, 176, this.store.missionPage * pageSize + index);
      });
      y += page.length * 190;
      this.renderLockedRoutes(frame, Math.min(y + 6, frame.height - 200));

      const navY = frame.height - 128;
      this.layer();
      this.plateButton(x, navY, 56, 34, '<', () => {
        this.store.missionPage = Math.max(0, this.store.missionPage - 1);
        this.store.notify();
      }, { tone: 'ink', fontSize: 12, disabled: this.store.missionPage === 0 });
      this.stat(x + w / 2, navY + 17, `Route ${this.store.missionPage + 1}/${maxPage + 1}`, 10, { color: COLORS.dim }).setOrigin(0.5, 0.5);
      this.plateButton(x + w - 56, navY, 56, 34, '>', () => {
        this.store.missionPage = Math.min(maxPage, this.store.missionPage + 1);
        this.store.notify();
      }, { tone: 'ink', fontSize: 12, disabled: this.store.missionPage === maxPage });

      this.plateButton(x, frame.height - 74, w, 56, 'First Creation', () => this.store.changeScene('FirstCreationScene'), {
        tone: 'gold', corners: 'both', display: true, fontSize: 18,
      });
      this.toast(frame);
    }
  }
