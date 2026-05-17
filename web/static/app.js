/**
 * JJK Fantasy Draft — Multiplayer Client
 * 
 * Based on the canonical Design System prototype (docs/app.js),
 * adapted for Flask-SocketIO multiplayer. The server is the source of truth;
 * this client renders the state it receives via 'game_update' events.
 */
const socket = io();

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
    'Masamichi Yaga': 'tokyo',
    'Takuma Ino': 'tokyo',
    'Arata Nitta': 'tokyo',
    'Utahime Iori': 'kyoto',
    'Yoshinobu Gakuganji': 'kyoto',
    'Momo Nishimiya': 'kyoto',
    'Kokichi Muta': 'other',
    'Ui Ui': 'other',
    'Miguel Oduol': 'other',
    'Master Tengen': 'other',
    'Haruta Shigemo': 'villain',
    'Jiro Awasaka': 'villain',
    'Larue': 'villain',
    'Mimiko Hasaba': 'villain',
    'Nanako Hasaba': 'villain',
    'Eso': 'curse',
    'Kechizu': 'curse',
    'Kurourushi': 'curse',
    'Yorozu': 'culling',
    'Ryu Ishigori': 'culling',
    'Reggie Star': 'culling',
    'Charles Bernard': 'culling',
    'Dhruv Lakdawalla': 'culling',
    'Hagane Daido': 'culling',
    'Rokujushi Miyo': 'culling',
    'Haba': 'culling',
    'Hanyu': 'culling',
};

const FACTION_LABEL = {
    tokyo: 'Tokyo', kyoto: 'Kyoto', other: 'Sorcerer',
    villain: 'Villain', curse: 'Curse', culling: 'Culling',
};

const MAX_TEAM = 5;

// ── STATE ─────────────────────────────────────────────────────────────────────
let myPlayerId = PLAYER_SESSION_ID; // Injected by Jinja template
let currentGameState = null;

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

function skillTypeClass(classes) {
    const c = (classes || '').toLowerCase();
    if (c.includes('physical'))  return 'type-physical';
    if (c.includes('bloodline')) return 'type-bloodline';
    if (c.includes('energy'))    return 'type-curse';
    if (c.includes('strategic')) return 'type-mental';
    return 'type-none';
}

function orbsHTML(energyArr) {
    return (energyArr || []).map(e => {
        const key = (e || 'none').toLowerCase();
        return `<div class="orb orb-${key}" title="${esc(e)}"></div>`;
    }).join('');
}

// ── CARD HTML (from canonical design system) ──────────────────────────────────
function charCardHTML(char) {
    if (!char) return '';
    const faction = FACTION[char.name] || 'other';
    const fLabel  = FACTION_LABEL[faction] || 'Sorcerer';
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

// ── WIN/LOSS HISTORY ──────────────────────────────────────────────────────────
const HISTORY_KEY = 'jjk_match_history';

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
}

function saveHistory(history) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20))); }
    catch {}
}

function recordResult(won, opponentName, myTeam) {
    const history = loadHistory();
    history.push({
        won,
        opponent: opponentName || '?',
        team: myTeam || [],
        date: new Date().toLocaleDateString(),
    });
    saveHistory(history);
    renderHistory();
}

function renderHistory() {
    const el = document.getElementById('history-block');
    if (!el) return;
    const history = loadHistory();
    if (!history.length) {
        el.innerHTML = '<div class="history-empty">No matches yet</div>';
        return;
    }
    const wins = history.filter(h => h.won).length;
    const losses = history.length - wins;
    const rows = history.slice().reverse().slice(0, 5).map(h => `
        <div class="history-row">
          <span class="history-result ${h.won ? 'win' : 'loss'}">${h.won ? 'W' : 'L'}</span>
          <span class="history-opp">${esc(h.opponent)}</span>
          <span class="history-date">${esc(h.date)}</span>
        </div>`).join('');
    el.innerHTML = `
        <div class="history-record">${wins}W — ${losses}L</div>
        <div class="history-rows">${rows}</div>`;
}

// ── SOCKET EVENTS ─────────────────────────────────────────────────────────────
socket.on('connect', () => {
    console.log('Connected to server.');
});

socket.on('message', (data) => {
    toast(data.text);
});

socket.on('game_update', (data) => {
    currentGameState = data;
    renderGame(data);
});

// ── SETUP SCREEN ──────────────────────────────────────────────────────────────
// Render history on load
renderHistory();

document.getElementById('btn-join').addEventListener('click', () => {
    const nameInput = document.getElementById('player-name').value.trim();
    const roomInput = document.getElementById('room-id').value.trim() || 'lobby';

    if (!nameInput) {
        toast("Enter your name, sorcerer.");
        document.getElementById('player-name').focus();
        return;
    }

    socket.emit('join_room', { room_id: roomInput, player_name: nameInput });
    showScreen('game-arena');
});

// ── DRAFT CONTROLS ────────────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', () => socket.emit('start_game'));
document.getElementById('btn-draw').addEventListener('click', () => socket.emit('draw_card'));
document.getElementById('btn-keep').addEventListener('click', () => socket.emit('keep_card'));
document.getElementById('btn-pass').addEventListener('click', () => socket.emit('pass_card'));

// Tap face-down card = draw
document.getElementById('face-down').addEventListener('click', () => {
    const btn = document.getElementById('btn-draw');
    if (!btn.classList.contains('hidden')) btn.click();
});

document.getElementById('btn-play-again').addEventListener('click', () => {
    socket.emit('reset_room');
});

// Reset room buttons (present on draft, team-selection, and battle headers)
document.querySelectorAll('.btn-reset-room').forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm('Reset this room and start over?')) {
            socket.emit('reset_room');
        }
    });
});

socket.on('room_reset', () => {
    selectedTeamChars = [];
    window.location.href = '/';
});

// ── RENDER ENGINE ─────────────────────────────────────────────────────────────
function renderGame(state) {
    const { state: status, players, current_player_id, current_player_name, last_drawn_character } = state;

    if (status === 'TEAM_SELECTION') {
        renderTeamSelection(players);
        showScreen('team-selection');
        return;
    }

    if (status === 'BATTLE') {
        showScreen('battle-arena');
        renderBattle(state);
        return;
    }

    if (status === 'FINISHED') {
        if (state.battle) {
            showBattleResults(state);
        } else {
            showResults(players);
        }
        return;
    }


    // Round badge
    const pickedTotal = players.reduce((s, p) => s + p.team.length, 0);
    const roundNum    = Math.min(Math.floor(pickedTotal / players.length) + 1, MAX_TEAM);
    document.getElementById('round-badge').textContent = `R${roundNum} / ${MAX_TEAM}`;

    // Turn bar
    document.getElementById('turn-avatar').textContent = (current_player_name || '?')[0].toUpperCase();
    document.getElementById('turn-name').textContent = current_player_name;

    // Pips
    document.getElementById('turn-pips').innerHTML = players.map(p =>
        Array.from({ length: MAX_TEAM }, (_, i) =>
            `<div class="pip${i < p.team.length ? ' done' : ''}"></div>`
        ).join('')
    ).join('');

    // Control states
    const isMyTurn = (current_player_id === myPlayerId);
    const drawState   = document.getElementById('draw-state');
    const decideState = document.getElementById('decide-state');
    const btnDraw = document.getElementById('btn-draw');
    const btnKeep = document.getElementById('btn-keep');
    const btnPass = document.getElementById('btn-pass');
    const btnStart = document.getElementById('btn-start');

    if (status === 'WAITING_FOR_PLAYERS') {
        drawState.classList.remove('hidden');
        decideState.classList.add('hidden');
        document.getElementById('game-state-text').textContent = 'Waiting for sorcerers…';
        btnDraw.classList.add('hidden');
        btnKeep.classList.add('hidden');
        btnPass.classList.add('hidden');
        // Show start button if at least 1 player; host can start solo for testing
        btnStart.classList.toggle('hidden', players.length < 1);
    } else if (status === 'IN_PROGRESS') {
        drawState.classList.remove('hidden');
        decideState.classList.add('hidden');
        btnStart.classList.add('hidden');
        btnKeep.classList.add('hidden');
        btnPass.classList.add('hidden');
        if (isMyTurn) {
            document.getElementById('game-state-text').textContent = 'Tap Draw to get a card';
            btnDraw.classList.remove('hidden');
        } else {
            document.getElementById('game-state-text').textContent = `Waiting for ${current_player_name}…`;
            btnDraw.classList.add('hidden');
        }
    } else if (status === 'DECIDING') {
        drawState.classList.add('hidden');
        decideState.classList.remove('hidden');
        document.getElementById('drawn-card-container').innerHTML = charCardHTML(last_drawn_character);
        btnStart.classList.add('hidden');
        btnDraw.classList.add('hidden');
        if (isMyTurn) {
            const me = players.find(p => p.id === myPlayerId);
            const hint = me.passes_used ? 'Keep or redraw (pass used)?' : 'Keep or pass once?';
            document.getElementById('game-state-text').textContent = hint;
            btnKeep.classList.remove('hidden');
            btnPass.classList.remove('hidden');
            btnPass.disabled = me.passes_used;
        } else {
            document.getElementById('game-state-text').textContent = `${current_player_name} is choosing…`;
            btnKeep.classList.add('hidden');
            btnPass.classList.add('hidden');
        }
    }

    // Teams panel (always update)
    renderTeamsPanel(players);
}

// ── TEAM SELECTION ────────────────────────────────────────────────────────────
let selectedTeamChars = [];

function renderTeamSelection(players) {
    // Try exact match first, fall back to first player if only one player (solo)
    let me = players.find(p => p.id === myPlayerId);
    if (!me && players.length === 1) me = players[0];

    const grid = document.getElementById('selection-grid');
    const btnLock = document.getElementById('btn-lock-team');
    const hint = document.getElementById('selection-hint');

    if (!me || !me.team || me.team.length === 0) {
        hint.textContent = "Loading your team...";
        grid.innerHTML = '<p style="text-align:center;color:var(--muted)">Waiting for server...</p>';
        btnLock.disabled = true;
        btnLock.style.opacity = '0.5';
        console.warn('renderTeamSelection: me not found. myPlayerId=', myPlayerId, 'players=', players.map(p=>p.id));
        return;
    }
    
    // Check if I already locked in
    if (me.active_team && me.active_team.length === 3) {
        hint.textContent = "Waiting for opponent...";
        grid.innerHTML = '';
        btnLock.style.display = 'none';
        return;
    }
    
    grid.innerHTML = me.team.map(c => {
        const isSelected = selectedTeamChars.includes(c.name);
        const faction = FACTION[c.name] || 'other';
        const hasImg  = c.image_url && !c.image_url.includes('placeholder');
        const artStyle = hasImg ? `background-image:url('${c.image_url}')` : '';

        return `
        <div class="sel-card ${isSelected ? 'sel-card--chosen' : ''}" data-name="${esc(c.name)}">
            <div class="sel-card-art" style="${artStyle}">
                ${isSelected ? '<div class="sel-checkmark">✓</div>' : ''}
            </div>
            <div class="sel-card-info">
                <div class="sel-card-name">${esc(c.name)}</div>
                <div class="sel-card-faction">${esc(FACTION_LABEL[faction] || '')}</div>
                <div class="sel-card-energy">${energyProfileHTML(c)}</div>
            </div>
        </div>`;
    }).join('');
    // Click handling is via event delegation on #selection-grid (attached once, below)

    // Synergy summary when 3 selected
    const synergyEl = document.getElementById('synergy-summary');
    if (synergyEl) {
        if (selectedTeamChars.length === 3) {
            const selected = me.team.filter(c => selectedTeamChars.includes(c.name));
            synergyEl.innerHTML = buildSynergySummary(selected);
            synergyEl.classList.remove('hidden');
        } else {
            synergyEl.classList.add('hidden');
        }
    }

    if (selectedTeamChars.length === 3) {
        btnLock.disabled = false;
        btnLock.style.opacity = '1';
    } else {
        btnLock.disabled = true;
        btnLock.style.opacity = '0.5';
    }
}

// Point 1: Draft Helper / Synergy Tags
function energyProfileHTML(char) {
    const costs = {};
    (char.skills || []).forEach(s => {
        (s.energy || []).forEach(e => {
            const key = (e || 'black').toLowerCase();
            costs[key] = (costs[key] || 0) + 1;
        });
    });
    const colorOrder = ['green', 'red', 'blue', 'white', 'black'];
    return colorOrder
        .filter(c => costs[c])
        .map(c => `<span class="orb orb-${c}" style="width:10px;height:10px;display:inline-block;margin:0 1px" title="${c}: ${costs[c]}"></span>`)
        .join('');
}

function buildSynergySummary(chars) {
    const totalCosts = { green: 0, red: 0, blue: 0, white: 0, black: 0 };
    chars.forEach(c => {
        (c.skills || []).forEach(s => {
            (s.energy || []).forEach(e => {
                const key = (e || 'black').toLowerCase();
                totalCosts[key] = (totalCosts[key] || 0) + 1;
            });
        });
    });

    const colorLabel = { green: 'Phys', red: 'Blood', blue: 'Curse', white: 'Strat', black: 'Gen' };
    const entries = Object.entries(totalCosts).filter(([, v]) => v > 0);
    
    const pills = entries.map(([k, v]) =>
        `<span class="synergy-pill"><span class="orb orb-${k}" style="width:10px;height:10px"></span> ${colorLabel[k]}: ${v}</span>`
    ).join('');

    // Check for heavy reliance on one color
    const maxEntry = entries.reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    const totalEnergy = entries.reduce((s, [, v]) => s + v, 0);
    let warning = '';
    if (maxEntry[1] / totalEnergy > 0.5) {
        warning = `<div class="synergy-warn">⚠️ Heavy ${colorLabel[maxEntry[0]]} reliance — consider diversifying</div>`;
    }

    return `<div class="synergy-bar">${pills}</div>${warning}`;
}

document.getElementById('btn-lock-team').addEventListener('click', () => {
    if (selectedTeamChars.length !== 3) return;
    socket.emit('submit_team', { selected_names: selectedTeamChars });
});


// ── RESULTS ───────────────────────────────────────────────────────────────────
function showResults(players) {
    const results = players.map(p => ({
        name: p.name,
        score: p.team.reduce((s, c) =>
            s + (c.skills || []).reduce((ss, sk) => ss + (sk.energy || []).length, 0), 0),
        team: p.team,
    })).sort((a, b) => b.score - a.score || Math.random() - 0.5);

    const medals = ['🥇', '🥈', '🥉', '4️⃣'];

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

    showScreen('results');
}

function showBattleResults(state) {
    const b = state.battle;
    if (!b) { showResults(state.players); return; }

    const medals = ['🥇', '🥈', '🥉', '4️⃣'];
    const sorted = [...b.players].sort((a, b) => {
        const aLiving = a.char_states.filter(cs => cs.alive).length;
        const bLiving = b.char_states.filter(cs => cs.alive).length;
        const aHp = a.char_states.reduce((s, cs) => s + cs.current_hp, 0);
        const bHp = b.char_states.reduce((s, cs) => s + cs.current_hp, 0);
        return (bLiving - aLiving) || (bHp - aHp);
    });

    const winnerName = sorted[0] ? sorted[0].name : '—';
    document.getElementById('winner-name').textContent = winnerName;
    document.getElementById('standings').innerHTML = sorted.map((p, i) => {
        const living = p.char_states.filter(cs => cs.alive).length;
        const totalHp = p.char_states.reduce((s, cs) => s + cs.current_hp, 0);
        const teamStr = p.char_data ? p.char_data.map(c => esc(c.name)).join(' · ') : '—';
        return `
        <div class="standing-row">
            <div class="stand-rank">${medals[i] || '·'}</div>
            <div class="stand-info">
                <div class="stand-name">${esc(p.name)}</div>
                <div class="stand-pts">${living} alive · ${totalHp} HP remaining</div>
                <div class="stand-team">${teamStr}</div>
            </div>
        </div>`;
    }).join('');

    // Record win/loss for history
    const myPlayer = b.players.find(p => p.id === myPlayerId);
    const iWon = b.winner_id === myPlayerId;
    const opp = b.players.find(p => p.id !== myPlayerId);
    const myTeamNames = myPlayer && myPlayer.char_data ? myPlayer.char_data.map(c => c.name) : [];
    recordResult(iWon, opp ? opp.name : '—', myTeamNames);

    showScreen('results');
}

// ── TEAMS PANEL ───────────────────────────────────────────────────────────────
document.getElementById('btn-teams-open').addEventListener('click', () => {
    if (!currentGameState) return;
    const turnIdx = currentGameState.players.findIndex(p => p.id === currentGameState.current_player_id);
    renderTeamsPanelContent(turnIdx >= 0 ? turnIdx : 0);
    document.getElementById('teams-panel').classList.add('open');
    document.getElementById('scrim').classList.remove('hidden');
});

document.getElementById('btn-teams-close').addEventListener('click', closePanels);
document.getElementById('scrim').addEventListener('click', closePanels);

// ── EVENT DELEGATION (replaces per-render addEventListener calls) ──────────────

// Teams panel: tab clicks
document.getElementById('panel-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.p-tab');
    if (btn) renderTeamsPanelContent(parseInt(btn.dataset.i, 10));
});

// Teams panel: mini-card clicks (opens char modal)
document.getElementById('players-area').addEventListener('click', e => {
    const card = e.target.closest('.mini-card');
    if (card) openCharModal(card.dataset.name);
});

// Team selection: sel-card toggle (delegated so re-renders don't stack listeners)
document.getElementById('selection-grid').addEventListener('click', e => {
    const thumb = e.target.closest('.sel-card');
    if (!thumb) return;
    const name = thumb.dataset.name;
    if (selectedTeamChars.includes(name)) {
        selectedTeamChars = selectedTeamChars.filter(n => n !== name);
    } else if (selectedTeamChars.length < 3) {
        selectedTeamChars.push(name);
    }
    // Re-render only the selection grid (avoid full re-render loop)
    if (currentGameState) renderTeamSelection(currentGameState.players);
});

function closePanels() {
    document.getElementById('teams-panel').classList.remove('open');
    document.getElementById('char-modal').classList.add('hidden');
    document.getElementById('scrim').classList.add('hidden');
}

function renderTeamsPanel(players) {
    // Find active tab or default to current turn player
    let activeIdx = 0;
    const currentTab = document.querySelector('.p-tab.active');
    if (currentTab) {
        activeIdx = parseInt(currentTab.dataset.i, 10);
    } else {
        const turnIdx = players.findIndex(p => p.id === currentGameState.current_player_id);
        activeIdx = turnIdx >= 0 ? turnIdx : 0;
    }
    renderTeamsPanelContent(activeIdx);
}

function renderTeamsPanelContent(activeIdx) {
    const players = currentGameState.players;
    if (!players || !players.length) return;

    document.getElementById('panel-tabs').innerHTML = players.map((p, i) => `
        <button class="p-tab${i === activeIdx ? ' active' : ''}" data-i="${i}">${esc(p.name)}</button>
    `).join('');

    const p = players[activeIdx];

    // Build team slots — during battle, use char_data from battle.players if available
    let teamChars = p.team || [];
    if (!teamChars.length && currentGameState.battle) {
        const bp = currentGameState.battle.players.find(bp2 => bp2.id === p.id);
        if (bp) teamChars = bp.char_data || [];
    }

    const slots = Array.from({ length: MAX_TEAM }, (_, i) =>
        teamChars[i] ? miniCardHTML(teamChars[i]) : `<div class="mini-empty"><div class="mini-empty-plus">+</div>Slot ${i + 1}</div>`
    ).join('');

    document.getElementById('players-area').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span style="font-family:'Cinzel',serif;font-weight:800;font-size:14px">${esc(p.name)}</span>
            <span style="font-size:11px;color:${p.passes_used ? 'var(--red)' : 'var(--green)'}">${p.passes_used ? '⚡ Pass used' : '✓ Pass available'}</span>
        </div>
        <div class="mini-grid">${slots}</div>`;
    // Note: .p-tab and .mini-card click handlers are attached via event delegation below
}

// ── BATTLE SYSTEM ─────────────────────────────────────────────────────────────

// Battle interaction state
let battleSt = {
    selectedCharSlot: null,
    selectedSkillName: null,
    selectedSkillData: null,
    awaitingTarget: false,
    targetTeam: null,  // 'enemy' | 'ally'
};

function canAffordEnergy(pool, cost) {
    if (!pool || !Array.isArray(cost)) return false;
    if (cost.length === 0) return true;   // free skill
    const temp = { ...pool };
    for (const c of cost) {
        if ((temp[c] || 0) <= 0) return false;
        temp[c]--;
    }
    return true;
}

function renderEnergyPool(energy) {
    if (!energy) return '';
    const colors = [
        { key: 'green',  label: 'Phys',   icon: '🟢' },
        { key: 'red',    label: 'Blood',  icon: '🔴' },
        { key: 'blue',   label: 'Curse',  icon: '🔵' },
        { key: 'white',  label: 'Strat',  icon: '⚪' },
        { key: 'black',  label: 'Gen',    icon: '⚫' },
    ];
    return colors.map(({ key, label }) => {
        const count = energy[key] || 0;
        return `
        <div class="energy-chip energy-chip--${key}${count === 0 ? ' energy-chip--empty' : ''}">
          <div class="energy-chip-orb orb orb-${key}"></div>
          <div class="energy-chip-count">${count}</div>
          <div class="energy-chip-label">${label}</div>
        </div>`;
    }).join('');
}

function statusBadgesHTML(cs) {
    let badges = '';
    if (cs.stun_turns > 0)
        badges += `<span class="status-badge stun">STUN ${cs.stun_turns}</span>`;
    if (cs.invuln_turns > 0)
        badges += `<span class="status-badge invuln">INVULN ${cs.invuln_turns}</span>`;
    if (cs.dot_turns > 0)
        badges += `<span class="status-badge dot">DOT ${cs.dot_damage}x${cs.dot_turns}</span>`;
    if (cs.damage_reduction > 0)
        badges += `<span class="status-badge dr">DR ${cs.damage_reduction}</span>`;
    if (cs.destructible_defense > 0)
        badges += `<span class="status-badge dd">SHIELD ${cs.destructible_defense}</span>`;
    if (cs.increase_damage > 0)
        badges += `<span class="status-badge buff">+DMG ${cs.increase_damage}</span>`;
    if (cs.decrease_damage > 0)
        badges += `<span class="status-badge debuff">-DMG ${cs.decrease_damage}</span>`;
    return badges ? `<div class="status-badges">${badges}</div>` : '';
}

function cooldownBadgesHTML(charState) {
    const cds = charState.cooldowns || {};
    const active = Object.entries(cds).filter(([, v]) => v > 0);
    if (!active.length) return '';
    const badges = active.map(([, turns]) =>
        `<span class="cd-badge">CD${turns}</span>`
    ).join('');
    return `<div class="cd-badges">${badges}</div>`;
}

function battleCharCardHTML(charData, charState, slot, isMyTeam, isMyTurn, isSolo, opponentEnergy) {
    const pct = Math.max(0, (charState.current_hp / charState.max_hp) * 100);
    const hpColor = pct > 50 ? 'var(--green)' : pct > 25 ? 'var(--gold)' : 'var(--red)';
    const faction = FACTION[charData.name] || 'other';
    const dead = !charState.alive;
    const firstName = charData.name.split(' ')[0];
    const isBench = slot >= 3;

    const isSelected = (isMyTeam && battleSt.selectedCharSlot === slot);
    // In solo, the top row (isMyTeam=false) acts as enemy targets
    const isTargetable = (
        !dead &&
        battleSt.awaitingTarget &&
        (
            (battleSt.targetTeam === 'enemy' && !isMyTeam) ||
            (battleSt.targetTeam === 'ally' && isMyTeam)
        )
    );

    // Point 4: Intent Telegraphing — glow on enemy chars that can use a damaging skill
    let hasIntent = false;
    if (!isMyTeam && !dead && charState.stun_turns === 0 && opponentEnergy) {
        hasIntent = (charData.skills || []).some(s =>
            (s.damage > 0 || s.stun_turns > 0) && canAffordEnergy(opponentEnergy, s.energy)
        );
    }

    let cardClass = `battle-char faction-${faction}`;
    if (dead) cardClass += ' battle-char--dead';
    if (isSelected) cardClass += ' battle-char--selected';
    if (isTargetable) cardClass += ' targetable';
    if (hasIntent) cardClass += ' intent-danger';
    if (isBench) cardClass += ' bench-char';

    const clickable = !dead && isMyTeam && isMyTurn && !battleSt.awaitingTarget && !isBench;
    const asTarget  = isTargetable && !isBench;

    let dataAttrs = `data-slot="${slot}" data-team="${isMyTeam ? 'mine' : 'opponent'}"`;
    if (clickable)  dataAttrs += ` data-action="select-char"`;
    if (asTarget)   dataAttrs += ` data-action="select-target"`;
    if (isBench && isMyTeam && !dead && isMyTurn) dataAttrs += ` data-action="swap-bench"`;

    return `
    <div class="${cardClass}" ${dataAttrs}>
      <div class="bchar-art" style="background-image:url('${charData.image_url}')">
        ${dead ? '<div class="death-overlay">✕</div>' : ''}
        <div class="bchar-name">${esc(firstName)}</div>
        ${!dead ? cooldownBadgesHTML(charState) : ''}
      </div>
      <div class="hp-bar-wrap">
        <div class="hp-bar" style="width:${pct.toFixed(1)}%;background:${hpColor}"></div>
      </div>
      <div class="hp-text">${charState.current_hp}/${charState.max_hp}</div>
      ${statusBadgesHTML(charState)}
    </div>`;
}

function renderSkillPanel(charData, charState, myEnergy) {
    document.getElementById('skill-panel-char-name').textContent = charData.name;
    const list = document.getElementById('skill-list-battle');

    list.innerHTML = charData.skills.map(skill => {
        const cdRemaining = charState.cooldowns[skill.name] || 0;
        const onCd = cdRemaining > 0;
        const canAfford = canAffordEnergy(myEnergy, skill.energy);
        const isStunned = charState.stun_turns > 0;
        const disabled = onCd || !canAfford || isStunned;
        const typeClass = skillTypeClass(skill.classes);

        let disabledReason = '';
        if (isStunned) disabledReason = 'STUNNED';
        else if (onCd)  disabledReason = `CD: ${cdRemaining}`;
        else if (!canAfford) disabledReason = 'NO ENERGY';

        // Target type label
        const tgtLabel = skill.is_aoe ? 'ALL ENEMIES' :
            skill.target_type === 'self' ? 'SELF' :
            skill.target_type === 'ally' ? 'ALLY' : 'ENEMY';

        return `
        <div class="battle-skill ${disabled ? 'disabled' : ''} ${typeClass}"
             data-skill="${esc(skill.name)}"
             ${!disabled ? 'data-action="select-skill"' : ''}>
          <div class="skill-top">
            <span class="skill-name">${esc(skill.name)}</span>
            <div class="orbs">${orbsHTML(skill.energy)}</div>
          </div>
          <div class="skill-desc">${esc(skill.description)}</div>
          <div class="skill-meta">
            <span class="skill-tgt-badge">${tgtLabel}</span>
            ${disabled
                ? `<span class="cost-warn">${disabledReason}</span>`
                : `<span style="color:var(--green);font-size:10px;font-weight:700">READY</span>`}
          </div>
        </div>`;
    }).join('');

    document.getElementById('skill-panel').classList.remove('hidden');

    // Cancel button
    document.getElementById('btn-skill-cancel').onclick = resetBattleUI;

    // Skill click listeners
    list.querySelectorAll('[data-action="select-skill"]').forEach(el => {
        el.addEventListener('click', () => {
            const skillName = el.dataset.skill;
            const skill = charData.skills.find(s => s.name === skillName);
            if (!skill) return;
            battleSt.selectedSkillName = skillName;
            battleSt.selectedSkillData = skill;

            if (skill.target_type === 'self' || (skill.damage === 0 && !skill.is_aoe && skill.target_type !== 'ally')) {
                // Auto-target self
                submitBattleAction(battleSt.selectedCharSlot, skillName, myPlayerId, battleSt.selectedCharSlot);
            } else if (skill.is_aoe) {
                // Auto-target opponent (slot 0 is fine; server handles AoE expansion)
                // In solo, the server treats the player themselves as the target
                const oppData = currentGameState.battle.players.find(p => p.id !== myPlayerId);
                const targetId = oppData ? oppData.id : myPlayerId;
                submitBattleAction(battleSt.selectedCharSlot, skillName, targetId, 0);
            } else if (skill.target_type === 'ally') {
                battleSt.awaitingTarget = true;
                battleSt.targetTeam = 'ally';
                document.getElementById('target-prompt').textContent = 'Select an ally to target';
                document.getElementById('target-prompt').classList.remove('hidden');
                document.getElementById('skill-panel').classList.add('hidden');
                renderBattle(currentGameState);
            } else {
                // Enemy target
                battleSt.awaitingTarget = true;
                battleSt.targetTeam = 'enemy';
                document.getElementById('target-prompt').textContent = 'Select an enemy to target';
                document.getElementById('target-prompt').classList.remove('hidden');
                document.getElementById('skill-panel').classList.add('hidden');
                renderBattle(currentGameState);
            }
        });
    });
}

function resetBattleUI() {
    battleSt = { selectedCharSlot: null, selectedSkillName: null,
                 selectedSkillData: null, awaitingTarget: false, targetTeam: null };
    document.getElementById('skill-panel').classList.add('hidden');
    document.getElementById('target-prompt').classList.add('hidden');
    document.querySelectorAll('.battle-char.targetable').forEach(el => el.classList.remove('targetable'));
}

function submitBattleAction(charSlot, skillName, targetPlayerId, targetSlot) {
    socket.emit('battle_action', {
        char_slot: charSlot,
        skill_name: skillName,
        target_player_id: targetPlayerId,
        target_slot: targetSlot,
    });
    resetBattleUI();
}

function attachBattleClickHandlers(isMyTurn, myData, oppData, isSolo) {
    // My chars (bottom row) — click to select and show skill panel
    document.querySelectorAll('[data-action="select-char"]').forEach(el => {
        el.addEventListener('click', () => {
            if (!isMyTurn) return;
            const slot = parseInt(el.dataset.slot);
            if (myData.char_states[slot].stun_turns > 0) {
                toast(`${myData.char_states[slot].char_name} is stunned!`);
                return;
            }
            battleSt.selectedCharSlot = slot;
            battleSt.awaitingTarget = false;
            battleSt.selectedSkillName = null;
            document.getElementById('target-prompt').classList.add('hidden');
            renderSkillPanel(myData.char_data[slot], myData.char_states[slot], myData.energy);
        });
    });

    // Target selection clicks (opponent chars or ally chars when awaiting)
    document.querySelectorAll('[data-action="select-target"]').forEach(el => {
        el.addEventListener('click', () => {
            if (!battleSt.awaitingTarget) return;
            const slot = parseInt(el.dataset.slot);
            const team = el.dataset.team;
            let targetPlayerId;
            if (team === 'opponent') {
                // In solo, the "opponent" row is still the same player (server handles self-targeting)
                targetPlayerId = oppData ? oppData.id : myData.id;
            } else {
                targetPlayerId = myData.id;
            }
            if (!targetPlayerId) return;
            submitBattleAction(
                battleSt.selectedCharSlot,
                battleSt.selectedSkillName,
                targetPlayerId,
                slot
            );
        });
    });

    // Bench swap clicks — tag in a bench character
    document.querySelectorAll('[data-action="swap-bench"]').forEach(el => {
        el.addEventListener('click', () => {
            if (!isMyTurn) return;
            const benchSlot = parseInt(el.dataset.slot);
            // Find first dead active slot, or let player choose
            let activeSlot = null;
            for (let i = 0; i < 3; i++) {
                if (!myData.char_states[i].alive) {
                    activeSlot = i;
                    break;
                }
            }
            // If no dead slot, swap with slot 0 (costs turn anyway)
            if (activeSlot === null) activeSlot = 0;
            
            socket.emit('swap_in', { active_slot: activeSlot, bench_slot: benchSlot });
        });
    });
}

function renderBattle(state) {
    if (!state || !state.battle) return;
    const b = state.battle;
    const isMyTurn = (b.current_player_id === myPlayerId);

    // Turn bar
    document.getElementById('battle-turn-badge').textContent = `Turn ${b.turn_number}`;
    document.getElementById('battle-turn-avatar').textContent =
        (b.current_player_name || '?')[0].toUpperCase();
    document.getElementById('battle-turn-name').textContent = b.current_player_name;
    document.getElementById('battle-turn-hint').textContent = isMyTurn
        ? 'Your turn — select a character'
        : `Waiting for ${b.current_player_name}…`;

    const myData  = b.players.find(p => p.id === myPlayerId);
    // Solo mode: only one player exists — use them as both sides
    const oppData = b.players.find(p => p.id !== myPlayerId) || myData;
    const isSolo  = b.players.length === 1;

    // My energy pool
    document.getElementById('my-energy-pool').innerHTML =
        myData ? renderEnergyPool(myData.energy) : '';

    // Render opponent team (top) — in solo, same player shown as enemy
    if (oppData) {
        document.getElementById('chars-opponent').innerHTML =
            oppData.char_data.map((cd, i) =>
                battleCharCardHTML(cd, oppData.char_states[i], i, false, isMyTurn, isSolo, oppData.energy)
            ).join('');
    }

    // Render my team (bottom)
    if (myData) {
        document.getElementById('chars-mine').innerHTML =
            myData.char_data.map((cd, i) =>
                battleCharCardHTML(cd, myData.char_states[i], i, true, isMyTurn, isSolo, null)
            ).join('');
    }

    // Action log — color-coded by message type
    const logEl = document.getElementById('battle-log');
    logEl.innerHTML = (b.action_log || []).slice().reverse().slice(0, 8).map((msg, i) => {
        let cls = 'log-entry';
        const m = msg.toLowerCase();
        if (m.includes('defeated'))               cls += ' log-defeat';
        else if (m.includes('damage'))            cls += ' log-damage';
        else if (m.includes('restored') || m.includes('healed')) cls += ' log-heal';
        else if (m.includes('stunned') || m.includes('invulnerable') || m.includes('cursed') || m.includes('reduction')) cls += ' log-status';
        if (i === 0)                              cls += ' log-latest';
        return `<div class="${cls}">${esc(msg)}</div>`;
    }).join('');

    // Attach interaction handlers
    attachBattleClickHandlers(isMyTurn, myData, oppData, isSolo);

    // During target-select: dim all non-targetable cards
    if (battleSt.awaitingTarget) {
        document.querySelectorAll('.battle-char:not(.battle-char--dead)').forEach(el => {
            if (!el.classList.contains('targetable')) {
                el.classList.add('battle-char--dimmed');
            }
        });
    } else {
        document.querySelectorAll('.battle-char--dimmed').forEach(el => {
            el.classList.remove('battle-char--dimmed');
        });
    }

    // Check winner
    if (b.winner_id) {
        const winnerPlayer = b.players.find(p => p.id === b.winner_id);
        const winnerName = winnerPlayer ? winnerPlayer.name : '?';
        toast(`${winnerName} wins the battle!`);
        setTimeout(() => showBattleBreakdown(state), 1200);
    }
}

function showBattleBreakdown(state) {
    const b = state.battle;
    if (!b) { showBattleResults(state); return; }

    const teamsHTML = b.players.map(p => {
        const charsHTML = p.char_states.map((cs, i) => {
            const charName = (p.char_data[i] && p.char_data[i].name) || cs.char_name;
            const hpClass = cs.alive ? 'alive' : 'dead';
            const hpLabel = cs.alive ? `${cs.current_hp} HP` : 'DEFEATED';
            return `
            <div class="breakdown-char-row">
              <span class="breakdown-char-name">${esc(charName)}</span>
              <span class="breakdown-char-hp ${hpClass}">${hpLabel}</span>
            </div>`;
        }).join('');
        const isWinner = p.id === b.winner_id;
        const nameLabel = isWinner ? `${esc(p.name)} 🏆` : esc(p.name);
        return `
        <div class="breakdown-team">
          <div class="breakdown-team-name">${nameLabel}</div>
          ${charsHTML}
        </div>`;
    }).join('');

    document.getElementById('breakdown-sheet').innerHTML = `
      <div class="breakdown-title">Battle Complete</div>
      <div class="breakdown-teams">${teamsHTML}</div>
      <div class="breakdown-tap-hint">TAP ANYWHERE TO CONTINUE</div>`;

    const overlay = document.getElementById('breakdown-overlay');
    overlay.classList.remove('hidden');

    let _autoTimer = setTimeout(() => {
        overlay.classList.add('hidden');
        showBattleResults(state);
    }, 5000);

    overlay.onclick = () => {
        clearTimeout(_autoTimer);
        overlay.classList.add('hidden');
        showBattleResults(state);
    };
}

// ── CHAR MODAL ────────────────────────────────────────────────────────────────
function openCharModal(name) {
    let char = null;
    if (currentGameState) {
        // Draft phase: chars are in p.team
        currentGameState.players.forEach(p => {
            const found = (p.team || []).find(c => c.name === name);
            if (found) char = found;
        });
        // Battle phase: chars are in battle.players[i].char_data
        if (!char && currentGameState.battle) {
            currentGameState.battle.players.forEach(p => {
                const found = (p.char_data || []).find(c => c.name === name);
                if (found) char = found;
            });
        }
        if (!char && currentGameState.last_drawn_character && currentGameState.last_drawn_character.name === name) {
            char = currentGameState.last_drawn_character;
        }
    }
    if (!char) return;

    document.getElementById('char-modal-sheet').innerHTML = `
        <div style="display:flex;justify-content:flex-end;padding:12px 14px 0">
            <button class="icon-btn" id="btn-modal-close" aria-label="Close">✕</button>
        </div>
        ${charCardHTML(char)}`;
    document.getElementById('char-modal').classList.remove('hidden');
    document.getElementById('scrim').classList.remove('hidden');
    document.getElementById('btn-modal-close').addEventListener('click', () => {
        document.getElementById('char-modal').classList.add('hidden');
        if (!document.getElementById('teams-panel').classList.contains('open'))
            document.getElementById('scrim').classList.add('hidden');
    });
}
