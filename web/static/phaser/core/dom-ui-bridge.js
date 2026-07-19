const SCENE_HEADINGS = Object.freeze({
  BootScene: 'Loading JJK Arena',
  LobbyScene: 'Home',
  FirstCreationScene: 'First Creation',
  DraftScene: 'Team Setup',
  MissionMapScene: 'Missions',
  MatchupScene: 'Matchup',
  CombatScene: 'Combat Planning',
  ResultScene: 'Battle Results',
  RecordsScene: 'Records and Profile',
});

function safeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function slug(value, fallback = 'action') {
  const cleaned = safeString(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return cleaned || fallback;
}

function stableHash(value) {
  let hash = 2166136261;
  const text = safeString(value, 'action');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function sceneHeadingFor(sceneKey, options = {}) {
  if (safeString(options.heading)) return safeString(options.heading);
  if (sceneKey === 'CombatScene' && options.queueReviewOpen) return 'Queue Review';
  if (sceneKey === 'CombatScene' && options.resolving) return 'Resolution Playback';
  return SCENE_HEADINGS[sceneKey] || 'JJK Arena';
}

export function stableActionDomId(sceneKey, actionKey) {
  const scene = slug(sceneKey, 'scene');
  const key = safeString(actionKey, 'action');
  return `jjk-action-${scene}-${stableHash(`${sceneKey}:${key}`)}`;
}

export function isBlockingHitTarget(action, bounds = {}) {
  if (!action || action.mirror === false || action.blocker === true) return true;
  const width = Number(bounds.width || 0);
  const height = Number(bounds.height || 0);
  if (width <= 0 || height <= 0) return false;
  const x = Number(action.x || 0);
  const y = Number(action.y || 0);
  const w = Number(action.w || 0);
  const h = Number(action.h || 0);
  const coversWidth = w >= width * 0.9;
  const coversHeight = h >= height * 0.9;
  const startsAtEdge = x <= width * 0.05 && y <= height * 0.05;
  return coversWidth && coversHeight && startsAtEdge;
}

export function buildAccessibleActions(sceneKey, actions, bounds = {}) {
  // The bridge only mirrors labels and states explicitly registered by the
  // active scene. It never reads battle serialization, predicts legality, or
  // expands hidden opponent data on its own.
  const seen = new Map();
  return (Array.isArray(actions) ? actions : [])
    .filter((action) => action && typeof action.activate === 'function')
    .filter((action) => !isBlockingHitTarget(action, bounds))
    .map((action, index) => {
      const label = safeString(action.label, `Action ${index + 1}`);
      const baseKey = safeString(action.key, label);
      const duplicate = seen.get(baseKey) || 0;
      seen.set(baseKey, duplicate + 1);
      const key = duplicate ? `${baseKey}:${duplicate + 1}` : baseKey;
      const disabled = Boolean(action.disabled);
      const disabledReason = disabled
        ? safeString(action.disabledReason, 'Unavailable in the current state.')
        : '';
      return {
        id: stableActionDomId(sceneKey, key),
        key,
        label,
        disabled,
        disabledReason,
        activate: action.activate,
      };
    });
}

function nextMicrotask(documentRef, callback) {
  const view = documentRef && documentRef.defaultView;
  if (view && typeof view.queueMicrotask === 'function') {
    view.queueMicrotask(callback);
    return;
  }
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }
  Promise.resolve().then(callback);
}

export class DomUiBridge {
  constructor(documentRef = globalThis.document) {
    this.document = documentRef || null;
    this.headingNode = this.byId('jjk-scene-heading');
    this.actionRoot = this.byId('jjk-action-mirror');
    this.sceneLive = this.byId('jjk-scene-live');
    this.toastLive = this.byId('toast');
    this.dialog = this.byId('jjk-identity-dialog');
    this.dialogTitle = this.byId('jjk-identity-title');
    this.dialogLabel = this.byId('jjk-identity-label');
    this.dialogHint = this.byId('jjk-identity-hint');
    this.dialogError = this.byId('jjk-identity-error');
    this.dialogForm = this.byId('jjk-identity-form');
    this.dialogInput = this.byId('jjk-identity-input');
    this.dialogCancel = this.byId('jjk-identity-cancel');
    this.dialogSave = this.byId('jjk-identity-save');
    this.actionNodes = new Map();
    this.currentActions = new Map();
    this.currentSceneKey = '';
    this.currentHeading = '';
    this.currentActionCount = 0;
    this.lastToast = '';
    this.pendingSnapshot = null;
    this.reconcileQueued = false;
    this.identityRequest = null;
    this.restoreFocusNode = null;
    this.restoreActionId = '';
    this.onDocumentKeydown = (event) => this.handleDocumentKeydown(event);
    this.onDialogSubmit = (event) => this.submitIdentity(event);
    this.onDialogCancel = () => this.closeIdentityEditor(false);
    this.bindDialog();
  }

  byId(id) {
    return this.document && typeof this.document.getElementById === 'function'
      ? this.document.getElementById(id)
      : null;
  }

  bindDialog() {
    if (this.dialogForm && this.dialogForm.addEventListener) {
      this.dialogForm.addEventListener('submit', this.onDialogSubmit);
    }
    if (this.dialogCancel && this.dialogCancel.addEventListener) {
      this.dialogCancel.addEventListener('click', this.onDialogCancel);
    }
    if (this.document && this.document.addEventListener) {
      this.document.addEventListener('keydown', this.onDocumentKeydown);
    }
  }

  destroy() {
    if (this.dialogForm && this.dialogForm.removeEventListener) {
      this.dialogForm.removeEventListener('submit', this.onDialogSubmit);
    }
    if (this.dialogCancel && this.dialogCancel.removeEventListener) {
      this.dialogCancel.removeEventListener('click', this.onDialogCancel);
    }
    if (this.document && this.document.removeEventListener) {
      this.document.removeEventListener('keydown', this.onDocumentKeydown);
    }
    this.actionNodes.clear();
    this.currentActions.clear();
  }

  queueSceneActions(snapshot) {
    this.pendingSnapshot = snapshot || null;
    if (this.reconcileQueued) return;
    this.reconcileQueued = true;
    nextMicrotask(this.document, () => {
      this.reconcileQueued = false;
      const next = this.pendingSnapshot;
      this.pendingSnapshot = null;
      if (next) this.reconcileScene(next);
    });
  }

  clearScene(sceneKey) {
    if (sceneKey && sceneKey !== this.currentSceneKey) return;
    this.queueSceneActions({ sceneKey: '', actions: [], bounds: {} });
  }

  reconcileScene(snapshot) {
    const sceneKey = safeString(snapshot.sceneKey);
    const heading = sceneHeadingFor(sceneKey, {
      heading: snapshot.heading,
      queueReviewOpen: Boolean(snapshot.queueReviewOpen),
      resolving: Boolean(snapshot.resolving),
    });
    const actions = buildAccessibleActions(sceneKey, snapshot.actions, snapshot.bounds);
    const previousFocusedId = this.document && this.document.activeElement
      ? this.document.activeElement.id
      : '';
    const sceneChanged = sceneKey !== this.currentSceneKey || heading !== this.currentHeading;
    const actionCountChanged = actions.length !== this.currentActionCount;
    this.currentSceneKey = sceneKey;
    this.currentHeading = heading;
    this.currentActionCount = actions.length;
    if (this.headingNode) this.headingNode.textContent = heading;
    this.reconcileActions(actions);
    this.updateToast(snapshot.toast);
    if (sceneChanged || actionCountChanged) {
      this.announceScene(`${heading}. ${actions.length} available action${actions.length === 1 ? '' : 's'}.`);
    }

    if (previousFocusedId && this.document) {
      const preserved = this.document.getElementById(previousFocusedId);
      if (preserved && preserved !== this.document.activeElement && preserved.focus) {
        preserved.focus({ preventScroll: true });
      }
    }
  }

  reconcileActions(actions) {
    if (!this.actionRoot || !this.document || !this.document.createElement) return;
    const nextIds = new Set(actions.map((action) => action.id));
    this.actionNodes.forEach((entry, id) => {
      if (nextIds.has(id)) return;
      if (entry.button && entry.button.remove) entry.button.remove();
      if (entry.reason && entry.reason.remove) entry.reason.remove();
      this.actionNodes.delete(id);
      this.currentActions.delete(id);
    });

    actions.forEach((action) => {
      let entry = this.actionNodes.get(action.id);
      if (!entry) {
        const button = this.document.createElement('button');
        button.type = 'button';
        button.id = action.id;
        button.className = 'jjk-a11y-action';
        button.addEventListener('click', (event) => this.activateAction(action.id, event));
        // Some mobile/browser keyboard paths do not synthesize a native click
        // for a visually clipped button. Cancel the default key action before
        // explicit activation so Enter/Space always invoke exactly once.
        button.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.activateAction(action.id, event);
        });
        const reason = this.document.createElement('span');
        reason.id = `${action.id}-reason`;
        reason.className = 'jjk-sr-only';
        entry = { button, reason };
        this.actionNodes.set(action.id, entry);
      }
      entry.button.textContent = action.label;
      entry.button.dataset.actionKey = action.key;
      entry.button.setAttribute('aria-disabled', action.disabled ? 'true' : 'false');
      if (action.disabledReason) {
        entry.reason.textContent = `Unavailable: ${action.disabledReason}`;
        entry.button.setAttribute('aria-describedby', entry.reason.id);
        entry.button.title = action.disabledReason;
      } else {
        entry.reason.textContent = '';
        entry.button.removeAttribute('aria-describedby');
        entry.button.removeAttribute('title');
      }
      this.currentActions.set(action.id, action);
      this.actionRoot.appendChild(entry.button);
      this.actionRoot.appendChild(entry.reason);
    });
  }

  activateAction(id, event) {
    const action = this.currentActions.get(id);
    if (!action) return;
    if (event && event.stopPropagation) event.stopPropagation();
    if (action.disabled) {
      this.announceScene(action.disabledReason || 'Unavailable in the current state.');
      return;
    }
    action.activate();
  }

  announceScene(message) {
    if (!this.sceneLive) return;
    const text = safeString(message);
    if (!text || this.sceneLive.textContent === text) return;
    this.sceneLive.textContent = text;
  }

  updateToast(message) {
    if (!this.toastLive) return;
    const text = safeString(message);
    if (!text) {
      this.lastToast = '';
      this.toastLive.textContent = '';
      return;
    }
    if (text === this.lastToast) return;
    this.lastToast = text;
    this.toastLive.textContent = text;
  }

  openIdentityEditor(options = {}) {
    if (!this.dialog || !this.dialogInput || !this.dialogForm) return false;
    const type = options.type === 'room' ? 'room' : 'name';
    const maxLength = Math.max(1, Math.min(64, Number(options.maxLength || (type === 'name' ? 24 : 32))));
    const label = safeString(options.label, type === 'name' ? 'Player name' : 'Private room code');
    this.identityRequest = {
      type,
      label,
      maxLength,
      onSave: typeof options.onSave === 'function' ? options.onSave : () => {},
    };
    this.restoreFocusNode = this.document && this.document.activeElement;
    this.restoreActionId = options.restoreActionId
      ? stableActionDomId(this.currentSceneKey || 'LobbyScene', options.restoreActionId)
      : '';
    if (this.dialogTitle) this.dialogTitle.textContent = safeString(options.title, `Edit ${label}`);
    if (this.dialogLabel) this.dialogLabel.textContent = label;
    if (this.dialogHint) this.dialogHint.textContent = `1–${maxLength} characters. Changes stay on this device until you enter a match.`;
    if (this.dialogError) this.dialogError.textContent = '';
    this.dialogInput.setAttribute('aria-invalid', 'false');
    this.dialogInput.maxLength = maxLength;
    this.dialogInput.value = safeString(options.value);
    this.dialogInput.autocomplete = type === 'name' ? 'nickname' : 'off';
    this.dialogInput.setAttribute('autocapitalize', type === 'room' ? 'characters' : 'words');
    this.dialog.hidden = false;
    this.dialog.setAttribute('aria-hidden', 'false');
    if (this.actionRoot) {
      this.actionRoot.setAttribute('aria-hidden', 'true');
      if ('inert' in this.actionRoot) this.actionRoot.inert = true;
    }
    nextMicrotask(this.document, () => {
      if (!this.dialog.hidden && this.dialogInput.focus) {
        this.dialogInput.focus({ preventScroll: true });
        if (this.dialogInput.select) this.dialogInput.select();
      }
    });
    return true;
  }

  submitIdentity(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (!this.identityRequest || !this.dialogInput) return;
    const value = safeString(this.dialogInput.value).slice(0, this.identityRequest.maxLength);
    if (!value) {
      if (this.dialogError) this.dialogError.textContent = `${this.identityRequest.label} cannot be empty.`;
      this.dialogInput.setAttribute('aria-invalid', 'true');
      if (this.dialogInput.focus) this.dialogInput.focus({ preventScroll: true });
      return;
    }
    const request = this.identityRequest;
    request.onSave(value);
    this.closeIdentityEditor(true, `${request.label} saved.`);
  }

  closeIdentityEditor(saved = false, announcement = '') {
    if (!this.dialog || this.dialog.hidden) return;
    this.dialog.hidden = true;
    this.dialog.setAttribute('aria-hidden', 'true');
    if (this.actionRoot) {
      this.actionRoot.removeAttribute('aria-hidden');
      if ('inert' in this.actionRoot) this.actionRoot.inert = false;
    }
    this.identityRequest = null;
    if (this.dialogError) this.dialogError.textContent = '';
    if (this.dialogInput) this.dialogInput.setAttribute('aria-invalid', 'false');
    const restoreNode = this.restoreFocusNode;
    const restoreId = this.restoreActionId;
    this.restoreFocusNode = null;
    this.restoreActionId = '';
    this.announceScene(announcement || (saved ? 'Identity saved.' : 'Editing cancelled.'));
    nextMicrotask(this.document, () => {
      const fallback = restoreId && this.document ? this.document.getElementById(restoreId) : null;
      const isMeaningfulRestore = restoreNode
        && restoreNode.isConnected !== false
        && restoreNode !== this.document.body
        && restoreNode !== this.document.documentElement;
      const target = isMeaningfulRestore ? restoreNode : fallback;
      if (target && target.focus) target.focus({ preventScroll: true });
      else if (this.headingNode && this.headingNode.focus) this.headingNode.focus({ preventScroll: true });
    });
  }

  handleDocumentKeydown(event) {
    if (!this.dialog || this.dialog.hidden || !event) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeIdentityEditor(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [this.dialogInput, this.dialogCancel, this.dialogSave]
      .filter((node) => node && node.focus && !node.disabled);
    if (!focusable.length) return;
    const current = this.document && this.document.activeElement;
    const index = focusable.indexOf(current);
    const nextIndex = event.shiftKey
      ? (index <= 0 ? focusable.length - 1 : index - 1)
      : (index >= focusable.length - 1 ? 0 : index + 1);
    event.preventDefault();
    focusable[nextIndex].focus({ preventScroll: true });
  }
}
