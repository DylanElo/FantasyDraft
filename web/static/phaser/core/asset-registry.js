import { COLORS } from './runtime-config.js?v=16';
import { safeText } from './text.js?v=16';

export class AssetRegistry {
  toneFor(id) {
    const tones = [COLORS.purple, COLORS.cyan, COLORS.gold, COLORS.red, COLORS.green, COLORS.blue];
    let hash = 0;
    safeText(id).split('').forEach((char) => {
      hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });
    return tones[Math.abs(hash) % tones.length];
  }
}

