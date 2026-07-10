import { COLORS } from './runtime-config.js?v=18';
import { safeText } from './text.js?v=18';

export class AssetRegistry {
  toneFor(id) {
    // Neutral/ink accent tones only — combat-state colors stay reserved.
    const tones = [COLORS.ink500, COLORS.ink300, COLORS.curse600, COLORS.gold800, COLORS.ink700, COLORS.curse900];
    let hash = 0;
    safeText(id).split('').forEach((char) => {
      hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });
    return tones[Math.abs(hash) % tones.length];
  }
}

