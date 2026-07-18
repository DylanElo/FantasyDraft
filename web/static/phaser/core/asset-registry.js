import {
  portraitEntryFor,
  portraitEntryForTextureKey,
  portraitFocalFor,
  portraitTextureKeyFor,
} from './portrait-registry.js?v=32';
import { COLORS, CULLING_COLORS } from './runtime-config.js?v=32';
import { safeText } from './text.js?v=32';

export class AssetRegistry {
  constructor() {
    this.portraitFailures = new Map();
    this.portraitContractIssues = [];
  }

  portraitFor(characterOrId) {
    const id = typeof characterOrId === 'string'
      ? characterOrId
      : (characterOrId && (characterOrId.id || characterOrId.character_id));
    return portraitEntryFor(id);
  }

  portraitKeyFor(characterOrId) {
    const id = typeof characterOrId === 'string'
      ? characterOrId
      : (characterOrId && (characterOrId.id || characterOrId.character_id));
    return portraitTextureKeyFor(id);
  }

  portraitFocalFor(characterOrId, context = 'square') {
    const id = typeof characterOrId === 'string'
      ? characterOrId
      : (characterOrId && (characterOrId.id || characterOrId.character_id));
    return portraitFocalFor(id, context);
  }

  reportPortraitLoadError(file) {
    const entry = portraitEntryForTextureKey(file && file.key);
    if (!entry) return false;
    const existing = this.portraitFailures.get(entry.id);
    const textureKey = String((file && file.key) || entry.textureKey);
    const reason = safeText(
      file && file.error && file.error.message,
      safeText(file && file.xhrLoader && file.xhrLoader.statusText, 'Asset request failed'),
    );
    if (existing) {
      if (!existing.textureKeys.includes(textureKey)) existing.textureKeys.push(textureKey);
      this.syncPortraitDiagnostics();
      return true;
    }
    const diagnostic = {
      id: entry.id,
      name: entry.name,
      file: entry.file,
      url: entry.url,
      textureKeys: [textureKey],
      reason,
    };
    this.portraitFailures.set(entry.id, diagnostic);
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(`[JJK portrait] Failed to load ${entry.id} from ${entry.url}: ${reason}`);
    }
    this.syncPortraitDiagnostics();
    return true;
  }

  reportPortraitContractIssue(issue) {
    if (!issue || !issue.message) return;
    const signature = `${issue.code || 'portrait_contract'}:${issue.id || ''}:${issue.message}`;
    if (this.portraitContractIssues.some((item) => item.signature === signature)) return;
    this.portraitContractIssues.push({ ...issue, signature });
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(`[JJK portrait] ${issue.message}`);
    }
    this.syncPortraitDiagnostics();
  }

  portraitLoadDiagnostics() {
    return {
      failures: Array.from(this.portraitFailures.values()).map((item) => ({
        ...item,
        textureKeys: item.textureKeys.slice(),
      })),
      contractIssues: this.portraitContractIssues.map(({ signature, ...item }) => ({ ...item })),
    };
  }

  syncPortraitDiagnostics() {
    if (typeof window !== 'undefined') {
      window.__jjkPortraitDiagnostics = this.portraitLoadDiagnostics();
    }
  }

  toneFor(id) {
    const portrait = portraitEntryFor(id);
    if (portrait) return portrait.accent;
    const tones = [CULLING_COLORS.cobalt, CULLING_COLORS.vermilion, CULLING_COLORS.gold, COLORS.bodyGreen, CULLING_COLORS.muted];
    let hash = 0;
    safeText(id).split('').forEach((char) => {
      hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });
    return tones[Math.abs(hash) % tones.length];
  }
}
