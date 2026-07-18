import { COLORS, CULLING_COLORS, TOKEN_TYPE } from '../core/runtime-config.js?v=27';
import { safeText, shortText } from '../core/text.js?v=27';
import { eventAmount, eventTone } from './event-metrics.js?v=27';
import { BaseScene } from '../scenes/base-scene.js?v=27';

export class CombatPlaybackScene extends BaseScene {
    playEvents(frame) {
      const events = this.store.consumePlaybackEvents();
      if (!events.length) return;
      let actionNumber = 0;
      const hasQueuedResolution = events.some((event) => safeText(event.type) === 'skill_resolved');
      const baseDelay = hasQueuedResolution ? 220 : 0;
      if (hasQueuedResolution) this.playCinematicCurtain(frame);
      events.slice(0, 7).forEach((event, index) => {
        if (safeText(event.type) === 'skill_resolved') actionNumber += 1;
        const visibleActionNumber = actionNumber || null;
        this.time.delayedCall(baseDelay + index * 650, () => this.playEvent(event, frame, visibleActionNumber));
      });
    }

    playbackPoint(playerId, slot, frame, fallbackY) {
      const key = `${playerId}:${slot}`;
      if (this.playbackTargets && this.playbackTargets[key]) return this.playbackTargets[key];
      return {
        x: frame.x + frame.width / 2,
        y: fallbackY || frame.height * 0.42,
        size: 62,
        tone: CULLING_COLORS.selected,
      };
    }

    pointFromPayload(event, frame) {
      const payload = event && event.payload ? event.payload : {};
      if (payload.target_player_id !== undefined && payload.target_slot !== undefined && payload.target_slot !== null) {
        return this.playbackPoint(payload.target_player_id, payload.target_slot, frame, frame.height * 0.32);
      }
      if (payload.reflected_to_player_id !== undefined && payload.reflected_to_slot !== undefined && payload.reflected_to_slot !== null) {
        return this.playbackPoint(payload.reflected_to_player_id, payload.reflected_to_slot, frame, frame.height * 0.55);
      }
      if (payload.player_id !== undefined && payload.caster_slot !== undefined && payload.caster_slot !== null) {
        return this.playbackPoint(payload.player_id, payload.caster_slot, frame, frame.height * 0.55);
      }
      return {
        x: frame.x + frame.width / 2,
        y: frame.height * 0.36,
        size: 72,
        tone: CULLING_COLORS.selected,
      };
    }

    casterPointFromPayload(event, frame) {
      const payload = event && event.payload ? event.payload : {};
      if (payload.player_id !== undefined && payload.caster_slot !== undefined && payload.caster_slot !== null) {
        return this.playbackPoint(payload.player_id, payload.caster_slot, frame, frame.height * 0.55);
      }
      return null;
    }

    playCinematicCurtain(frame) {
      const nodes = [];
      const topBar = this.add.graphics().setDepth(21);
      topBar.fillStyle(COLORS.voidBlack, 0.74);
      topBar.fillRect(frame.x, 0, frame.width, 62);
      topBar.fillRect(frame.x, frame.height - 66, frame.width, 66);
      topBar.lineStyle(1, COLORS.selection, 0.34);
      topBar.beginPath();
      topBar.moveTo(frame.x + 18, 58);
      topBar.lineTo(frame.x + frame.width - 18, 58);
      topBar.moveTo(frame.x + 18, frame.height - 66);
      topBar.lineTo(frame.x + frame.width - 18, frame.height - 66);
      topBar.strokePath();
      nodes.push(topBar);

      const cx = frame.x + frame.width / 2;
      const cy = frame.height * 0.5;
      const ring = this.add.graphics({ x: cx, y: cy }).setDepth(21);
      [118, 82, 48].forEach((radius, index) => {
        ring.lineStyle(index === 1 ? 2 : 1, index === 1 ? COLORS.selection : COLORS.domain, index === 1 ? 0.46 : 0.22);
        ring.strokeCircle(0, 0, radius);
      });
      ring.lineStyle(1, COLORS.talismanDim, 0.22);
      ring.beginPath();
      ring.moveTo(-132, 0);
      ring.lineTo(132, 0);
      ring.moveTo(0, -132);
      ring.lineTo(0, 132);
      ring.strokePath();
      nodes.push(ring);

      nodes.push(this.add.text(cx, frame.height - 53, 'DOMAIN RESOLUTION', {
        fontFamily: TOKEN_TYPE.mono || '"JetBrains Mono", monospace',
        fontSize: '10px',
        fontStyle: '900',
        color: COLORS.paperText,
      }).setOrigin(0.5, 0).setDepth(22));
      this.tweens.add({
        targets: ring,
        scale: 1.22,
        angle: 8,
        alpha: 0,
        duration: 620,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: nodes,
        alpha: 0,
        duration: 760,
        delay: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => nodes.forEach((node) => node.destroy()),
      });
    }

    playCinematicCutIn(frame, title, tone) {
      const cx = frame.x + frame.width / 2;
      const y = frame.height * 0.205;
      const w = Math.min(frame.width - 26, 352);
      const panel = this.add.graphics({ x: cx - w / 2, y }).setDepth(27);
      panel.fillStyle(COLORS.inkBlack, 0.92);
      panel.fillRoundedRect(0, 0, w, 72, 18);
      panel.fillStyle(tone, 0.18);
      panel.fillTriangle(0, 0, w * 0.42, 0, 0, 72);
      panel.fillStyle(0xffffff, 0.06);
      panel.fillTriangle(w, 0, w - 80, 72, w, 72);
      panel.lineStyle(2, tone, 0.82);
      panel.strokeRoundedRect(0, 0, w, 72, 18);
      for (let i = 0; i < 5; i += 1) {
        panel.lineStyle(1, tone, 0.16);
        panel.beginPath();
        panel.moveTo(24 + i * 34, 7);
        panel.lineTo(2 + i * 34, 65);
        panel.strokePath();
      }
      const nodes = [panel];
      nodes.push(this.add.text(cx - w / 2 + 18, y + 12, 'CINEMATIC CUT-IN', {
        fontFamily: TOKEN_TYPE.mono || '"JetBrains Mono", monospace',
        fontSize: '10px',
        fontStyle: '900',
        color: COLORS.paperText,
      }).setDepth(28));
      nodes.push(this.add.text(cx - w / 2 + 18, y + 31, shortText(title, 34), {
        fontFamily: TOKEN_TYPE.display || 'Cinzel, Inter, serif',
        fontSize: '17px',
        fontStyle: '900',
        color: COLORS.text,
      }).setDepth(28));
      this.tweens.add({
        targets: nodes,
        x: '+=18',
        alpha: 0,
        duration: 520,
        delay: 80,
        ease: 'Cubic.easeIn',
        onComplete: () => nodes.forEach((node) => node.destroy()),
      });
    }

    playRing(point, color, options) {
      const opts = options || {};
      const ring = this.add.graphics({ x: point.x, y: point.y }).setDepth(opts.depth || 22);
      ring.lineStyle(opts.width || 3, color, opts.alpha || 0.9);
      ring.strokeCircle(0, 0, opts.radius || ((point.size || 62) / 2 + 16));
      if (opts.crosshair) {
        const r = opts.radius || ((point.size || 62) / 2 + 16);
        ring.lineStyle(1.5, color, 0.72);
        ring.beginPath();
        ring.moveTo(-r - 12, 0);
        ring.lineTo(-r + 8, 0);
        ring.moveTo(r - 8, 0);
        ring.lineTo(r + 12, 0);
        ring.moveTo(0, -r - 12);
        ring.lineTo(0, -r + 8);
        ring.moveTo(0, r - 8);
        ring.lineTo(0, r + 12);
        ring.strokePath();
      }
      this.tweens.add({
        targets: ring,
        scale: opts.scale || 1.45,
        alpha: 0,
        duration: opts.duration || 720,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
      return ring;
    }

    playSlashLine(from, to, color) {
      if (!from || !to) return;
      const line = this.add.graphics().setDepth(24);
      line.lineStyle(3, color, 0.78);
      line.beginPath();
      line.moveTo(from.x, from.y);
      line.lineTo(to.x, to.y);
      line.strokePath();
      line.lineStyle(1, 0xffffff, 0.24);
      line.beginPath();
      line.moveTo(from.x, from.y - 6);
      line.lineTo(to.x, to.y - 6);
      line.strokePath();
      this.tweens.add({
        targets: line,
        alpha: 0,
        duration: 420,
        ease: 'Cubic.easeOut',
        onComplete: () => line.destroy(),
      });
    }

    playActionBanner(frame, title, subtitle, tone, actionNumber) {
      const x = frame.x + frame.width / 2;
      const y = frame.height * 0.31;
      const w = Math.min(frame.width - 44, 328);
      const panel = this.add.graphics({ x: x - w / 2, y }).setDepth(28);
      panel.fillStyle(CULLING_COLORS.shadow, 0.16);
      panel.fillRoundedRect(0, 5, w, 58, 18);
      panel.fillStyle(CULLING_COLORS.ivory, 0.97);
      panel.fillRoundedRect(0, 0, w, 58, 18);
      panel.fillStyle(tone, 0.16);
      panel.fillRoundedRect(4, 4, w - 8, 18, 14);
      panel.lineStyle(2, tone, 0.78);
      panel.strokeRoundedRect(0, 0, w, 58, 18);
      if (actionNumber) {
        panel.fillStyle(tone, 0.94);
        panel.fillRoundedRect(12, 14, 34, 28, 14);
      }
      const nodes = [panel];
      if (actionNumber) {
        nodes.push(this.add.text(x - w / 2 + 29, y + 21, `Q${actionNumber}`, {
          fontFamily: TOKEN_TYPE.mono || '"JetBrains Mono", monospace',
          fontSize: '10px',
          fontStyle: '800',
          color: '#08080a',
        }).setOrigin(0.5, 0.5).setDepth(29));
      }
      nodes.push(this.add.text(x - w / 2 + (actionNumber ? 56 : 18), y + 12, shortText(title, 34), {
        fontFamily: TOKEN_TYPE.display || 'Cinzel, Inter, serif',
        fontSize: '15px',
        fontStyle: '900',
        color: CULLING_COLORS.text,
      }).setDepth(29));
      nodes.push(this.add.text(x - w / 2 + (actionNumber ? 56 : 18), y + 34, shortText(subtitle, 42), {
        fontFamily: TOKEN_TYPE.mono || '"JetBrains Mono", monospace',
        fontSize: '10px',
        fontStyle: '700',
        color: CULLING_COLORS.cobaltText,
      }).setDepth(29));
      this.tweens.add({
        targets: nodes,
        y: '-=18',
        alpha: 0,
        duration: 1250,
        ease: 'Cubic.easeOut',
        onComplete: () => nodes.forEach((node) => node.destroy()),
      });
    }

    playHpLag(point, tone) {
      const barW = 74;
      const bar = this.add.graphics({ x: point.x - barW / 2, y: point.y + (point.size || 62) / 2 + 18 }).setDepth(25);
      bar.fillStyle(CULLING_COLORS.charcoal, 0.22);
      bar.fillRoundedRect(0, 0, barW, 8, 4);
      bar.fillStyle(CULLING_COLORS.gold, 0.82);
      bar.fillRoundedRect(0, 0, barW, 8, 4);
      bar.fillStyle(tone, 0.95);
      bar.fillRoundedRect(0, 0, barW * 0.36, 8, 4);
      this.tweens.add({
        targets: bar,
        alpha: 0,
        y: '-=8',
        duration: 760,
        ease: 'Cubic.easeOut',
        onComplete: () => bar.destroy(),
      });
    }

    playFloatingText(point, text, color, options) {
      const opts = options || {};
      const node = this.add.text(point.x, point.y + (opts.offsetY || 0), text, {
        fontFamily: opts.mono ? (TOKEN_TYPE.mono || '"JetBrains Mono", monospace') : (TOKEN_TYPE.display || 'Cinzel, Inter, serif'),
        fontSize: opts.fontSize || '28px',
        fontStyle: '900',
        color,
        backgroundColor: opts.backgroundColor,
        padding: opts.padding || { x: 8, y: 4 },
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(opts.depth || 30);
      this.tweens.add({
        targets: node,
        y: `-=${opts.rise || 42}`,
        alpha: 0,
        duration: opts.duration || 920,
        ease: 'Cubic.easeOut',
        onComplete: () => node.destroy(),
      });
      return node;
    }

    playEvent(event, frame, actionNumber) {
      const tone = eventTone(event);
      const amount = eventAmount(event);
      const color = tone === 'damage'
        ? CULLING_COLORS.redText
        : tone === 'heal'
          ? '#357D4B'
          : tone === 'status'
            ? '#6240A8'
            : CULLING_COLORS.text;
      const type = safeText(event && event.type);
      const message = safeText(event && event.message, type);
      const point = this.pointFromPayload(event, frame);
      const casterPoint = this.casterPointFromPayload(event, frame);

      if (type === 'skill_resolved') {
        this.playCinematicCutIn(frame, message, CULLING_COLORS.gold);
        if (casterPoint) this.playRing(casterPoint, CULLING_COLORS.gold, { radius: (casterPoint.size || 62) / 2 + 20, alpha: 0.86 });
        if (casterPoint && point) this.playSlashLine(casterPoint, point, CULLING_COLORS.gold);
        return;
      }

      if (type.includes('counter') || type.includes('reflect')) {
        this.playActionBanner(frame, message, type.includes('reflect') ? 'REFLECT REVEAL' : 'COUNTER REVEAL', CULLING_COLORS.enemy, actionNumber);
        this.playRing(point, CULLING_COLORS.enemy, { crosshair: true, radius: (point.size || 62) / 2 + 22, width: 3, alpha: 0.95, duration: 820 });
        this.playFloatingText(point, type.includes('reflect') ? 'REFLECT' : 'COUNTER', CULLING_COLORS.redText, {
          fontSize: '19px',
          backgroundColor: '#3a0d0d',
          mono: true,
          rise: 30,
        });
        return;
      }

      if (tone === 'damage' || tone === 'heal') {
        const text = amount ? (tone === 'heal' ? `+${amount}` : `-${amount}`) : safeText(type, 'EVENT').replace(/_/g, ' ').toUpperCase();
        if (casterPoint && tone === 'damage') this.playSlashLine(casterPoint, point, CULLING_COLORS.enemy);
        this.playRing(point, tone === 'heal' ? COLORS.queued : CULLING_COLORS.enemy, {
          crosshair: tone === 'damage',
          radius: (point.size || 62) / 2 + 18,
          alpha: 0.86,
        });
        this.playFloatingText(point, text, color, {
          fontSize: amount ? '31px' : '18px',
          rise: 48,
        });
        this.playHpLag(point, tone === 'heal' ? COLORS.queued : CULLING_COLORS.enemy);
        if (tone === 'damage') {
          this.cameras.main.shake(150, 0.006);
        }
        return;
      }

      if (tone === 'status' || type.includes('status') || type.includes('energy')) {
        const status = event && event.payload && (event.payload.status || event.payload.energy || event.payload.name);
        const label = status ? safeText(status).replace(/_/g, ' ').toUpperCase() : safeText(type, 'STATUS').replace(/_/g, ' ').toUpperCase();
        this.playRing(point, COLORS.domain, { radius: (point.size || 62) / 2 + 18, alpha: 0.72 });
        this.playFloatingText(point, label, '#d8ccff', {
          fontSize: '14px',
          backgroundColor: '#170f24',
          mono: true,
          rise: 36,
          duration: 1000,
        });
        return;
      }

      this.playActionBanner(frame, message, safeText(type, 'EVENT').replace(/_/g, ' ').toUpperCase(), CULLING_COLORS.gold, actionNumber);
      this.playFloatingText(point, safeText(type, 'EVENT').replace(/_/g, ' ').toUpperCase(), color, {
        fontSize: '18px',
        mono: true,
        rise: 32,
      });
    }

}
