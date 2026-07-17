import { COLORS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=23';
import { clamp, shortText, titleize } from '../core/text.js?v=23';
import { BaseScene } from './base-scene.js?v=23';

export class MissionMapScene extends BaseScene {
    constructor() {
      super('MissionMapScene');
    }

    renderMissionCard(mission, x, y, w, h, index) {
      const tone = index === 0 ? COLORS.selection : COLORS.line;
      this.platePanel(x, y, w, h, tone, { alpha: 0.9, edgeBar: 'left' });
      this.dossierTag(x + 14, y + 20, titleize(mission.tier || 'starter').toUpperCase(), tone);
      this.text(x + 14, y + 42, shortText(mission.title || mission.id, 31), { fontSize: `${TYPE_SCALE.subtitle}px`, fontStyle: '900' });
      this.text(x + 14, y + 68, shortText(mission.description || 'Clear this route to unlock the next dossier.', 58), {
        color: COLORS.muted,
        fontSize: `${TYPE_SCALE.body}px`,
      });
      (mission.objectives || []).slice(0, 2).forEach((objective, objectiveIndex) => {
        this.text(x + 16, y + 92 + objectiveIndex * 22, `- ${shortText(objective, 44)}`, { color: COLORS.text, fontSize: `${TYPE_SCALE.body}px` });
      });
      this.railLabel(x + 14, y + h - 51, 'RECOMMENDED TEAM', tone);
      (mission.recommended_team || []).slice(0, 3).forEach((id, portraitIndex) => {
        this.platePortrait(this.store.character(id), x + 14 + portraitIndex * 39, y + h - 36, 30, { tone });
      });
      this.button(x + w - 114, y + h - 50, 96, 44, 'Use Team', () => this.store.applyRecommendedTeam(mission), {
        fill: COLORS.surfaceRaised,
        stroke: tone,
        mono: true,
        fontSize: `${TYPE_SCALE.label}px`,
      });
    }

    renderLockedRoutes(frame, y) {
      const x = frame.x + frame.gutter;
      this.platePanel(x, y, frame.width - 32, 92, COLORS.line, { alpha: 0.66 });
      this.mono(x + 14, y + 12, 'LOCKED ROUTES', { color: COLORS.muted, fontSize: `${TYPE_SCALE.label}px` });
      ['Shibuya Incident', 'Culling Game', 'Shinjuku Showdown'].forEach((route, index) => {
        const rx = x + 14 + index * ((frame.width - 60) / 3);
        const routeW = (frame.width - 76) / 3;
        this.platePanel(rx, y + 35, routeW, 36, COLORS.line, { cut: 5, fill: 0x05070a, accentTriangle: false, highlight: false, alpha: 0.9 });
        this.text(rx + 8, y + 46, shortText(route, 11), { color: COLORS.dim, fontSize: `${TYPE_SCALE.label}px` });
      });
    }

    render() {
      const frame = this.layout.frame();
      this.clearSurface();
      this.worldBackdrop(frame, { textureKey: null, ambient: 'motes' });
      const header = this.dossierHeader(frame, { eyebrow: 'CURSED CLASH', title: 'Mission Map', backHandler: () => this.store.changeScene('LobbyScene') });
      const x = frame.x + frame.gutter;
      const missions = this.store.missions();
      const usableHeight = frame.bottom - frame.top;
      const pageSize = frame.width >= 430 && usableHeight >= 820 ? 2 : 1;
      const maxPage = Math.max(0, Math.ceil(missions.length / pageSize) - 1);
      this.store.missionPage = clamp(this.store.missionPage, 0, maxPage);
      const page = missions.slice(this.store.missionPage * pageSize, this.store.missionPage * pageSize + pageSize);
      let y = header.bottom + 14;
      this.platePanel(x, y, frame.width - 32, 78, COLORS.selection, { edgeBar: 'left' });
      this.text(x + 16, y + 13, 'Student Era Route', {
        fontFamily: TOKEN_TYPE.display || 'Georgia, serif',
        fontSize: '18px',
        fontStyle: '900',
      });
      this.text(x + 18, y + 46, 'Clear starter missions to reveal later arcs.', { color: COLORS.paperText, fontSize: `${TYPE_SCALE.body}px` });
      y += 98;
      page.forEach((mission, index) => {
        this.renderMissionCard(mission, x, y + index * 204, frame.width - 32, 190, this.store.missionPage * pageSize + index);
      });
      y += page.length * 204 + 4;
      const ctaY = frame.bottom - 44;
      const navY = ctaY - 54;
      this.renderLockedRoutes(frame, Math.min(y, navY - 104));

      this.button(x, navY, 78, 44, 'Prev', () => {
        this.store.missionPage = Math.max(0, this.store.missionPage - 1);
        this.store.notify();
      }, { disabled: this.store.missionPage === 0, fill: COLORS.surfaceRaised, mono: true, fontSize: `${TYPE_SCALE.label}px` });
      this.mono(x + 94, navY + 16, `Route ${this.store.missionPage + 1}/${maxPage + 1}`, { color: COLORS.muted, fontSize: `${TYPE_SCALE.label}px` });
      this.button(x + frame.width - 108, navY, 76, 44, 'Next', () => {
        this.store.missionPage = Math.min(maxPage, this.store.missionPage + 1);
        this.store.notify();
      }, { disabled: this.store.missionPage === maxPage, fill: COLORS.surfaceRaised, mono: true, fontSize: `${TYPE_SCALE.label}px` });
      this.button(x, ctaY, frame.width - 32, 44, 'First Creation', () => this.store.changeScene('FirstCreationScene'), {
        fill: COLORS.selection,
        gradientTop: COLORS.talismanDim,
        stroke: COLORS.talismanPaper,
        color: '#08080a',
        fontSize: `${TYPE_SCALE.subtitle}px`,
      });
      this.toast(frame);
    }
  }
