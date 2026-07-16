import { COLORS, TOKEN_TYPE } from '../core/runtime-config.js?v=20';
import { clamp, shortText, titleize } from '../core/text.js?v=20';
import { BaseScene } from './base-scene.js?v=20';

export class MissionMapScene extends BaseScene {
    constructor() {
      super('MissionMapScene');
    }

    renderMissionCard(mission, x, y, w, h, index) {
      const tone = index === 0 ? COLORS.selection : COLORS.talismanDim;
      this.platePanel(x, y, w, h, tone, { alpha: 0.9, edgeBar: 'left' });
      this.dossierTag(x + 14, y + 20, titleize(mission.tier || 'starter').toUpperCase(), tone);
      this.text(x + 14, y + 40, shortText(mission.title || mission.id, 31), { fontSize: '15px', fontStyle: '900' });
      this.mono(x + 14, y + 66, shortText(mission.description || 'Clear this route to unlock the next dossier.', 58), {
        color: COLORS.text,
        fontSize: '10px',
      });
      (mission.objectives || []).slice(0, 2).forEach((objective, objectiveIndex) => {
        this.mono(x + 16, y + 90 + objectiveIndex * 18, `- ${shortText(objective, 44)}`, { color: COLORS.muted, fontSize: '10px' });
      });
      this.railLabel(x + 14, y + h - 51, 'RECOMMENDED TEAM', tone);
      (mission.recommended_team || []).slice(0, 3).forEach((id, portraitIndex) => {
        this.platePortrait(this.store.character(id), x + 14 + portraitIndex * 39, y + h - 36, 30, { tone });
      });
      this.button(x + w - 114, y + h - 42, 96, 30, 'Use Team', () => this.store.applyRecommendedTeam(mission), {
        fill: COLORS.surfaceRaised,
        stroke: tone,
        mono: true,
        fontSize: '10px',
      });
    }

    renderLockedRoutes(frame, y) {
      const x = frame.x + frame.gutter;
      this.platePanel(x, y, frame.width - 32, 92, COLORS.line, { alpha: 0.66 });
      this.mono(x + 14, y + 12, 'LOCKED ROUTES', { color: COLORS.muted, fontSize: '10px' });
      ['Shibuya Incident', 'Culling Game', 'Shinjuku Showdown'].forEach((route, index) => {
        const rx = x + 14 + index * ((frame.width - 60) / 3);
        const routeW = (frame.width - 76) / 3;
        this.platePanel(rx, y + 35, routeW, 36, COLORS.line, { cut: 5, fill: 0x05070a, accentTriangle: false, highlight: false, alpha: 0.9 });
        this.mono(rx + 8, y + 47, shortText(route, 11), { color: COLORS.dim, fontSize: '9px' });
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'Mission Map', backHandler: () => this.store.changeScene('LobbyScene') });
      const x = frame.x + frame.gutter;
      const missions = this.store.missions();
      const pageSize = frame.height < 790 ? 1 : 2;
      const maxPage = Math.max(0, Math.ceil(missions.length / pageSize) - 1);
      this.store.missionPage = clamp(this.store.missionPage, 0, maxPage);
      const page = missions.slice(this.store.missionPage * pageSize, this.store.missionPage * pageSize + pageSize);
      let y = 92;
      this.platePanel(x, y, frame.width - 32, 74, COLORS.selection, { edgeBar: 'left' });
      this.text(x + 16, y + 13, 'Student Era Route', {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '18px',
        fontStyle: '900',
      });
      this.mono(x + 18, y + 44, 'Clear starter missions to reveal later arcs.', { color: COLORS.text, fontSize: '10px' });
      y += 94;
      page.forEach((mission, index) => {
        this.renderMissionCard(mission, x, y + index * 204, frame.width - 32, 190, this.store.missionPage * pageSize + index);
      });
      y += page.length * 204 + 4;
      this.renderLockedRoutes(frame, Math.min(y, frame.height - 212));

      this.button(x, frame.height - 106, 78, 34, 'Prev', () => {
        this.store.missionPage = Math.max(0, this.store.missionPage - 1);
        this.store.notify();
      }, { disabled: this.store.missionPage === 0, fill: COLORS.surfaceRaised, mono: true, fontSize: '10px' });
      this.mono(x + 94, frame.height - 96, `Route ${this.store.missionPage + 1}/${maxPage + 1}`, { color: COLORS.muted, fontSize: '10px' });
      this.button(x + frame.width - 108, frame.height - 106, 76, 34, 'Next', () => {
        this.store.missionPage = Math.min(maxPage, this.store.missionPage + 1);
        this.store.notify();
      }, { disabled: this.store.missionPage === maxPage, fill: COLORS.surfaceRaised, mono: true, fontSize: '10px' });
      this.button(x, frame.height - 58, frame.width - 32, 42, 'First Creation', () => this.store.changeScene('FirstCreationScene'), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
        fontSize: '13px',
      });
      this.toast(frame);
    }
  }
