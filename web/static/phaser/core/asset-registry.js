import { COLORS } from './runtime-config.js?v=22';
import { safeText } from './text.js?v=22';

export class AssetRegistry {
  toneFor(id) {
    const tones = [COLORS.talismanDim, COLORS.cursedTeal, COLORS.selectionGold, COLORS.sealRed, COLORS.bodyGreen, COLORS.techniqueBlue];
    let hash = 0;
    safeText(id).split('').forEach((char) => {
      hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });
    return tones[Math.abs(hash) % tones.length];
  }
}

