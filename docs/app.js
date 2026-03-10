// ── FACTION MAPPING ───────────────────────────────────────────────────────────
const FACTION = {
    'Satoru Gojo': 'tokyo', 'Yuji Itadori': 'tokyo',
    'Megumi Fushiguro': 'tokyo', 'Nobara Kugisaki': 'tokyo',
    'Kento Nanami': 'tokyo', 'Yuta Okkotsu': 'tokyo',
    'Hakari Kinji': 'tokyo', 'Panda': 'tokyo', 'Shoko Ieiri': 'tokyo',
    'Aoi Todo': 'kyoto', 'Maki Zenin': 'kyoto', 'Toge Inumaki': 'kyoto',
    'Noritoshi Kamo': 'kyoto', 'Kasumi Miwa': 'kyoto', 'Mai Zenin': 'kyoto',
    'Mei Mei': 'other', 'Naobito Zenin': 'other', 'Toji Fushiguro': 'other',
    'Yuki Tsukumo': 'other', 'Kusakabe': 'other',
    'Suguru Geto': 'villain', 'Kenjaku': 'villain', 'Uraume': 'villain',
    'Naoya Zenin': 'villain',
    'Ryomen Sukuna': 'curse', 'Mahito': 'curse', 'Jogo': 'curse',
    'Hanami': 'curse', 'Choso': 'curse', 'Dagon': 'curse',
    'Hiromi Higuruma': 'culling', 'Fumihiko Takaba': 'culling',
    'Hajime Kashimo': 'culling', 'Hana Kurusu': 'culling',
    'Takako Uro': 'culling', 'Kirara Hoshi': 'culling',
};

const FACTION_LABEL = {
    tokyo: 'Tokyo',  kyoto: 'Kyoto',  other: 'Sorcerer',
    villain: 'Villain', curse: 'Curse', culling: 'Culling',
};

const FACTION_BG = {
    tokyo:   'linear-gradient(135deg,#1e2a4a,#0d1a3a)',
    kyoto:   'linear-gradient(135deg,#0d2a3a,#0a1a2a)',
    other:   'linear-gradient(135deg,#1a1a3a,#2a1a4a)',
    villain: 'linear-gradient(135deg,#2a0d0d,#1a0a1a)',
    curse:   'linear-gradient(135deg,#2a0a0a,#1a0505)',
    culling: 'linear-gradient(135deg,#2a1a00,#1a1000)',
};

// ── GAME LOGIC ────────────────────────────────────────────────────────────────
const MAX_TEAM = 5;
const GameState = { IN_PROGRESS: 0, DECIDING: 1, FINISHED: 2 };

let game = null;
let allChars = [];

class Game {
    constructor(names) {
        this.players = names.map((n, i) => ({
            id: i, name: n, team: [], passUsed: false,
        }));
        this.deck = shuffle([...allChars]);
        this.idx = 0;
        this.state = GameState.IN_PROGRESS;
        this.drawn = null;
    }

    get cur() { return this.players[this.idx]; }

    draw() {
        if (this.state !== GameState.IN_PROGRESS) return null;
        const card = this.deck.pop() ?? randChar();
        this.drawn = card;

        if (this.cur.passUsed) {
            this.cur.team.push(card);
            const msg = `${this.cur.name} drew ${card.name} (auto-kept — pass used).`;
            this._next();
            return { card, auto: true, msg };
        }
        this.state = GameState.DECIDING;
        return { card, auto: false, msg: `${this.cur.name} drew ${card.name}!` };
    }

    keep() {
        if (this.state !== GameState.DECIDING) return null;
        const card = this.drawn;
        const name = this.cur.name;
        this.cur.team.push(card);
        this._next();
        return `${name} kept ${card.name}.`;
    }

    pass() {
        if (this.state !== GameState.DECIDING || this.cur.passUsed) return null;
        this.cur.passUsed = true;
        const card = this.deck.pop() ?? randChar();
        this.drawn = card;
        const name = this.cur.name;
        this.cur.team.push(card);
        const msg = `${name} passed! Redrawn: ${card.name} (kept).`;
        this._next();
        return { card, msg };
    }

    _next() {
        this.drawn = null;
        const n = this.players.length;
        if (this.players.every(p => p.team.length >= MAX_TEAM)) {
            this.state = GameState.FINISHED; return;
        }
        let tries = 0;
        do { this.idx = (this.idx + 1) % n; tries++; }
        while (this.cur.team.length >= MAX_TEAM && tries < n);
        this.state = GameState.IN_PROGRESS;
    }
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function randChar() { return allChars[Math.floor(Math.random() * allChars.length)]; }

// ── RENDER UTILS ──────────────────────────────────────────────────────────────
function esc(s) {
    return String(s ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function skillTypeClass(classes) {
    const c = (classes || '').toLowerCase();
    if (c.includes('physical')) return 'type-physical';
    if (c.includes('bloodline')) return 'type-bloodline';
    if (c.includes('energy')) return 'type-energy';
    if (c.includes('strategic')) return 'type-strategic';
    return '';
}

function orbsHTML(energyArr) {
    return (energyArr || []).map(e => {
        const key = (e || 'none').toLowerCase();
        return `<div class="orb orb-${key}" title="${esc(e)}"></div>`;
    }).join('');
}

function cardHTML(char, highlight = false) {
    const faction = FACTION[char.name] || 'other';
    const bg = FACTION_BG[faction];
    const fLabel = FACTION_LABEL[faction] || '';
    const hasImg = char.image_url && !char.image_url.includes('placeholder');

    const artContent = hasImg
        ? `<div class="card-art" style="background-image:url('${char.image_url}')"></div>`
        : `<div class="card-art"><div class="card-art-fallback" style="background:${bg}">${esc(char.name.split(' ').map(w=>w[0]).join('')).toUpperCase()}</div></div>`;

    const skills = (char.skills || []).map(s => {
        const typeClass = skillTypeClass(s.classes);
        const cd = s.cooldown === 'None' || s.cooldown === '0' ? 'None' : s.cooldown;
        return `
        <div class="skill ${typeClass}">
            <div class="skill-header">
                <span class="skill-name">${esc(s.name)}</span>
                <div class="energy-row">${orbsHTML(s.energy)}</div>
            </div>
            <div class="skill-desc">${esc(s.description)}</div>
            <div class="skill-footer">
                <span class="skill-cd">CD: <span>${esc(cd)}</span></span>
                <span class="skill-class">${esc((s.classes||'').split(',')[0])}</span>
            </div>
        </div>`;
    }).join('');

    return `
    <div class="card faction-${faction}${highlight ? ' new-card' : ''}">
        ${artContent}
        <div class="card-name-bar">
            <div class="card-name">${esc(char.name)}</div>
            <div class="card-faction-badge">${esc(fLabel)}</div>
        </div>
        <div class="card-body">
            <div class="card-desc">${esc(char.description)}</div>
            ${skills}
        </div>
    </div>`;
}

// ── SECTIONS ──────────────────────────────────────────────────────────────────
function show(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ── RENDER DRAFT ─────────────────────────────────────────────────────────────
function renderDraft() {
    if (!game) return;
    const { state, cur, players } = game;

    // Turn header
    document.getElementById('turn-player-name').textContent = cur.name;
    document.getElementById('game-status').textContent =
        `Round ${Math.min(Math.floor(players.reduce((s,p)=>s+p.team.length,0)/players.length)+1,MAX_TEAM)} / ${MAX_TEAM}`;

    const sub = state === GameState.DECIDING ? 'Keep or pass?' : 'Your turn to draw';
    document.getElementById('turn-sub').textContent = sub;

    // Progress pips
    const total = players.length * MAX_TEAM;
    const filled = players.reduce((s,p)=>s+p.team.length,0);
    document.getElementById('progress-track').innerHTML =
        Array.from({length:total},(_,i)=>
            `<div class="pip${i<filled?' filled':''}"></div>`
        ).join('');

    // Draw / action area
    const drawZone = document.getElementById('draw-zone');
    const actionArea = document.getElementById('action-area');

    if (state === GameState.IN_PROGRESS) {
        drawZone.style.display = 'flex';
        actionArea.style.display = 'none';
    } else if (state === GameState.DECIDING) {
        drawZone.style.display = 'none';
        actionArea.style.display = 'flex';
        document.getElementById('action-title').textContent = `Drew: ${game.drawn.name}`;
        document.getElementById('drawn-card-container').innerHTML = cardHTML(game.drawn, true);
        document.getElementById('btn-pass').disabled = cur.passUsed;
    }

    // Teams
    document.getElementById('teams-area').innerHTML = players.map(p => {
        const isActive = (p.id === cur.id && state !== GameState.FINISHED);
        const slots = Array.from({length:MAX_TEAM},(_,i) =>
            p.team[i] ? cardHTML(p.team[i]) : `<div class="card-empty"><div class="slot-icon">✦</div><span>Slot ${i+1}</span></div>`
        ).join('');
        const passText = p.passUsed ? '<span style="color:#ef4444">used</span>' : '<span style="color:#22c55e">available</span>';
        return `
        <div class="player-board${isActive?' active-board':''}">
            <div class="board-header">
                <div class="board-name">
                    ${esc(p.name)}
                    ${isActive ? '<span class="active-badge">ACTIVE</span>' : ''}
                </div>
                <div class="board-meta">
                    ${p.team.length}/${MAX_TEAM} cards &nbsp;·&nbsp; Pass: ${passText}
                </div>
            </div>
            <div class="player-team">${slots}</div>
        </div>`;
    }).join('');
}

// ── RENDER RESULTS ────────────────────────────────────────────────────────────
function renderResults() {
    const medals = ['🥇','🥈','🥉','4️⃣'];
    document.getElementById('results-content').innerHTML =
        game.players.map((p,i) => `
        <div class="result-row">
            <div class="result-rank">${medals[i]||'·'}</div>
            <div>
                <div class="result-name">${esc(p.name)}</div>
                <div class="result-team">${p.team.map(c=>esc(c.name)).join(' · ') || '—'}</div>
            </div>
        </div>`).join('');
    document.getElementById('game-status').textContent = 'Draft complete!';
}

// ── SETUP UI ──────────────────────────────────────────────────────────────────
let pCount = 2;

function buildPlayerInputs() {
    const container = document.getElementById('player-inputs');
    container.innerHTML = '';
    for (let i = 0; i < pCount; i++) {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <label>Player ${i+1}</label>
            <input type="text" placeholder="Enter name" class="pname" data-idx="${i}">`;
        container.appendChild(row);
    }
}

buildPlayerInputs();

document.getElementById('btn-add-player').addEventListener('click', () => {
    if (pCount >= 4) return;
    pCount++;
    buildPlayerInputs();
    if (pCount >= 4) document.getElementById('btn-add-player').disabled = true;
});

document.getElementById('btn-start').addEventListener('click', () => {
    if (!allChars.length) { alert('Characters not loaded yet.'); return; }
    const names = [...document.querySelectorAll('.pname')]
        .map((el,i) => el.value.trim() || `Player ${i+1}`);
    game = new Game(names);
    show('draft');
    renderDraft();
    addLog(`Draft started! ${names.join(' vs ')}`, true);
});

// ── DRAFT ACTIONS ─────────────────────────────────────────────────────────────
document.getElementById('btn-draw').addEventListener('click', () => {
    if (!game || game.state !== GameState.IN_PROGRESS) return;
    const r = game.draw();
    if (!r) return;
    addLog(r.msg, r.auto);
    if (r.auto && game.state === GameState.FINISHED) { renderResults(); show('results'); }
    else renderDraft();
});

document.getElementById('btn-keep').addEventListener('click', () => {
    if (!game || game.state !== GameState.DECIDING) return;
    const msg = game.keep();
    if (!msg) return;
    addLog(msg);
    if (game.state === GameState.FINISHED) { renderResults(); show('results'); }
    else renderDraft();
});

document.getElementById('btn-pass').addEventListener('click', () => {
    if (!game || game.state !== GameState.DECIDING) return;
    const r = game.pass();
    if (!r) return;
    addLog(r.msg, true);
    if (game.state === GameState.FINISHED) { renderResults(); show('results'); }
    else renderDraft();
});

document.getElementById('btn-new-game').addEventListener('click', () => {
    game = null; pCount = 2;
    buildPlayerInputs();
    document.getElementById('btn-add-player').disabled = false;
    document.getElementById('game-status').textContent = '';
    show('setup');
});

// ── LOG ───────────────────────────────────────────────────────────────────────
function addLog(msg, important = false) {
    const el = document.createElement('div');
    el.className = 'log-entry' + (important ? ' important' : '');
    el.textContent = msg;
    document.getElementById('log').prepend(el);
}

// ── LOAD DATA ─────────────────────────────────────────────────────────────────
// CHARACTERS_DATA is injected by characters_data.js
allChars = typeof CHARACTERS_DATA !== 'undefined' ? CHARACTERS_DATA : [];
if (!allChars.length) {
    document.getElementById('game-status').textContent = '⚠ Character data missing';
} else {
    console.log(`Loaded ${allChars.length} characters.`);
}
