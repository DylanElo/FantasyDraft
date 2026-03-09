const socket = io();

// DOM Elements
const lobbySection = document.getElementById('lobby');
const arenaSection = document.getElementById('game-arena');
const connStatus = document.getElementById('connection-status');
const roomIdSpan = document.getElementById('current-room');
const gameStateText = document.getElementById('game-state-text');
const btnStart = document.getElementById('btn-start');
const btnDraw = document.getElementById('btn-draw');
const btnKeep = document.getElementById('btn-keep');
const btnPass = document.getElementById('btn-pass');
const actionArea = document.getElementById('action-area');
const drawnCardContainer = document.getElementById('drawn-card-container');
const playersArea = document.getElementById('players-area');
const messagesLog = document.getElementById('messages');
const gameOverModal = document.getElementById('game-over-modal');
const resultsText = document.getElementById('results-text');

// State
let myPlayerName = '';
let myPlayerId = '';
let currentGameState = null;

// Socket Events
socket.on('connect', () => {
    connStatus.textContent = 'Connected';
    connStatus.classList.add('connected');
});

socket.on('disconnect', () => {
    connStatus.textContent = 'Disconnected';
    connStatus.classList.remove('connected');
});

socket.on('message', (data) => {
    addLog(data.text);
});

socket.on('game_update', (data) => {
    currentGameState = data;
    renderGame(data);
});

socket.on('game_over', (data) => {
    resultsText.innerHTML = data.text.replace(/\n/g, '<br>');
    gameOverModal.style.display = 'flex';
});

// UI Event Listeners
document.getElementById('btn-join').addEventListener('click', () => {
    const nameInput = document.getElementById('player-name').value.trim();
    const roomInput = document.getElementById('room-id').value.trim() || 'lobby';

    if (nameInput) {
        myPlayerName = nameInput;
        // Hash player ID using simple string hash to match backend session int logic purely for UI checks
        myPlayerId = hashCode(PLAYER_SESSION_ID);

        socket.emit('join_room', { room_id: roomInput, player_name: nameInput });

        roomIdSpan.textContent = roomInput;
        lobbySection.classList.remove('active');
        arenaSection.classList.add('active');
    } else {
        alert("Please enter a name.");
    }
});

btnStart.addEventListener('click', () => socket.emit('start_game'));
btnDraw.addEventListener('click', () => socket.emit('draw_card'));
btnKeep.addEventListener('click', () => socket.emit('keep_card'));
btnPass.addEventListener('click', () => socket.emit('pass_card'));

document.getElementById('btn-play-again').addEventListener('click', () => {
    gameOverModal.style.display = 'none';
    location.reload();
});

// Helper Functions
function addLog(msg) {
    const el = document.createElement('div');
    el.className = 'log-entry';
    el.textContent = msg;
    messagesLog.prepend(el);
}

// Adler-32 hash to match Python's zlib.adler32 (unsigned)
function hashCode(str) {
    let a = 1, b = 0;
    for (let i = 0; i < str.length; i++) {
        a = (a + str.charCodeAt(i)) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}

function createCardHTML(char) {
    if (!char) return '';

    let skillsHTML = '';
    if (char.skills && char.skills.length > 0) {
        char.skills.forEach(skill => {
            let energyHTML = '';
            skill.energy.forEach(e => {
                energyHTML += `<div class="energy-icon energy-${e.toLowerCase()}" title="${e}"></div>`;
            });

            skillsHTML += `
                <div class="skill">
                    <div class="skill-header">
                        <span class="skill-name">${skill.name}</span>
                        <div class="energy-costs">${energyHTML}</div>
                    </div>
                    <div class="skill-desc">${skill.description}</div>
                    <div class="skill-meta">
                        <span>Cooldown: ${skill.cooldown}</span>
                        <span>${skill.classes}</span>
                    </div>
                </div>
            `;
        });
    }

    return `
        <div class="card">
            <div class="card-image-container">
                <div class="card-image" style="background-image: url('${char.image_url}')"></div>
                <div class="card-header">
                    <p class="card-name">${char.name}</p>
                </div>
            </div>
            <div class="card-body">
                <div class="card-desc">${char.description}</div>
                <div class="skills-container">
                    ${skillsHTML}
                </div>
            </div>
        </div>
    `;
}

function renderGame(state) {
    const { state: status, players, current_player_id, current_player_name, last_drawn_character } = state;

    // 1. Update Header / State Text
    gameStateText.textContent = `Status: ${status} | Current Turn: ${current_player_name}`;

    // 2. Hide all buttons initially
    btnStart.style.display = 'none';
    btnDraw.style.display = 'none';
    btnKeep.style.display = 'none';
    btnPass.style.display = 'none';
    actionArea.style.display = 'none';

    // 3. Control Logic
    const isMyTurn = (current_player_id === myPlayerId);

    if (status === 'WAITING_FOR_PLAYERS') {
        if (players.length >= 2) {
            btnStart.style.display = 'inline-block';
        }
    } else if (status === 'IN_PROGRESS' && isMyTurn) {
        btnDraw.style.display = 'inline-block';
    } else if (status === 'DECIDING' && isMyTurn) {
        actionArea.style.display = 'block';
        drawnCardContainer.innerHTML = createCardHTML(last_drawn_character);

        btnKeep.style.display = 'inline-block';

        // Find my player data to check passes
        const me = players.find(p => p.id === myPlayerId);
        if (me && !me.passes_used) {
            btnPass.style.display = 'inline-block';
        }
    } else if (status === 'DECIDING' && !isMyTurn) {
        actionArea.style.display = 'block';
        drawnCardContainer.innerHTML = createCardHTML(last_drawn_character);
    }

    // 4. Render Player Boards
    playersArea.innerHTML = '';

    players.forEach(p => {
        const isCurrentTurn = (p.id === current_player_id && status !== 'FINISHED' && status !== 'WAITING_FOR_PLAYERS');

        const board = document.createElement('div');
        board.className = `player-board card-panel ${isCurrentTurn ? 'active-turn' : ''}`;

        const info = document.createElement('div');
        info.className = 'player-info';
        info.innerHTML = `
            <h3>${p.name} ${p.id === myPlayerId ? '(You)' : ''}</h3>
            <div>
                Pass Used: ${p.passes_used ? 'Yes' : 'No'} | Characters: ${p.team.length}/5
            </div>
        `;

        const team = document.createElement('div');
        team.className = 'player-team';

        p.team.forEach(char => {
            team.innerHTML += createCardHTML(char);
        });

        // Fill empty slots up to 5
        for(let i = p.team.length; i < 5; i++) {
            team.innerHTML += `<div class="card" style="border: 2px dashed #444; display:flex; justify-content:center; align-items:center; color:#555;">Empty Slot</div>`;
        }

        board.appendChild(info);
        board.appendChild(team);
        playersArea.appendChild(board);
    });
}
