// ─── Game State ───────────────────────────────────────────────────────────────
const MAX_TEAM_SIZE = 5;

const State = {
    SETUP: 'SETUP',
    IN_PROGRESS: 'IN_PROGRESS',
    DECIDING: 'DECIDING',
    FINISHED: 'FINISHED',
};

let game = null;
let allCharacters = [];

class Game {
    constructor(playerNames) {
        this.players = playerNames.map((name, i) => ({
            id: i,
            name,
            team: [],
            passUsed: false,
        }));
        this.deck = shuffle([...allCharacters]);
        this.currentIdx = 0;
        this.state = State.IN_PROGRESS;
        this.drawnCard = null;
    }

    get currentPlayer() {
        return this.players[this.currentIdx];
    }

    draw() {
        if (this.state !== State.IN_PROGRESS) return null;
        const card = this.deck.pop() || randomCharacter();
        this.drawnCard = card;

        if (this.currentPlayer.passUsed) {
            // Must keep
            this.currentPlayer.team.push(card);
            const msg = `${this.currentPlayer.name} drew ${card.name} and must keep it (pass already used).`;
            this._advance();
            return { card, autoKept: true, msg };
        }

        this.state = State.DECIDING;
        return { card, autoKept: false, msg: `${this.currentPlayer.name} drew ${card.name}!` };
    }

    keep() {
        if (this.state !== State.DECIDING) return null;
        const card = this.drawnCard;
        const pname = this.currentPlayer.name;
        this.currentPlayer.team.push(card);
        this._advance();
        return `${pname} kept ${card.name}.`;
    }

    pass() {
        if (this.state !== State.DECIDING || this.currentPlayer.passUsed) return null;
        this.currentPlayer.passUsed = true;
        const newCard = this.deck.pop() || randomCharacter();
        this.drawnCard = newCard;
        const pname = this.currentPlayer.name;
        this.currentPlayer.team.push(newCard);
        const msg = `${pname} passed! Redrawn: ${newCard.name} (kept automatically).`;
        this._advance();
        return { card: newCard, msg };
    }

    _advance() {
        this.drawnCard = null;
        const n = this.players.length;
        const done = this.players.every(p => p.team.length >= MAX_TEAM_SIZE);
        if (done) {
            this.state = State.FINISHED;
            return;
        }
        // Move to next player that still needs cards
        let tries = 0;
        do {
            this.currentIdx = (this.currentIdx + 1) % n;
            tries++;
        } while (this.currentPlayer.team.length >= MAX_TEAM_SIZE && tries < n);
        this.state = State.IN_PROGRESS;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function randomCharacter() {
    return allCharacters[Math.floor(Math.random() * allCharacters.length)];
}

function addLog(msg) {
    const log = document.getElementById('log');
    const el = document.createElement('div');
    el.className = 'log-entry';
    el.textContent = msg;
    log.prepend(el);
}

// ─── Card Rendering ───────────────────────────────────────────────────────────
function cardHTML(char, highlight = false) {
    const skills = (char.skills || []).map(skill => {
        const energy = (skill.energy || []).map(e => {
            const cls = e === 'none' ? 'energy-none' : `energy-${e.toLowerCase()}`;
            return `<div class="energy-icon ${cls}" title="${e}"></div>`;
        }).join('');

        return `
        <div class="skill">
            <div class="skill-header">
                <span class="skill-name">${esc(skill.name)}</span>
                <div class="energy-costs">${energy}</div>
            </div>
            <div class="skill-desc">${esc(skill.description)}</div>
            <div class="skill-meta">
                <span>CD: ${skill.cooldown}</span>
                <span>${esc(skill.classes)}</span>
            </div>
        </div>`;
    }).join('');

    const imgStyle = char.image_url ? `background-image:url('${char.image_url}')` : '';

    return `
    <div class="card${highlight ? ' new-card' : ''}">
        <div class="card-img" style="${imgStyle}">
            <div class="card-img-label">${esc(char.name)}</div>
        </div>
        <div class="card-body">
            <div class="card-desc">${esc(char.description)}</div>
            ${skills}
        </div>
    </div>`;
}

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── UI Rendering ─────────────────────────────────────────────────────────────
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function renderDraft() {
    if (!game) return;

    const { state, currentPlayer, players } = game;

    // Header
    document.getElementById('turn-player-name').textContent = currentPlayer.name;
    const sub = state === State.DECIDING ? '— decide: keep or pass?' : '— draw a card!';
    document.getElementById('turn-sub').textContent = sub;

    // Progress pips (total slots across all players)
    const totalSlots = players.length * MAX_TEAM_SIZE;
    const filled = players.reduce((sum, p) => sum + p.team.length, 0);
    const progressEl = document.getElementById('draft-progress');
    progressEl.innerHTML = Array.from({ length: totalSlots }, (_, i) =>
        `<div class="progress-pip${i < filled ? ' filled' : ''}"></div>`
    ).join('');

    // Action area
    const actionArea = document.getElementById('action-area');
    const btnDraw = document.getElementById('btn-draw');

    if (state === State.IN_PROGRESS) {
        actionArea.style.display = 'none';
        btnDraw.style.display = 'block';
    } else if (state === State.DECIDING) {
        actionArea.style.display = 'flex';
        btnDraw.style.display = 'none';
        document.getElementById('action-title').textContent = `Drew: ${game.drawnCard.name}`;
        document.getElementById('drawn-card-container').innerHTML = cardHTML(game.drawnCard, true);
        document.getElementById('btn-pass').disabled = currentPlayer.passUsed;
    }

    // Teams
    const teamsArea = document.getElementById('teams-area');
    teamsArea.innerHTML = players.map(p => {
        const isActive = (p.id === currentPlayer.id && state !== State.FINISHED);
        const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, i) =>
            p.team[i] ? cardHTML(p.team[i]) : `<div class="card-empty">Slot ${i + 1}</div>`
        ).join('');

        return `
        <div class="panel player-board${isActive ? ' active-board' : ''}">
            <div class="player-board-header">
                <span class="player-board-name">${esc(p.name)}</span>
                <span class="player-board-meta">${p.team.length}/${MAX_TEAM_SIZE} · Pass: ${p.passUsed ? 'used' : 'available'}</span>
            </div>
            <div class="player-team">${slots}</div>
        </div>`;
    }).join('');

    document.getElementById('game-status').textContent =
        `Round ${Math.floor(filled / players.length) + 1} of ${MAX_TEAM_SIZE}`;
}

function renderResults() {
    const { players } = game;
    const content = players.map((p, i) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣'];
        const teamStr = p.team.map(c => c.name).join(' · ');
        return `
        <div class="result-row">
            <div class="result-rank">${medals[i] || (i + 1)}</div>
            <div>
                <div class="result-name">${esc(p.name)}</div>
                <div class="result-team">${esc(teamStr)}</div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('results-content').innerHTML = content;
    document.getElementById('game-status').textContent = 'Draft complete!';
}

// ─── Setup UI ─────────────────────────────────────────────────────────────────
let playerCount = 2;

document.getElementById('btn-add-player').addEventListener('click', () => {
    if (playerCount >= 4) return;
    playerCount++;
    const row = document.createElement('div');
    row.className = 'player-input-row';
    row.innerHTML = `
        <label>Player ${playerCount}</label>
        <input type="text" placeholder="Name" class="player-name-input" data-idx="${playerCount - 1}">
    `;
    document.getElementById('player-inputs').appendChild(row);
    if (playerCount >= 4) {
        document.getElementById('btn-add-player').disabled = true;
    }
});

document.getElementById('btn-start').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.player-name-input');
    const names = Array.from(inputs).map(i => i.value.trim() || `Player ${Number(i.dataset.idx) + 1}`);

    if (allCharacters.length === 0) {
        alert('Characters not loaded yet. Please wait a moment.');
        return;
    }

    game = new Game(names);
    showSection('draft');
    renderDraft();
    addLog('Draft started! ' + names.join(' vs '));
});

// ─── Draft Actions ────────────────────────────────────────────────────────────
document.getElementById('btn-draw').addEventListener('click', () => {
    if (!game || game.state !== State.IN_PROGRESS) return;
    const result = game.draw();
    if (!result) return;
    addLog(result.msg);
    if (result.autoKept) {
        if (game.state === State.FINISHED) {
            renderResults();
            showSection('results');
        } else {
            renderDraft();
        }
    } else {
        renderDraft();
    }
});

document.getElementById('btn-keep').addEventListener('click', () => {
    if (!game || game.state !== State.DECIDING) return;
    const msg = game.keep();
    if (!msg) return;
    addLog(msg);
    if (game.state === State.FINISHED) {
        renderResults();
        showSection('results');
    } else {
        renderDraft();
    }
});

document.getElementById('btn-pass').addEventListener('click', () => {
    if (!game || game.state !== State.DECIDING) return;
    const result = game.pass();
    if (!result) return;
    addLog(result.msg);
    if (game.state === State.FINISHED) {
        renderResults();
        showSection('results');
    } else {
        renderDraft();
    }
});

document.getElementById('btn-new-game').addEventListener('click', () => {
    game = null;
    playerCount = 2;
    const inputs = document.getElementById('player-inputs');
    inputs.innerHTML = `
        <div class="player-input-row">
            <label>Player 1</label>
            <input type="text" placeholder="Name" class="player-name-input" data-idx="0">
        </div>
        <div class="player-input-row">
            <label>Player 2</label>
            <input type="text" placeholder="Name" class="player-name-input" data-idx="1">
        </div>`;
    document.getElementById('btn-add-player').disabled = false;
    document.getElementById('game-status').textContent = '';
    showSection('setup');
});

// ─── Load Characters ──────────────────────────────────────────────────────────
// CHARACTERS_DATA is injected by characters_data.js (no server fetch needed)
allCharacters = typeof CHARACTERS_DATA !== 'undefined' ? CHARACTERS_DATA : [];
if (allCharacters.length === 0) {
    document.getElementById('game-status').textContent = 'Error: character data missing.';
} else {
    console.log(`Loaded ${allCharacters.length} characters.`);
}
