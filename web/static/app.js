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
    'Masamichi Yaga': 'tokyo', 'Takuma Ino': 'tokyo', 'Arata Nitta': 'tokyo',
    'Utahime Iori': 'kyoto', 'Yoshinobu Gakuganji': 'kyoto', 'Momo Nishimiya': 'kyoto',
};

const MAX_TEAM = 5;

// DOM Elements
const setupSection = document.getElementById('setup');
const arenaSection = document.getElementById('game-arena');
const draftContainer = document.getElementById('draft-container');
const battleContainer = document.getElementById('battle-container');
const resultsSection = document.getElementById('results');
const gameStateText = document.getElementById('game-state-text');
const btnStart = document.getElementById('btn-start');
const btnDraw = document.getElementById('btn-draw');
const btnKeep = document.getElementById('btn-keep');
const btnPass = document.getElementById('btn-pass');
const actionArea = document.getElementById('draw-state');
const decideArea = document.getElementById('decide-state');
const drawnCardContainer = document.getElementById('drawn-card-container');
const playersArea = document.getElementById('players-area');
const roundBadge = document.getElementById('round-badge');
const turnAvatar = document.getElementById('turn-avatar');
const turnName = document.getElementById('turn-name');

// State
let myPlayerId = PLAYER_SESSION_ID;
let currentGameState = null;
let selectedAction = null; 
let myQueuedActions = []; 

// Socket Events
socket.on('connect', () => console.log("Cursed connection established."));
socket.on('message', (data) => toast(data.text));
socket.on('game_update', (data) => {
    currentGameState = data;
    renderGame(data);
});

// UI Event Listeners
document.getElementById('btn-join').addEventListener('click', () => {
    const nameEl = document.getElementById('player-name');
    const roomEl = document.getElementById('room-id');
    const name = nameEl.value.trim();
    const room = roomEl.value.trim() || 'lobby';

    console.log(`Attempting to join room: ${room} as ${name}`);

    if (name) {
        myPlayerName = name; // Store name
        socket.emit('join_room', { room_id: room, player_name: name });
        showScreen('game-arena');
        toast(`Entering Arena: ${room}`);
    } else {
        toast("You must enter a name to join the battle.");
        nameEl.focus();
    }
});

btnStart.addEventListener('click', () => socket.emit('start_game'));
btnDraw.addEventListener('click', () => socket.emit('draw_card'));
btnKeep.addEventListener('click', () => socket.emit('keep_card'));
btnPass.addEventListener('click', () => socket.emit('pass_card'));
document.getElementById('btn-play-again').addEventListener('click', () => location.reload());

document.getElementById('face-down').addEventListener('click', () => {
    if (btnDraw.style.display !== 'none') btnDraw.click();
});

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── RENDER ENGINE ─────────────────────────────────────────────────────────────
function renderGame(state) {
    const { state: status, players, current_player_id, current_player_name, last_drawn_character, battle_log } = state;
    const me = players.find(p => p.id === myPlayerId);

    if (status === 'FINISHED') {
        showScreen('results');
        document.getElementById('winner-name').textContent = state.winner || "Battle Over";
        return;
    }

    if (status !== 'BATTLE') {
        draftContainer.classList.remove('hidden');
        battleContainer.classList.add('hidden');
        renderDraftUI(status, me, current_player_id, current_player_name, last_drawn_character);
        renderTeamsPanel(players);
    } else {
        draftContainer.classList.add('hidden');
        battleContainer.classList.remove('hidden');
        renderBattleUI(players, me, battle_log);
    }
}

function renderDraftUI(status, me, currId, currName, lastChar) {
    roundBadge.textContent = "Draft Phase";
    turnName.textContent = currName;
    turnAvatar.textContent = currName[0].toUpperCase();
    gameStateText.textContent = (status === 'DECIDING') ? "Choosing..." : "Drafting...";

    const isMyTurn = (currId === myPlayerId);
    btnStart.style.display = (status === 'WAITING_FOR_PLAYERS' && currentGameState.players.length >= 2) ? 'flex' : 'none';
    btnDraw.style.display = (status === 'IN_PROGRESS' && isMyTurn) ? 'flex' : 'none';
    btnKeep.style.display = (status === 'DECIDING' && isMyTurn) ? 'flex' : 'none';
    btnPass.style.display = (status === 'DECIDING' && isMyTurn && !me.passes_used) ? 'flex' : 'none';
    
    actionArea.classList.toggle('hidden', status === 'DECIDING');
    decideArea.classList.toggle('hidden', status !== 'DECIDING');
    
    if (status === 'DECIDING') {
        drawnCardContainer.innerHTML = charCardHTML(lastChar);
        // Add click-to-keep listener
        drawnCardContainer.querySelector('.char-card').addEventListener('click', () => {
            if (isMyTurn) btnKeep.click();
        });
    }
}

function renderBattleUI(players, me, log) {
    const opponent = players.find(p => p.id !== myPlayerId);
    if (!me || !opponent) return;

    roundBadge.textContent = `Turn ${currentGameState.turn_count}`;
    gameStateText.textContent = me.has_submitted ? "Waiting for Opponent..." : "Queue your actions";

    battleContainer.innerHTML = `
        <div class="battle-arena">
            <div class="enemy-team">
                ${opponent.team.map((c, i) => battleCharHTML(c, i, 'enemy')).join('')}
            </div>
            
            <div class="battle-info">
                <div class="battle-log">${log.map(l => `<div class="log-entry">${esc(l)}</div>`).join('')}</div>
                <div class="my-energy">
                    ${Object.entries(me.energy).map(([color, val]) => `<div class="energy-orb orb-${color}">${val}</div>`).join('')}
                </div>
            </div>

            <div class="my-team">
                ${me.team.map((c, i) => battleCharHTML(c, i, 'self')).join('')}
            </div>

            <div class="battle-actions">
                <button class="btn-primary" id="btn-lock-in" ${me.has_submitted ? 'disabled' : ''}>
                    ${me.has_submitted ? 'Waiting...' : 'Lock In Actions'}
                </button>
            </div>
        </div>
    `;

    attachBattleListeners(me, opponent);
}

function charCardHTML(char) {
    if (!char) return '';
    const imgStyle = `background-image: url('${char.image_url}'), url('https://placehold.co/400x600/161630/9499c3?text=${char.name.replace(/ /g, '+')}')`;
    return `
    <div class="char-card">
        <div class="char-art" style="${imgStyle}"></div>
        <div class="char-body">
            <div class="char-name">${esc(char.name)}</div>
            <p class="char-desc">${esc(char.description)}</p>
        </div>
    </div>`;
}

function battleCharHTML(char, idx, type) {
    const isDead = char.hp <= 0;
    const healthPercent = (char.hp / char.max_hp) * 100;
    const imgStyle = `background-image: url('${char.image_url}'), url('https://placehold.co/200x200/161630/9499c3?text=${char.name[0]}')`;
    return `
        <div class="combatant ${type} ${isDead ? 'dead' : ''}" data-idx="${idx}" data-type="${type}">
            <div class="combatant-art" style="${imgStyle}"></div>
            <div class="combatant-hp">
                <div class="hp-bar" style="width:${healthPercent}%"></div>
                <span class="hp-text">${char.hp} / ${char.max_hp}</span>
            </div>
            <div class="combatant-name">${esc(char.name)}</div>
            ${type === 'self' ? `
                <div class="combatant-skills">
                    ${char.skills.map((s, si) => `
                        <button class="skill-tiny ${selectedAction?.charIdx === idx && selectedAction?.skillIdx === si ? 'selected' : ''}" 
                                data-char="${idx}" data-skill="${si}" title="${esc(s.description)}">
                            ${esc(s.name)}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function attachBattleListeners(me, opponent) {
    document.querySelectorAll('.skill-tiny').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedAction = { charIdx: parseInt(btn.dataset.char), skillIdx: parseInt(btn.dataset.skill) };
            toast(`Select target for ${me.team[selectedAction.charIdx].skills[selectedAction.skillIdx].name}`);
            renderBattleUI(currentGameState.players, me, currentGameState.battle_log);
        });
    });

    document.querySelectorAll('.combatant.enemy').forEach(el => {
        el.addEventListener('click', () => {
            if (!selectedAction) return;
            myQueuedActions.push({ char_idx: selectedAction.charIdx, skill_idx: selectedAction.skillIdx, target_idx: parseInt(el.dataset.idx) });
            toast("Action queued.");
            selectedAction = null;
            renderBattleUI(currentGameState.players, me, currentGameState.battle_log);
        });
    });

    const lockBtn = document.getElementById('btn-lock-in');
    if (lockBtn) lockBtn.addEventListener('click', () => {
        socket.emit('submit_actions', myQueuedActions);
        myQueuedActions = [];
        toast("Actions locked.");
    });
}

function renderTeamsPanel(players) {
    playersArea.innerHTML = players.map(p => `
        <div class="player-team">
            <h3 style="font-size:12px; margin-bottom:8px">${esc(p.name)}</h3>
            <div class="team-grid" style="display:flex; gap:4px">
                ${p.team.map(c => `<div class="team-dot" style="width:8px; height:8px; border-radius:50%; background:var(--purple-hi)" title="${esc(c.name)}"></div>`).join('')}
            </div>
        </div>
    `).join('');
}
