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
    tokyo: 'Tokyo', kyoto: 'Kyoto', other: 'Sorcerer',
    villain: 'Villain', curse: 'Curse', culling: 'Culling',
};

// ── GAME LOGIC ────────────────────────────────────────────────────────────────
const MAX_TEAM = 5;
const GameState = { IN_PROGRESS: 0, DECIDING: 1, FINISHED: 2 };

let game = null;
let allChars = [];
let pCount = 2;

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
        const card = this.deck.length ? this.deck.pop() : randChar();
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
        const card = this.deck.length ? this.deck.pop() : randChar();
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

function scoreTeams(players) {
    return players.map(p => ({
        name: p.name,
        score: p.team.reduce((s, c) =>
            s + (c.skills || []).reduce((ss, sk) => ss + (sk.energy || []).length, 0), 0),
        team: p.team,
    })).sort((a, b) => b.score - a.score || Math.random() - 0.5);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function skillTypeClass(classes) {
    const c = (classes || '').toLowerCase();
    if (c.includes('physical'))  return 'type-physical';
    if (c.includes('bloodline')) return 'type-bloodline';
    if (c.includes('energy'))    return 'type-energy';
    if (c.includes('strategic')) return 'type-strategic';
    return '';
}

function orbsHTML(energyArr) {
    return (energyArr || []).map(e => {
        const key = (e || 'none').toLowerCase();
        return `<div class="orb orb-${key}" title="${esc(e)}"></div>`;
    }).join('');
}

// ── SCREEN SWITCHER ───────────────────────────────────────────────────────────
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── CARD HTML ─────────────────────────────────────────────────────────────────
function charCardHTML(char) {
    const faction = FACTION[char.name] || 'other';
    const fLabel  = FACTION_LABEL[faction] || '';
    const hasImg  = char.image_url && !char.image_url.includes('placeholder');

    const art = hasImg
        ? `<div class="char-art" style="background-image:url('${char.image_url}')"></div>`
        : `<div class="char-art"><div class="char-art-fallback">${esc(char.name.split(' ').map(w => w[0]).join('').toUpperCase())}</div></div>`;

    const skills = (char.skills || []).map(s => {
        const cd        = (!s.cooldown || s.cooldown === 'None' || s.cooldown === '0') ? 'None' : s.cooldown;
        const typeClass = skillTypeClass(s.classes);
        return `
        <div class="skill-item ${typeClass}">
            <div class="skill-top">
                <span class="skill-name">${esc(s.name)}</span>
                <div class="orbs">${orbsHTML(s.energy)}</div>
            </div>
            <div class="skill-desc">${esc(s.description)}</div>
            <div class="skill-meta">
                <span>CD: ${esc(cd)}</span>
                <span class="skill-class">${esc((s.classes || '').split(',')[0].trim())}</span>
            </div>
        </div>`;
    }).join('');

    return `
    <div class="char-card faction-${faction}">
        ${art}
        <div class="char-namebar">
            <div class="char-name">${esc(char.name)}</div>
            <div class="faction-badge">${esc(fLabel)}</div>
        </div>
        <div class="char-body">
            <p class="char-desc">${esc(char.description)}</p>
            <div class="skills-list">${skills}</div>
        </div>
    </div>`;
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
function buildNameInputs() {
    const container = document.getElementById('name-inputs');
    container.innerHTML = '';
    for (let i = 0; i < pCount; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <div class="form-label">Player ${i + 1}</div>
            <input class="name-field pname" type="text" placeholder="Enter name…" data-idx="${i}" autocomplete="off">`;
        container.appendChild(div);
    }
}

buildNameInputs();

document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pCount = parseInt(btn.dataset.n, 10);
        buildNameInputs();
    });
});

document.getElementById('btn-start').addEventListener('click', () => {
    if (!allChars.length) { toast('Characters not loaded yet.'); return; }
    const names = [...document.querySelectorAll('.pname')]
        .map((el, i) => el.value.trim() || `Player ${i + 1}`);
    game = new Game(names);
    show('draft');
    renderDraft();
});

document.getElementById('btn-browse-open').addEventListener('click', () => {
    activeFaction = 'all';
    document.querySelectorAll('.f-tab').forEach(t => t.classList.toggle('active', t.dataset.f === 'all'));
    renderCharGrid();
    show('browse');
});

// ── DRAFT RENDER ─────────────────────────────────────────────────────────────
function renderDraft() {
    if (!game) return;
    const { state, cur, players } = game;

    // Round badge
    const pickedTotal = players.reduce((s, p) => s + p.team.length, 0);
    const roundNum    = Math.min(Math.floor(pickedTotal / players.length) + 1, MAX_TEAM);
    document.getElementById('round-badge').textContent = `R${roundNum} / ${MAX_TEAM}`;

    // Turn bar
    document.getElementById('turn-avatar').textContent = cur.name[0].toUpperCase();
    document.getElementById('turn-name').textContent   = cur.name;

    // Pips (one per slot across all players, filled = already picked)
    const pipsEl = document.getElementById('turn-pips');
    pipsEl.innerHTML = players.map(p =>
        Array.from({ length: MAX_TEAM }, (_, i) =>
            `<div class="pip${i < p.team.length ? ' done' : ''}"></div>`
        ).join('')
    ).join('');

    // States
    const drawState   = document.getElementById('draw-state');
    const decideState = document.getElementById('decide-state');

    if (state === GameState.IN_PROGRESS) {
        drawState.classList.remove('hidden');
        decideState.classList.add('hidden');
        document.getElementById('turn-hint').textContent = 'Tap Draw to get a card';
        document.getElementById('btn-draw').classList.remove('hidden');
        document.getElementById('btn-keep').classList.add('hidden');
        document.getElementById('btn-pass').classList.add('hidden');
    } else if (state === GameState.DECIDING) {
        drawState.classList.add('hidden');
        decideState.classList.remove('hidden');
        document.getElementById('card-slot').innerHTML = charCardHTML(game.drawn);
        const hint = cur.passUsed ? 'Keep or redraw (pass used)?' : 'Keep or pass once?';
        document.getElementById('turn-hint').textContent = hint;
        document.getElementById('btn-draw').classList.add('hidden');
        document.getElementById('btn-keep').classList.remove('hidden');
        document.getElementById('btn-pass').classList.remove('hidden');
        document.getElementById('btn-pass').disabled = cur.passUsed;
    }
}

// Tap face-down card = draw
document.getElementById('face-down').addEventListener('click', () => {
    if (game && game.state === GameState.IN_PROGRESS)
        document.getElementById('btn-draw').click();
});

document.getElementById('btn-draw').addEventListener('click', () => {
    if (!game || game.state !== GameState.IN_PROGRESS) return;
    const r = game.draw();
    if (!r) return;
    toast(r.msg);
    if (r.auto && game.state === GameState.FINISHED) { showResults(); return; }
    renderDraft();
});

document.getElementById('btn-keep').addEventListener('click', () => {
    if (!game || game.state !== GameState.DECIDING) return;
    const msg = game.keep();
    if (!msg) return;
    toast(msg);
    if (game.state === GameState.FINISHED) { showResults(); return; }
    renderDraft();
});

document.getElementById('btn-pass').addEventListener('click', () => {
    if (!game || game.state !== GameState.DECIDING) return;
    const r = game.pass();
    if (!r) return;
    toast(r.msg);
    if (game.state === GameState.FINISHED) { showResults(); return; }
    renderDraft();
});

// ── RESULTS ───────────────────────────────────────────────────────────────────
function showResults() {
    if (!game) return;
    const results = scoreTeams(game.players);
    const medals  = ['🥇', '🥈', '🥉', '4️⃣'];

    document.getElementById('winner-name').textContent = results[0].name;
    document.getElementById('standings').innerHTML = results.map((r, i) => `
        <div class="standing-row">
            <div class="stand-rank">${medals[i] || '·'}</div>
            <div class="stand-info">
                <div class="stand-name">${esc(r.name)}</div>
                <div class="stand-pts">${r.score} pts</div>
                <div class="stand-team">${r.team.map(c => esc(c.name)).join(' · ') || '—'}</div>
            </div>
        </div>`).join('');

    show('results');
}

document.getElementById('btn-new-game').addEventListener('click', () => {
    game = null;
    pCount = 2;
    document.querySelectorAll('.count-btn').forEach(b => b.classList.toggle('active', b.dataset.n === '2'));
    buildNameInputs();
    show('setup');
});

// ── TEAMS PANEL ───────────────────────────────────────────────────────────────
document.getElementById('btn-teams-open').addEventListener('click', openTeamsPanel);
document.getElementById('btn-teams-close').addEventListener('click', closeTeamsPanel);

function openTeamsPanel() {
    if (!game) return;
    renderTeamsPanel(game.idx);
    document.getElementById('teams-panel').classList.add('open');
    document.getElementById('scrim').classList.remove('hidden');
}

function closeTeamsPanel() {
    document.getElementById('teams-panel').classList.remove('open');
    if (document.getElementById('char-modal').classList.contains('hidden'))
        document.getElementById('scrim').classList.add('hidden');
}

function renderTeamsPanel(activeIdx) {
    const { players } = game;

    document.getElementById('panel-tabs').innerHTML = players.map((p, i) => `
        <button class="p-tab${i === activeIdx ? ' active' : ''}" data-i="${i}">${esc(p.name)}</button>
    `).join('');

    document.querySelectorAll('.p-tab').forEach(btn => {
        btn.addEventListener('click', () => renderTeamsPanel(parseInt(btn.dataset.i, 10)));
    });

    const p     = players[activeIdx];
    const slots = Array.from({ length: MAX_TEAM }, (_, i) =>
        p.team[i] ? miniCardHTML(p.team[i]) : `<div class="mini-empty"><div class="mini-empty-plus">+</div>Slot ${i + 1}</div>`
    ).join('');

    document.getElementById('panel-body').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span style="font-family:'Cinzel',serif;font-weight:800;font-size:14px">${esc(p.name)}</span>
            <span style="font-size:11px;color:${p.passUsed ? 'var(--red)' : 'var(--green)'}">${p.passUsed ? '⚡ Pass used' : '✓ Pass available'}</span>
        </div>
        <div class="mini-grid">${slots}</div>`;

    document.querySelectorAll('.mini-card').forEach(el => {
        el.addEventListener('click', () => {
            closeTeamsPanel();
            openCharModal(el.dataset.name);
        });
    });
}

function miniCardHTML(char) {
    const faction = FACTION[char.name] || 'other';
    const hasImg  = char.image_url && !char.image_url.includes('placeholder');
    const artStyle = hasImg ? `background-image:url('${char.image_url}')` : '';
    return `
    <div class="mini-card faction-${faction}" data-name="${esc(char.name)}">
        <div class="mini-art" style="${artStyle}"></div>
        <div class="mini-name">${esc(char.name)}</div>
    </div>`;
}

// ── BROWSE ────────────────────────────────────────────────────────────────────
let activeFaction = 'all';

document.getElementById('btn-browse-back').addEventListener('click', () => show('setup'));

document.querySelectorAll('.f-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.f-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFaction = tab.dataset.f;
        renderCharGrid();
    });
});

function renderCharGrid() {
    const filtered = activeFaction === 'all'
        ? allChars
        : allChars.filter(c => (FACTION[c.name] || 'other') === activeFaction);

    document.getElementById('char-grid').innerHTML = filtered.map(c => {
        const faction = FACTION[c.name] || 'other';
        const hasImg  = c.image_url && !c.image_url.includes('placeholder');
        const artStyle = hasImg ? `background-image:url('${c.image_url}')` : '';
        return `
        <div class="char-thumb" data-name="${esc(c.name)}">
            <div class="char-thumb-art" style="${artStyle}">
                <div class="char-thumb-info">
                    <div class="char-thumb-name">${esc(c.name)}</div>
                    <div class="char-thumb-faction">${esc(FACTION_LABEL[faction] || '')}</div>
                </div>
            </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.char-thumb').forEach(el => {
        el.addEventListener('click', () => openCharModal(el.dataset.name));
    });
}

// ── CHAR MODAL ────────────────────────────────────────────────────────────────
function openCharModal(name) {
    const char = allChars.find(c => c.name === name);
    if (!char) return;
    document.getElementById('char-modal-sheet').innerHTML = `
        <div style="display:flex;justify-content:flex-end;padding:12px 14px 0">
            <button class="icon-btn" id="btn-modal-close" aria-label="Close">✕</button>
        </div>
        ${charCardHTML(char)}`;
    document.getElementById('char-modal').classList.remove('hidden');
    document.getElementById('scrim').classList.remove('hidden');
    document.getElementById('btn-modal-close').addEventListener('click', closeCharModal);
}

function closeCharModal() {
    document.getElementById('char-modal').classList.add('hidden');
    if (!document.getElementById('teams-panel').classList.contains('open'))
        document.getElementById('scrim').classList.add('hidden');
}

document.getElementById('scrim').addEventListener('click', () => {
    closeCharModal();
    closeTeamsPanel();
});

// ── LOAD DATA ─────────────────────────────────────────────────────────────────
allChars = typeof CHARACTERS_DATA !== 'undefined' ? CHARACTERS_DATA : [];
if (!allChars.length) {
    console.warn('⚠ characters_data.js not loaded or CHARACTERS_DATA is empty');
} else {
    console.log(`Loaded ${allChars.length} characters.`);
}
