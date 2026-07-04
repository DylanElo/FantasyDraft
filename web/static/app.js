/**
 * JJK Fantasy Draft — Multiplayer Client
 * 
 * Based on the canonical Design System prototype (docs/app.js),
 * adapted for Flask-SocketIO multiplayer. The server is the source of truth;
 * this client renders the state it receives via 'game_update' events.
 */
const socket = io();

// Auto-populate player name from localStorage on load
document.addEventListener('DOMContentLoaded', () => {
    const storedName = localStorage.getItem('jjk_player_name');
    if (storedName) {
        const nameField = document.getElementById('player-name');
        if (nameField) nameField.value = storedName;
    }
    mountJjkSmokeParticles();
});

// ── FACTION MAPPING ───────────────────────────────────────────────────────────
const FACTION = {
    'Satoru Gojo': 'tokyo', 'Yuji Itadori': 'tokyo',
    'Megumi Fushiguro': 'tokyo', 'Nobara Kugisaki': 'tokyo',
    'Kento Nanami': 'tokyo', 'Yuta Okkotsu': 'tokyo',
    'Hakari Kinji': 'tokyo', 'Panda': 'tokyo', 'Shoko Ieiri': 'tokyo',
    'Yuta Okkotsu (JJK 0)': 'tokyo', 'Yuta Okkotsu (Sendai)': 'tokyo',
    "Yuta (Gojo's Body)": 'tokyo', 'Gojo (Young)': 'tokyo',
    'Gojo (Unsealed)': 'tokyo', 'Yuji (Black Flash)': 'tokyo',
    'Yuji (Awakened)': 'tokyo',
    'Aoi Todo': 'kyoto', 'Maki Zenin': 'kyoto', 'Toge Inumaki': 'kyoto',
    'Noritoshi Kamo': 'kyoto', 'Kasumi Miwa': 'kyoto', 'Mai Zenin': 'kyoto',
    'Mei Mei': 'other', 'Naobito Zenin': 'other', 'Toji Fushiguro': 'other',
    'Yuki Tsukumo': 'other', 'Kusakabe': 'other',
    'Suguru Geto': 'villain', 'Kenjaku': 'villain', 'Uraume': 'villain',
    'Naoya Zenin': 'villain',
    'Ryomen Sukuna': 'curse', 'Mahito': 'curse', 'Jogo': 'curse',
    'Hanami': 'curse', 'Choso': 'curse', 'Dagon': 'curse',
    'Sukuna (Incarnation)': 'curse', 'Sukuna (Full Power)': 'curse',
    'Sukuna (Heian Era)': 'curse',
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
    'Maki (Awakened)': 'kyoto',
};

const FACTION_LABEL = {
    tokyo: 'Tokyo', kyoto: 'Kyoto', other: 'Sorcerer',
    villain: 'Villain', curse: 'Curse', culling: 'Culling',
};

const MAX_TEAM = 5;

// ── STATE ─────────────────────────────────────────────────────────────────────
let myPlayerId = PLAYER_SESSION_ID; // Injected by Jinja template
let currentGameState = null;
let lastGameStateStatus = null;
let lastBattleTurnKey = null;

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const BROKEN_PORTRAIT_NAMES = new Set([
    'Yuta Okkotsu (JJK 0)',
    'Yuta Okkotsu (Sendai)',
    "Yuta (Gojo's Body)",
    'Gojo (Young)',
    'Gojo (Unsealed)',
    'Sukuna (Full Power)',
    'Sukuna (Heian Era)',
    'Yuji (Black Flash)',
    'Yuji (Awakened)',
    'Kenjaku',
    'Hiromi Higuruma',
    'Uraume',
]);

function charInitials(name) {
    return String(name || '?')
        .replace(/\([^)]*\)/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase() || '?';
}

function hasReliablePortrait(char) {
    return !!(char && char.portrait_url && !char.portrait_url.includes('placeholder'));
}

function characterArtHTML(char, className = 'char-art') {
    if (hasReliablePortrait(char)) {
        return `<div class="${className}" style="background-image:url('${esc(char.portrait_url)}')"></div>`;
    }
    return `<div class="${className} art-missing" data-initials="${esc(charInitials(char && char.name))}">
        <div class="char-art-fallback">${esc(charInitials(char && char.name))}</div>
    </div>`;
}

function characterArtStyle(char) {
    return hasReliablePortrait(char) ? `background-image:url('${esc(char.portrait_url)}')` : '';
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.body.classList.toggle('jjk-battle-active', id === 'battle-arena');
    if (id !== 'battle-arena') document.body.classList.remove('jjk-opponent-turn');
}

function mountJjkSmokeParticles() {
    const field = document.querySelector('.jjk-smoke-field');
    if (!field || field.dataset.ready) return;
    field.dataset.ready = '1';
    const particleTypes = ['', 'crimson', 'blue'];
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('span');
        const type = particleTypes[i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0];
        p.className = `jjk-smoke-particle ${type}`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDuration = `${10 + Math.random() * 8}s`;
        p.style.animationDelay = `${-Math.random() * 14}s`;
        p.style.transform = `scale(${0.6 + Math.random() * 1.4})`;
        field.appendChild(p);
    }
}

function showJjkTurnBanner({ main, sub, eyebrow = 'CURSED CLASH', variant = '', kanji = '\u546a' }) {
    const root = document.getElementById('jjk-turn-banner-root');
    if (!root) return;
    const banner = document.createElement('div');
    banner.className = `jjk-turn-banner ${variant}`.trim();
    banner.innerHTML = `
      <div class="kbg">${esc(kanji)}</div>
      <div class="stack">
        <div class="eyebrow">${esc(eyebrow)}</div>
        <div class="main">${esc(main)}</div>
        <div class="sub">${esc(sub)}</div>
      </div>`;
    root.replaceChildren(banner);
    window.setTimeout(() => {
        if (banner.parentNode === root) banner.remove();
    }, 1450);
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
        const title = key === 'black' ? 'Wildcard cost' : e;
        return `<div class="orb orb-${key}" title="${esc(title)}"></div>`;
    }).join('');
}

function targetLabel(s) {
    if (s.is_aoe) return s.target_type === 'ally' ? 'All allies' : 'All enemies';
    if (s.target_type === 'self') return 'Self';
    if (s.target_type === 'ally') return 'Ally';
    return 'Enemy';
}

function skillEffectsHTML(s) {
    let html = '';
    if (s.damage > 0) {
        if (s.is_piercing) {
            html += `<span class="effect-chip pierce">⚡ ${s.damage} PIERCE</span>`;
        } else if (s.is_affliction) {
            html += `<span class="effect-chip afflict">🌀 ${s.damage} AFFLICT</span>`;
        } else {
            html += `<span class="effect-chip dmg">⚔️ ${s.damage} DMG</span>`;
        }
    }
    if (s.heal > 0) {
        html += `<span class="effect-chip heal">💚 ${s.heal} HEAL</span>`;
    }
    if (s.stun_turns > 0) {
        html += `<span class="effect-chip stun">🌀 STUN ${s.stun_turns}T</span>`;
    }
    if (s.invuln_turns > 0) {
        html += `<span class="effect-chip invuln">🛡️ INVULN ${s.invuln_turns}T</span>`;
    }
    if (s.damage_reduction > 0) {
        html += `<span class="effect-chip dr">🛡️ -${s.damage_reduction} DR</span>`;
    }
    if (s.dot_damage > 0) {
        html += `<span class="effect-chip afflict">🩸 DoT ${s.dot_damage}/T (${s.dot_turns}T)</span>`;
    }
    return html ? `<div class="skill-effects">${html}</div>` : '';
}

// Arena-style compact facts override the legacy verbose chip labels above.
function skillEffectsHTML(s) {
    let html = '';
    if (s.damage > 0) {
        if (s.is_piercing) html += `<span class="effect-chip pierce">${s.damage} pierce</span>`;
        else if (s.is_affliction) html += `<span class="effect-chip afflict">${s.damage} afflict</span>`;
        else html += `<span class="effect-chip dmg">${s.damage} dmg</span>`;
    }
    if (s.heal > 0) html += `<span class="effect-chip heal">${s.heal} heal</span>`;
    if (s.stun_turns > 0) html += `<span class="effect-chip stun">stun ${s.stun_turns}t</span>`;
    if (s.invuln_turns > 0) html += `<span class="effect-chip invuln">invuln ${s.invuln_turns}t</span>`;
    if (s.damage_reduction > 0) html += `<span class="effect-chip dr">-${s.damage_reduction} dmg</span>`;
    if (s.dot_damage > 0) html += `<span class="effect-chip afflict">${s.dot_damage}/t dot ${s.dot_turns}t</span>`;
    return html ? `<div class="skill-effects">${html}</div>` : '';
}

function skillMetaHTML(s, cd) {
    const primaryClass = esc((s.classes || '').split(',')[0].trim() || 'Skill');
    return `
      <div class="skill-meta arena-skill-meta">
        <span class="skill-tgt-badge">${esc(targetLabel(s))}</span>
        <span class="skill-cd-badge">CD ${esc(cd)}</span>
        <span class="skill-class">${primaryClass}</span>
      </div>`;
}

// Roster Lab: lightweight in-browser audit for design and balance review.
let rosterLabReady = false;

function skillAuditSnapshot(skill) {
    const directDamage = Number(skill.damage || 0);
    const dotTotal = Number(skill.dot_damage || 0) * Number(skill.dot_turns || 0);
    const heal = Number(skill.heal || 0);
    const stun = Number(skill.stun_turns || 0);
    const invuln = Number(skill.invuln_turns || 0);
    const dr = Number(skill.damage_reduction || 0);
    const costSize = Math.max(1, (skill.energy || []).length);
    const cooldown = Number(skill.cooldown_int ?? skill.cooldown ?? 0);
    let value = directDamage + dotTotal + heal * 0.95 + stun * 28 + invuln * 25 + dr * 1.2;
    if (skill.is_aoe) value *= 2.2;
    const efficiency = Math.round((value / (costSize + cooldown * 0.35)) * 10) / 10;
    const pressure = directDamage + dotTotal;
    const flags = [];
    if (cooldown === 0 && (skill.is_aoe || (costSize === 1 && pressure > 30) || pressure > 40 || stun)) {
        flags.push('spammable pressure');
    }
    if (efficiency >= 36) flags.push('high efficiency');
    if (costSize >= 2 && efficiency <= 5) flags.push('low visible value');
    if ((skill.description || '').length > 135) flags.push('long text');
    return { value, efficiency, pressure, flags };
}

function characterAuditSnapshot(char) {
    const skillRows = (char.skills || []).map(skill => ({ skill, audit: skillAuditSnapshot(skill) }));
    const flags = skillRows.flatMap(row => row.audit.flags);
    const maxBurst = skillRows.reduce((m, row) => Math.max(m, row.audit.pressure), 0);
    const aoe = skillRows.filter(row => row.skill.is_aoe).length;
    const control = skillRows.reduce((sum, row) => sum + Number(row.skill.stun_turns || 0), 0);
    const support = skillRows.filter(row => row.skill.heal || row.skill.target_type === 'ally').length;
    const energyCounts = {};
    skillRows.forEach(row => (row.skill.energy || []).forEach(color => {
        energyCounts[color] = (energyCounts[color] || 0) + 1;
    }));
    return { skillRows, flags, maxBurst, aoe, control, support, energyCounts };
}

function rosterLabData() {
    const chars = Array.isArray(window.CHARACTERS_DATA) ? window.CHARACTERS_DATA : (typeof CHARACTERS_DATA !== 'undefined' ? CHARACTERS_DATA : []);
    return chars.map(char => ({ char, audit: characterAuditSnapshot(char) }));
}

function populateRosterLabFilters(rows) {
    const roleFilter = document.getElementById('roster-role-filter');
    const identityFilter = document.getElementById('roster-identity-filter');
    if (!roleFilter || !identityFilter || rosterLabReady) return;

    const roles = [...new Set(rows.map(row => row.char.role || 'Specialist'))].sort();
    const identities = [...new Set(rows.map(row => row.char.identity || row.char.name))].sort();
    roleFilter.innerHTML = '<option value="all">All roles</option>' + roles.map(role => `<option value="${esc(role)}">${esc(role)}</option>`).join('');
    identityFilter.innerHTML = '<option value="all">All identities</option>' + identities.map(identity => `<option value="${esc(identity)}">${esc(identity)}</option>`).join('');
    rosterLabReady = true;
}

function rosterEnergyHTML(energyCounts) {
    const order = ['green', 'red', 'blue', 'white', 'black'];
    return order.filter(color => energyCounts[color]).map(color =>
        `<span class="roster-energy"><span class="orb orb-${color}"></span>${energyCounts[color]}</span>`
    ).join('');
}

function renderRosterLab() {
    const list = document.getElementById('roster-lab-list');
    const stats = document.getElementById('roster-lab-stats');
    const summary = document.getElementById('roster-lab-summary');
    if (!list || !stats || !summary) return;

    const rows = rosterLabData();
    populateRosterLabFilters(rows);

    const q = (document.getElementById('roster-search')?.value || '').trim().toLowerCase();
    const role = document.getElementById('roster-role-filter')?.value || 'all';
    const identity = document.getElementById('roster-identity-filter')?.value || 'all';
    const flagMode = document.getElementById('roster-flag-filter')?.value || 'all';

    const filtered = rows.filter(({ char, audit }) => {
        const haystack = [
            char.name, char.identity, char.role, char.rarity, char.description,
            ...(char.skills || []).flatMap(s => [s.name, s.description, s.classes])
        ].join(' ').toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (role !== 'all' && char.role !== role) return false;
        if (identity !== 'all' && (char.identity || char.name) !== identity) return false;
        if (flagMode === 'flagged' && audit.flags.length === 0) return false;
        if (flagMode === 'clean' && audit.flags.length > 0) return false;
        if (flagMode === 'local' && char.portrait_source !== 'local') return false;
        return true;
    });

    const allFlags = rows.reduce((sum, row) => sum + row.audit.flags.length, 0);
    const localPortraits = rows.filter(row => row.char.portrait_source === 'local').length;
    const identities = new Set(rows.map(row => row.char.identity || row.char.name)).size;
    summary.textContent = `${rows.length} characters, ${identities} identities, ${allFlags} flags`;
    stats.innerHTML = [
        ['Characters', rows.length],
        ['Visible', filtered.length],
        ['Identities', identities],
        ['Local art', localPortraits],
        ['Flags', allFlags],
    ].map(([label, value]) => `<div class="roster-stat"><strong>${value}</strong><span>${label}</span></div>`).join('');

    if (!filtered.length) {
        list.innerHTML = '<div class="roster-empty">No characters match these filters.</div>';
        return;
    }

    list.innerHTML = filtered.map(({ char, audit }) => {
        const flagHTML = audit.flags.length
            ? audit.flags.map(flag => `<span class="roster-flag">${esc(flag)}</span>`).join('')
            : '<span class="roster-clean">clean</span>';
        const skillHTML = audit.skillRows.map(({ skill, audit: skillAudit }) => {
            const skillFlags = skillAudit.flags.length
                ? skillAudit.flags.map(flag => `<span class="roster-flag small">${esc(flag)}</span>`).join('')
                : '';
            return `
              <div class="roster-skill-row">
                <div class="roster-skill-main">
                  <strong>${esc(skill.name)}</strong>
                  <span>${orbsHTML(skill.energy)} <b>CD ${esc(skill.cooldown_int ?? skill.cooldown ?? 0)}</b> ${esc(targetLabel(skill))}</span>
                </div>
                ${skillEffectsHTML(skill)}
                <div class="roster-skill-score">eff ${skillAudit.efficiency}</div>
                ${skillFlags}
              </div>`;
        }).join('');
        return `
          <article class="roster-audit-card">
            <div class="roster-card-head">
              <div class="roster-card-art ${hasReliablePortrait(char) ? '' : 'art-missing'}" style="${characterArtStyle(char)}">
                ${hasReliablePortrait(char) ? '' : `<span>${esc(charInitials(char.name))}</span>`}
              </div>
              <div class="roster-card-title">
                <strong>${esc(char.name)}</strong>
                <span>${esc(char.role || 'Specialist')} / ${esc(char.rarity || 'Rare')} / ${esc(char.identity || char.name)}</span>
                <div class="roster-card-tags">
                  <span>${esc(char.portrait_source || 'remote')} portrait</span>
                  <span>burst ${audit.maxBurst}</span>
                  <span>aoe ${audit.aoe}</span>
                  <span>ctrl ${audit.control}</span>
                  <span>support ${audit.support}</span>
                </div>
              </div>
              <div class="roster-card-energy">${rosterEnergyHTML(audit.energyCounts)}</div>
            </div>
            <div class="roster-card-flags">${flagHTML}</div>
            <div class="roster-card-desc">${esc(char.description || '')}</div>
            <div class="roster-skill-list">${skillHTML}</div>
          </article>`;
    }).join('');
}

function roleAbbrev(role) {
    const table = {
        Burst: 'BR',
        Control: 'CT',
        Tank: 'TK',
        Support: 'SP',
        Setup: 'SU',
        Punisher: 'PN',
        AoE: 'AO',
        Bruiser: 'BR',
        Specialist: 'EX',
    };
    return table[role] || String(role || 'EX').slice(0, 2).toUpperCase();
}

// ── CARD HTML (from canonical design system) ──────────────────────────────────
function charCardHTML(char) {
    if (!char) return '';
    const faction = FACTION[char.name] || 'other';
    const fLabel  = FACTION_LABEL[faction] || 'Sorcerer';
    const rarity  = char.rarity || 'Rare';
    const rarityClass = `rarity-${rarity.toLowerCase()}`;
    const particleOverlay = rarity === 'Legendary'
        ? `<div class="embers-wrapper"><div class="ember"></div><div class="ember"></div><div class="ember"></div><div class="ember"></div><div class="ember"></div><div class="ember"></div><div class="ember"></div><div class="ember"></div></div>`
        : '';

    const art = characterArtHTML(char);

    const skills = (char.skills || []).map(s => {
        const cd        = (!s.cooldown || s.cooldown === 'None' || s.cooldown === '0') ? 'None' : s.cooldown;
        const typeClass = skillTypeClass(s.classes);
        return `
        <div class="skill-item ${typeClass}">
            <div class="skill-top">
                <span class="skill-name">${esc(s.name)}</span>
                <div class="orbs">${orbsHTML(s.energy)}</div>
            </div>
            ${skillEffectsHTML(s)}
            <div class="skill-desc">${esc(s.description)}</div>
            <div class="skill-meta">
                <span class="skill-cd-badge">🕒 CD: ${esc(cd)}</span>
                <span class="skill-class">${esc((s.classes || '').split(',')[0].trim())}</span>
            </div>
        </div>`;
    }).join('');

    const charType = char.role || char.char_type || 'Specialist';
    const typeIcons = {
        'Burst': 'BR',
        'Control': 'CT',
        'Tank': 'TK',
        'Setup': 'SU',
        'Punisher': 'PN',
        'AoE': 'AO',
        'Burst': 'BR',
        'Control': 'CT',
        'Tank': 'TK',
        'Setup': 'SU',
        'Punisher': 'PN',
        'AoE': 'AO',
        'Attacker': '⚔️',
        'Assassin': '🗡️',
        'Defender': '🛡️',
        'Controller': '🌀',
        'Support': '💊',
        'Specialist': '⚡',
        'Bruiser': '💪'
    };
    const icon = typeIcons[charType] || '⚡';

    return `
    <div class="char-card-frame premium-card-in smoke ${rarityClass}">
        <div class="char-card faction-${faction}">
            ${particleOverlay}
            ${art}
            <div class="char-namebar">
                <div class="char-name">${esc(char.name)}</div>
                <div class="char-badges">
                    <span class="type-badge type-badge--${charType.toLowerCase()}" title="${esc(charType)}">${icon} ${esc(charType)}</span>
                    <span class="faction-badge">${esc(fLabel)}</span>
                    <span class="rarity-badge rarity-badge--${rarity.toLowerCase()}">${esc(rarity)}</span>
                </div>
            </div>
            <div class="char-body">
                <p class="char-desc">${esc(char.description)}</p>
                <div class="skills-list">${skills}</div>
            </div>
        </div>
    </div>`;
}

function miniCardHTML(char) {
    const faction = FACTION[char.name] || 'other';
    const rarity  = char.rarity || 'Rare';
    return `
    <div class="mini-card faction-${faction} rarity-${rarity.toLowerCase()}" data-name="${esc(char.name)}">
        ${characterArtHTML(char, 'mini-art')}
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

function recordResult(won, opponentName, myTeam, synergiesUsed = [], difficulty = '', turns = 0, biggestHit = 0) {
    const history = loadHistory();
    history.push({
        won,
        opponent: opponentName || '?',
        team: myTeam || [],
        synergies: synergiesUsed || [],
        difficulty: difficulty || '',
        turns: turns || 0,
        biggestHit: biggestHit || 0,
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

    // Calculate personal records
    const wonMatches = history.filter(h => h.won && h.turns > 0);
    const fastestWin = wonMatches.length > 0 ? Math.min(...wonMatches.map(h => h.turns)) : null;
    const biggestHit = history.length > 0 ? Math.max(...history.map(h => h.biggestHit || 0)) : 0;

    let recordsHTML = '';
    if (fastestWin || biggestHit > 0) {
        recordsHTML = `
            <div class="personal-records" style="display:flex;gap:8px;margin-bottom:8px;justify-content:center;">
                ${fastestWin ? `<span class="record-badge fastest-win" style="background:rgba(245,158,11,0.15);color:var(--gold);border:1px solid rgba(245,158,11,0.3);padding:2px 6px;border-radius:4px;font-size:10px;">⚡ Fastest Win: <strong>${fastestWin}t</strong></span>` : ''}
                ${biggestHit > 0 ? `<span class="record-badge biggest-hit" style="background:rgba(239,68,68,0.15);color:var(--red);border:1px solid rgba(239,68,68,0.3);padding:2px 6px;border-radius:4px;font-size:10px;">💥 Max Strike: <strong>${biggestHit} DMG</strong></span>` : ''}
            </div>
        `;
    }

    const rows = history.slice().reverse().slice(0, 5).map(h => {
        const diffBadge = h.difficulty ? `<span class="history-diff-badge ${h.difficulty.toLowerCase()}">${esc(h.difficulty)}</span>` : '';
        const synList = h.synergies && h.synergies.length > 0 ? `
            <div class="history-row-synergies" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;">
                ${h.synergies.map(s => `<span class="history-syn-mini" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);font-size:9px;padding:1px 4px;border-radius:3px;color:rgba(255,255,255,0.7)">⚡ ${esc(s)}</span>`).join('')}
            </div>` : '';
        const statsStr = h.turns ? `<span class="history-row-stats" style="color:var(--dim);margin-left:4px;">(${h.turns}t${h.biggestHit ? `, ${h.biggestHit} Max` : ''})</span>` : '';
        return `
        <div class="history-row" style="margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.03);padding-bottom:4px;">
            <div class="history-row-main" style="display:flex;align-items:center;width:100%;gap:6px;">
                <span class="history-result ${h.won ? 'win' : 'loss'}">${h.won ? 'W' : 'L'}</span>
                <span class="history-opp" style="flex:1;">vs ${esc(h.opponent)} ${diffBadge} ${statsStr}</span>
                <span class="history-date">${esc(h.date)}</span>
            </div>
            ${synList}
        </div>`;
    }).join('');
    el.innerHTML = `
        <div class="history-header" style="display:flex;flex-direction:column;align-items:center;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px;">
            <div class="history-record" style="border-bottom:none;margin-bottom:0;padding-bottom:0;">${wins}W — ${losses}L</div>
            ${recordsHTML}
        </div>
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

// ── CLASSIC ARENA V2 DEV SCREEN ─────────────────────────────────────────────
const v2State = {
    state: null,
    selectedCasterSlot: null,
    selectedSkillId: null,
    actions: [],
    wildcardPays: {},
};

function v2PlayerIds() {
    const ids = v2State.state ? Object.keys(v2State.state.players || {}) : [];
    const mine = ids.includes(myPlayerId) ? myPlayerId : ids[0];
    const enemy = ids.find(id => id !== mine);
    return { mine, enemy };
}

function v2SkillFor(characterId, skillId) {
    const character = v2State.state?.skill_catalog?.[characterId];
    return (character?.skills || []).find(skill => skill.id === skillId);
}

function v2SkillsFor(characterId) {
    return v2State.state?.skill_catalog?.[characterId]?.skills || [];
}

function v2StatusHTML(character) {
    const statuses = character.statuses || [];
    if (!statuses.length) return '';
    return `<div class="v2-status-row">${statuses.map(status =>
        `<span class="v2-status">${esc(status.name)} ${status.duration}</span>`
    ).join('')}</div>`;
}

function v2CharacterCardHTML(character, slot, isMine, isTurn) {
    const selected = isMine && v2State.selectedCasterSlot === slot;
    const queued = v2State.actions.some(action => action.caster_slot === slot);
    const dead = !character.alive;
    const hpPct = Math.max(0, Math.min(100, Math.round((character.hp / character.max_hp) * 100)));
    return `
      <button class="v2-char ${selected ? 'selected' : ''} ${queued ? 'queued' : ''} ${dead ? 'dead' : ''}"
        data-v2-role="${isMine ? 'caster' : 'target'}" data-slot="${slot}" ${dead ? 'disabled' : ''}>
        <div class="v2-char-top">
          <strong>${esc(character.name)}</strong>
          <span>${character.hp}/${character.max_hp}</span>
        </div>
        <div class="v2-hp"><span style="width:${hpPct}%"></span></div>
        ${v2StatusHTML(character)}
        <div class="v2-char-foot">${queued ? 'Queued' : isMine && isTurn ? 'Ready' : ''}</div>
      </button>`;
}

function v2QueuedSkillIds() {
    return new Set(v2State.actions.map(action => action.skill_id));
}

function v2SkillButtonHTML(skill, character, disabled) {
    const cooldown = character.cooldowns?.[skill.id] || 0;
    const isDisabled = disabled || cooldown > 0;
    const classes = (skill.classes || []).slice(0, 3).join(' / ');
    return `
      <button class="v2-skill ${isDisabled ? 'disabled' : ''}" data-skill-id="${esc(skill.id)}" ${isDisabled ? 'disabled' : ''}>
        <div class="v2-skill-head">
          <strong>${esc(skill.name)}</strong>
          <span>${orbsHTML(skill.cost)} CD ${cooldown || skill.cooldown || 0}</span>
        </div>
        <p>${esc(skill.text)}</p>
        <small>${esc(classes)}</small>
      </button>`;
}

function v2PendingActionPayloads() {
    return v2State.actions.map((action, index) => ({
        ...action,
        queue_index: index,
        wildcard_pays: v2State.wildcardPays[action.id] || [],
    }));
}

function v2AddAction(casterSlot, skillId, targetPlayerId, targetSlot, targetSlots = []) {
    const actionId = `v2_${Date.now()}_${casterSlot}`;
    v2State.actions = v2State.actions.filter(action => action.caster_slot !== casterSlot);
    v2State.actions.push({
        id: actionId,
        caster_slot: casterSlot,
        skill_id: skillId,
        target_player_id: targetPlayerId,
        target_slot: targetSlot,
        target_slots: targetSlots,
    });
    v2State.selectedSkillId = null;
    v2SubmitPlan();
    renderClassicV2();
}

function v2SubmitPlan() {
    if (!v2State.state) return;
    socket.emit('battle_v2_submit_plan', { actions: v2PendingActionPayloads() });
}

function v2UpdateQueue() {
    if (!v2State.state) return;
    socket.emit('battle_v2_update_queue', {
        queue_order: v2State.actions.map(action => action.id),
        wildcard_pays: v2State.wildcardPays,
    });
}

function v2QueueHTML() {
    const { mine } = v2PlayerIds();
    const me = v2State.state?.players?.[mine];
    if (!v2State.actions.length) {
        return '<div class="v2-empty">Queue up to one skill from each active fighter.</div>';
    }
    return v2State.actions.map((action, index) => {
        const caster = me?.team?.[action.caster_slot];
        const skill = caster ? v2SkillFor(caster.character_id, action.skill_id) : null;
        const blackCount = (skill?.cost || []).filter(color => color === 'black').length;
        const pays = v2State.wildcardPays[action.id] || [];
        const wildcardControls = Array.from({ length: blackCount }, (_, payIndex) => `
          <select class="v2-wildcard-select" data-action-id="${esc(action.id)}" data-pay-index="${payIndex}">
            ${['', 'green', 'red', 'blue', 'white'].map(color =>
                `<option value="${color}" ${pays[payIndex] === color ? 'selected' : ''}>${color || 'pay wildcard'}</option>`
            ).join('')}
          </select>`).join('');
        return `
          <div class="v2-queue-item">
            <div>
              <strong>${index + 1}. ${esc(caster?.name || 'Unknown')}</strong>
              <span>${esc(skill?.name || action.skill_id)}</span>
            </div>
            <div class="v2-queue-controls">
              ${wildcardControls}
              <button class="icon-btn v2-move" data-dir="-1" data-action-id="${esc(action.id)}" title="Move up">↑</button>
              <button class="icon-btn v2-move" data-dir="1" data-action-id="${esc(action.id)}" title="Move down">↓</button>
              <button class="icon-btn v2-remove" data-action-id="${esc(action.id)}" title="Remove">✕</button>
            </div>
          </div>`;
    }).join('');
}

function renderClassicV2() {
    const state = v2State.state;
    const title = document.getElementById('v2-phase-title');
    const hint = document.getElementById('v2-phase-hint');
    if (!state) {
        if (title) title.textContent = 'Classic Queue Test';
        if (hint) hint.textContent = 'Start a local Battle v2 match behind the feature flag.';
        ['v2-my-team', 'v2-enemy-team', 'v2-energy-row', 'v2-selected-panel', 'v2-queue-panel', 'v2-log'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        return;
    }
    const { mine, enemy } = v2PlayerIds();
    const me = state.players[mine];
    const foe = state.players[enemy];
    const isMyTurn = state.turn_player_id === mine && state.phase !== 'finished';
    document.getElementById('v2-turn-badge').textContent = `Turn ${state.turn_number}`;
    title.textContent = state.phase.replace(/_/g, ' ').toUpperCase();
    hint.textContent = state.winner_id
        ? `${state.players[state.winner_id]?.name || state.winner_id} wins`
        : isMyTurn ? 'Select a fighter, skill, target, then confirm the queued actions.' : `Waiting on ${state.players[state.turn_player_id]?.name || 'opponent'}.`;
    document.getElementById('v2-energy-row').innerHTML = renderEnergyPool(me?.energy || {});
    document.getElementById('v2-my-team').innerHTML = (me?.team || []).map((character, slot) =>
        v2CharacterCardHTML(character, slot, true, isMyTurn)
    ).join('');
    document.getElementById('v2-enemy-team').innerHTML = (foe?.team || []).map((character, slot) =>
        v2CharacterCardHTML(character, slot, false, isMyTurn)
    ).join('');
    const selected = me?.team?.[v2State.selectedCasterSlot];
    document.getElementById('v2-selected-panel').innerHTML = selected
        ? `<div class="v2-panel-title">${esc(selected.name)}</div>${v2SkillsFor(selected.character_id).map(skill =>
            v2SkillButtonHTML(skill, selected, !isMyTurn || v2QueuedSkillIds().has(skill.id) || v2State.actions.some(a => a.caster_slot === v2State.selectedCasterSlot))
        ).join('')}`
        : '<div class="v2-empty">Select one of your fighters.</div>';
    document.getElementById('v2-queue-panel').innerHTML = v2QueueHTML();
    document.getElementById('v2-log').innerHTML = (state.event_log || []).slice().reverse().slice(0, 8).map(event =>
        `<div class="log-entry">${esc(event.message)}</div>`
    ).join('');
    document.getElementById('btn-v2-confirm').disabled = !isMyTurn || v2State.actions.length === 0;
    document.getElementById('btn-v2-cancel').disabled = !isMyTurn || v2State.actions.length === 0;
}

function v2StartMatch() {
    const nameInput = document.getElementById('player-name').value.trim() || 'Player';
    localStorage.setItem('jjk_player_name', nameInput);
    v2State.actions = [];
    v2State.wildcardPays = {};
    v2State.selectedCasterSlot = null;
    v2State.selectedSkillId = null;
    socket.emit('battle_v2_start_classic', {
        room_id: 'classic_v2_' + Math.random().toString(36).slice(2, 8),
        player_name: nameInput,
    });
    showScreen('classic-v2');
}

socket.on('battle_v2_update', (data) => {
    v2State.state = data;
    const ownPending = data.pending_actions?.[v2PlayerIds().mine] || [];
    if (ownPending.length) {
        v2State.actions = ownPending;
        v2State.wildcardPays = Object.fromEntries(ownPending.map(action => [action.id, action.wildcard_pays || []]));
    } else if (data.phase === 'planning') {
        v2State.actions = [];
        v2State.wildcardPays = {};
    }
    document.getElementById('v2-error')?.classList.add('hidden');
    renderClassicV2();
});

socket.on('battle_v2_error', (data) => {
    const el = document.getElementById('v2-error');
    if (el) {
        el.textContent = data.message || 'Battle v2 error';
        el.classList.remove('hidden');
    }
    toast(data.message || 'Battle v2 error');
});

socket.on('battle_v2_finished', (data) => {
    toast(`Battle v2 finished: ${data.winner_id}`);
});

// ── SETUP SCREEN ──────────────────────────────────────────────────────────────
// Render history on load
renderHistory();
renderRosterLab();

document.getElementById('btn-roster-lab').addEventListener('click', () => {
    renderRosterLab();
    showScreen('roster-lab');
});

document.getElementById('btn-roster-back').addEventListener('click', () => {
    showScreen('setup');
});

document.getElementById('btn-classic-v2').addEventListener('click', () => {
    showScreen('classic-v2');
    renderClassicV2();
});

document.getElementById('btn-v2-back').addEventListener('click', () => {
    showScreen('setup');
});

document.getElementById('btn-v2-start').addEventListener('click', v2StartMatch);
document.getElementById('btn-v2-cancel').addEventListener('click', () => {
    socket.emit('battle_v2_cancel_queue');
});
document.getElementById('btn-v2-confirm').addEventListener('click', () => {
    v2UpdateQueue();
    socket.emit('battle_v2_confirm_queue');
});

document.getElementById('classic-v2').addEventListener('click', (event) => {
    const caster = event.target.closest('[data-v2-role="caster"]');
    if (caster) {
        v2State.selectedCasterSlot = Number(caster.dataset.slot);
        v2State.selectedSkillId = null;
        renderClassicV2();
        return;
    }
    const skill = event.target.closest('.v2-skill');
    if (skill && !skill.disabled) {
        v2State.selectedSkillId = skill.dataset.skillId;
        const { mine, enemy } = v2PlayerIds();
        const me = v2State.state.players[mine];
        const selectedCharacter = me?.team?.[v2State.selectedCasterSlot];
        const selectedSkill = selectedCharacter ? v2SkillFor(selectedCharacter.character_id, v2State.selectedSkillId) : null;
        const targetKind = selectedSkill?.target_rule?.kind || 'enemy';
        if (targetKind === 'self') {
            v2AddAction(v2State.selectedCasterSlot, v2State.selectedSkillId, mine, v2State.selectedCasterSlot);
            return;
        }
        if (targetKind === 'enemy_team') {
            v2AddAction(v2State.selectedCasterSlot, v2State.selectedSkillId, enemy, null, [0, 1, 2]);
            return;
        }
        toast('Choose an enemy target.');
        renderClassicV2();
        return;
    }
    const target = event.target.closest('[data-v2-role="target"]');
    if (target && v2State.selectedCasterSlot !== null && v2State.selectedSkillId) {
        const { enemy } = v2PlayerIds();
        v2AddAction(v2State.selectedCasterSlot, v2State.selectedSkillId, enemy, Number(target.dataset.slot));
        return;
    }
    const remove = event.target.closest('.v2-remove');
    if (remove) {
        v2State.actions = v2State.actions.filter(action => action.id !== remove.dataset.actionId);
        delete v2State.wildcardPays[remove.dataset.actionId];
        v2SubmitPlan();
        renderClassicV2();
        return;
    }
    const move = event.target.closest('.v2-move');
    if (move) {
        const index = v2State.actions.findIndex(action => action.id === move.dataset.actionId);
        const nextIndex = index + Number(move.dataset.dir);
        if (index >= 0 && nextIndex >= 0 && nextIndex < v2State.actions.length) {
            const [item] = v2State.actions.splice(index, 1);
            v2State.actions.splice(nextIndex, 0, item);
            v2UpdateQueue();
            renderClassicV2();
        }
    }
});

document.getElementById('classic-v2').addEventListener('change', (event) => {
    const select = event.target.closest('.v2-wildcard-select');
    if (!select) return;
    const actionId = select.dataset.actionId;
    const payIndex = Number(select.dataset.payIndex);
    const pays = v2State.wildcardPays[actionId] || [];
    pays[payIndex] = select.value;
    v2State.wildcardPays[actionId] = pays.filter(Boolean);
    v2UpdateQueue();
    renderClassicV2();
});

['roster-search', 'roster-role-filter', 'roster-identity-filter', 'roster-flag-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderRosterLab);
    if (el) el.addEventListener('change', renderRosterLab);
});

document.getElementById('btn-join').addEventListener('click', () => {
    const nameInput = document.getElementById('player-name').value.trim();
    const roomInput = document.getElementById('room-id').value.trim() || 'lobby';

    if (!nameInput) {
        toast("Enter your name, sorcerer.");
        document.getElementById('player-name').focus();
        return;
    }

    localStorage.setItem('jjk_player_name', nameInput);
    socket.emit('join_room', { room_id: roomInput, player_name: nameInput });
    showScreen('game-arena');
});

document.getElementById('btn-join-cpu').addEventListener('click', () => {
    const nameInput = document.getElementById('player-name').value.trim();
    const difficultySelect = document.getElementById('cpu-difficulty-select');
    const selectedDifficulty = difficultySelect ? difficultySelect.value : 'normal';

    if (!nameInput) {
        toast("Enter your name, sorcerer.");
        document.getElementById('player-name').focus();
        return;
    }

    localStorage.setItem('jjk_player_name', nameInput);
    
    // Generate a randomized room ID for solo play so it doesn't collide with public rooms
    const randomRoomId = 'cpu_' + Math.random().toString(36).substring(2, 10);
    
    // Join that room with an acknowledgment callback to start VS CPU cleanly without race conditions
    socket.emit('join_room', { room_id: randomRoomId, player_name: nameInput }, (ack) => {
        if (ack && ack.status === 'ok') {
            socket.emit('start_vs_cpu', { difficulty: selectedDifficulty });
        }
    });
    showScreen('game-arena');
});

// ── DRAFT CONTROLS ────────────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', () => socket.emit('start_game'));
document.getElementById('btn-start-cpu').addEventListener('click', () => socket.emit('start_vs_cpu'));
document.getElementById('btn-draw').addEventListener('click', () => socket.emit('draw_card'));

// Select draft choice handler
window.selectChoice = function(choiceIndex) {
    if (currentGameState && currentGameState.current_player_id !== myPlayerId) return;
    socket.emit('choose_card', { choice_index: choiceIndex });
};

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
    const { state: status, players, current_player_id, current_player_name, last_drawn_choices } = state;

    // Track status transitions for draft sound effects
    if (lastGameStateStatus !== status) {
        if (lastGameStateStatus === 'IN_PROGRESS' && status === 'DECIDING') {
            if (window.JJK && window.JJK.AudioBus) {
                window.JJK.AudioBus.draw();
            }
        }
        lastGameStateStatus = status;
    }

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
    const btnStart = document.getElementById('btn-start');

    const btnStartCpu = document.getElementById('btn-start-cpu');
    if (status === 'WAITING_FOR_PLAYERS') {
        drawState.classList.remove('hidden');
        decideState.classList.add('hidden');
        document.getElementById('game-state-text').textContent = 'Waiting for sorcerers…';
        btnDraw.classList.add('hidden');
        // Show start button if at least 1 player; host can start solo for testing
        btnStart.classList.toggle('hidden', players.length < 1);
        // Show VS CPU button when exactly 1 player is waiting
        if (btnStartCpu) btnStartCpu.classList.toggle('hidden', players.length < 1);
    } else if (status === 'IN_PROGRESS') {
        drawState.classList.remove('hidden');
        decideState.classList.add('hidden');
        if (btnStartCpu) btnStartCpu.classList.add('hidden');
        // Reset drawn choices dataset
        const container2 = document.getElementById('drawn-card-container');
        if (container2) delete container2.dataset.choices;
        btnStart.classList.add('hidden');
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
        
        const container = document.getElementById('drawn-card-container');
        const oldChoicesSerialized = container.dataset.choices || '';
        const newChoicesSerialized = (last_drawn_choices || []).map(c => c.name).join(',');
        
        if (newChoicesSerialized && newChoicesSerialized !== oldChoicesSerialized) {
            container.dataset.choices = newChoicesSerialized;
            container.innerHTML = `<div class="mobile-swipe-hint">Swipe to compare draft offers</div><div class="choices-row">` + 
                (last_drawn_choices || []).map((char, index) => {
                    return `
                    <div class="choice-card-wrapper">
                        ${charCardHTML(char)}
                        ${isMyTurn ? `<button class="action-btn btn-choice-confirm" onclick="selectChoice(${index})">Choose ${esc(char.name)}</button>` : ''}
                    </div>`;
                }).join('') + `</div>`;
                
            // Premium stagger animation
            container.querySelectorAll('.choice-card-wrapper').forEach((el, i) => {
                el.style.opacity = '0';
                el.animate([
                    { opacity: 0, transform: 'translateY(30px) scale(0.95)' },
                    { opacity: 1, transform: 'translateY(0) scale(1)' }
                ], {
                    duration: 350,
                    delay: i * 100,
                    easing: 'cubic-bezier(0.34,1.56,0.64,1)',
                    fill: 'forwards'
                });
            });
            
            if (window.JJK && window.JJK.AudioBus) window.JJK.AudioBus.draw();
        } else if (!newChoicesSerialized) {
            container.innerHTML = '';
        }
        
        container.querySelectorAll('.char-card-frame').forEach((cardFrame) => {
            if (cardFrame && window.JJK) window.JJK.tilt(cardFrame);
        });
        
        btnStart.classList.add('hidden');
        btnDraw.classList.add('hidden');
        if (btnStartCpu) btnStartCpu.classList.add('hidden');
        if (isMyTurn) {
            document.getElementById('game-state-text').textContent = 'Pick 1 of 3 offers. Draft 5, then choose your final 3.';
        } else {
            document.getElementById('game-state-text').textContent = `${current_player_name} is choosing…`;
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
        const variantLocked = !isSelected && selectedIdentityConflict(c.name, me.team);
        const faction = FACTION[c.name] || 'other';
        const artStyle = characterArtStyle(c);
        const fallbackArt = hasReliablePortrait(c) ? '' : `<div class="char-art-fallback">${esc(charInitials(c.name))}</div>`;

        return `
        <div class="sel-card ${isSelected ? 'sel-card--chosen' : ''} ${variantLocked ? 'sel-card--locked' : ''}" data-name="${esc(c.name)}">
            <div class="sel-card-art ${hasReliablePortrait(c) ? '' : 'art-missing'}" style="${artStyle}">
                ${fallbackArt}
                ${isSelected ? '<div class="sel-checkmark">✓</div>' : ''}
            </div>
            <div class="sel-card-info">
                <div class="sel-card-name">${esc(c.name)}</div>
                <div class="sel-card-faction">${esc(c.role || 'Specialist')} / ${esc(FACTION_LABEL[faction] || '')}</div>
                <div class="sel-card-energy">${energyProfileHTML(c)}</div>
                ${variantLocked ? '<div class="sel-card-lock">Variant already selected</div>' : ''}
            </div>
        </div>`;
    }).join('');
    // Click handling is via event delegation on #selection-grid (attached once, below)

    // Synergy summary when 3 selected
    const synergyEl = document.getElementById('synergy-summary');
    let variantWarning = selectedIdentityWarning(me.team);
    if (synergyEl) {
        if (selectedTeamChars.length === 3) {
            const selected = me.team.filter(c => selectedTeamChars.includes(c.name));
            synergyEl.innerHTML = variantWarning
                ? `<div class="synergy-card synergy-card--warn"><strong>Variant lock</strong><span>${variantWarning}</span></div>`
                : buildSynergySummary(selected);
            synergyEl.classList.remove('hidden');
        } else {
            synergyEl.classList.add('hidden');
        }
    }

    if (selectedTeamChars.length === 3 && !variantWarning) {
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
        .map(c => `<span class="orb orb-${c}" style="width:10px;height:10px;display:inline-block;margin:0 1px" title="${c === 'black' ? 'wildcard cost' : c}: ${costs[c]}"></span>`)
        .join('');
}

function matchesName(charName, req) {
    return (charName || "").toLowerCase().includes(req.toLowerCase());
}

function identityOfChar(char) {
    return (char && (char.identity || char.name)) || '';
}

function selectedIdentityConflict(name, team) {
    const nextChar = (team || []).find(c => c.name === name);
    const nextIdentity = identityOfChar(nextChar);
    if (!nextIdentity) return false;
    return selectedTeamChars.some(selectedName => {
        if (selectedName === name) return false;
        const selectedChar = (team || []).find(c => c.name === selectedName);
        return identityOfChar(selectedChar) === nextIdentity;
    });
}

function selectedIdentityWarning(team) {
    const seen = new Map();
    for (const name of selectedTeamChars) {
        const char = (team || []).find(c => c.name === name);
        const identity = identityOfChar(char);
        if (!identity) continue;
        if (seen.has(identity)) {
            return `Only one ${esc(identity)} variant can enter the 3v3.`;
        }
        seen.set(identity, name);
    }
    return '';
}

function isVillain(charName) {
    const villainKeywords = ["jogo", "hanami", "mahito", "choso", "geto", "kenjaku", "sukuna"];
    const nameLower = (charName || "").toLowerCase();
    return villainKeywords.some(kw => nameLower.includes(kw));
}

function checkJJKSynergies(teamNames) {
    const active = [];
    if (!teamNames || teamNames.length === 0) return active;
    
    const hasYuji = teamNames.some(n => matchesName(n, "Yuji"));
    const hasMegumi = teamNames.some(n => matchesName(n, "Megumi"));
    const hasNobara = teamNames.some(n => matchesName(n, "Nobara"));
    const hasYutaNormal = teamNames.some(n => n === "Yuta Okkotsu");
    const hasYutaJJK0 = teamNames.some(n => n === "Yuta Okkotsu (JJK 0)");
    const hasYutaVariant = teamNames.some(n => matchesName(n, "Yuta"));
    const hasYutaAny = hasYutaNormal || hasYutaJJK0 || hasYutaVariant;
    const hasToji = teamNames.some(n => matchesName(n, "Toji"));
    const hasMaki = teamNames.some(n => matchesName(n, "Maki"));
    const hasGojo = teamNames.some(n => matchesName(n, "Gojo"));
    const hasYuki = teamNames.some(n => matchesName(n, "Yuki"));
    const hasHakari = teamNames.some(n => matchesName(n, "Hakari"));
    const hasMai = teamNames.some(n => matchesName(n, "Mai"));
    const hasNaobito = teamNames.some(n => matchesName(n, "Naobito"));
    const hasTodo = teamNames.some(n => matchesName(n, "Todo"));
    const hasJogo = teamNames.some(n => matchesName(n, "Jogo"));
    const hasHanami = teamNames.some(n => matchesName(n, "Hanami"));
    const hasMahito = teamNames.some(n => matchesName(n, "Mahito"));
    const hasMiguel = teamNames.some(n => matchesName(n, "Miguel"));
    const hasChoso = teamNames.some(n => matchesName(n, "Choso"));
    const hasNanami = teamNames.some(n => matchesName(n, "Nanami"));
    const hasShoko = teamNames.some(n => matchesName(n, "Shoko"));
    const hasYaga = teamNames.some(n => matchesName(n, "Yaga"));
    const hasMeiMei = teamNames.some(n => matchesName(n, "Mei Mei"));
    const hasSukuna = teamNames.some(n => matchesName(n, "Sukuna"));
    const hasKashimo = teamNames.some(n => matchesName(n, "Kashimo"));
    const hasHiguruma = teamNames.some(n => matchesName(n, "Higuruma"));
    const hasHana = teamNames.some(n => matchesName(n, "Hana"));
    const hasMomo = teamNames.some(n => matchesName(n, "Momo"));
    const hasNoritoshi = teamNames.some(n => matchesName(n, "Noritoshi"));
    const hasMiwa = teamNames.some(n => matchesName(n, "Miwa"));
    const hasGakuganji = teamNames.some(n => matchesName(n, "Gakuganji"));
    const hasUtahime = teamNames.some(n => matchesName(n, "Utahime"));
    const hasKenjaku = teamNames.some(n => matchesName(n, "Kenjaku"));

    // 1. Tokyo First Years
    if (hasYuji && hasMegumi && hasNobara) {
        active.push({ name: "Tokyo First Years", description: "Start with 3 wildcard-cost credits; all damage +5 while all 3 alive." });
    }
    // 2. Gojo's Favourites
    const favCount = [hasYuji, hasMegumi, hasNobara, hasYutaAny].filter(Boolean).length;
    if (favCount >= 2) {
        active.push({ name: "Gojo's Favourites", description: "All damage +5." });
    }
    // 3. Heavenly Restriction
    if (hasToji && hasMaki) {
        active.push({ name: "Heavenly Restriction", description: "Physical skills cost 1 less energy; immune to Weaken." });
    }
    // 4. Special Grade Sorcerers
    const sgCount = [hasGojo, hasYutaAny, hasYuki, hasHakari].filter(Boolean).length;
    if (sgCount >= 2) {
        active.push({ name: "Special Grade Sorcerers", description: "Start with +1 of each colour energy." });
    }
    // 5. Zenin Clan
    const zeninCount = [hasMaki, hasMai, hasNaobito].filter(Boolean).length;
    if (zeninCount >= 2) {
        active.push({ name: "Zenin Clan", description: "Start with 2 red energy; physical damage +10." });
    }
    // 6. Best Friends
    if (hasTodo && hasYuji) {
        active.push({ name: "Best Friends", description: "Yuji physical skills deal +20 damage; Todo stun skills last +1 turn." });
    }
    // 7. Disaster Curses
    const dcCount = [hasJogo, hasHanami, hasMahito].filter(Boolean).length;
    if (dcCount >= 2) {
        active.push({ name: "Disaster Curses", description: "Affliction damage +15; immune to Stun." });
    }
    // 8. Sorcerer Killers
    if (hasToji && hasMiguel) {
        active.push({ name: "Sorcerer Killers", description: "All physical skills are also Piercing; affliction +10." });
    }
    // 9. Death Paintings
    const hasBrother = teamNames.some(n => ["Kechizu", "Eso", "Yuji", "Noritoshi"].some(req => matchesName(n, req) && !matchesName(n, "Choso")));
    if (hasChoso && hasBrother) {
        active.push({ name: "Death Paintings", description: "DoT damage +10 per tick; Choso affliction skills +10." });
    }
    // 10. Black Flash Masters
    const bfCount = [hasYuji, hasNanami, hasHakari, hasTodo].filter(Boolean).length;
    if (bfCount >= 2) {
        active.push({ name: "Black Flash Masters", description: "Start with 2 wildcard-cost credits; skills cost 1 less wildcard." });
    }
    // 11. Tokyo Faculty
    const tfCount = [hasNanami, hasGojo, hasShoko, hasYaga, hasMeiMei].filter(Boolean).length;
    if (tfCount >= 2) {
        active.push({ name: "Tokyo Faculty", description: "All allies start with 15 DR for turn 1." });
    }
    // 12. JJK 0 Unit
    if (hasYutaJJK0 && hasMiguel && hasYaga) {
        active.push({ name: "JJK 0 Unit", description: "Yuta gains 1 blue energy per turn; +10 damage on all Copy skills." });
    }
    // 13. Vessel and Curse
    if (hasYuji && hasSukuna) {
        active.push({ name: "Vessel and Curse", description: "Yuji affliction +20; takes 10 affliction damage per turn." });
    }
    // 14. Culling Game Champions
    const cgCount = [hasKashimo, hasHiguruma, hasHana].filter(Boolean).length;
    if (cgCount >= 3) {
        active.push({ name: "Culling Game Champions", description: "Each living character generates +1 extra energy per turn." });
    }
    // 15. Kyoto Alliance
    const kaCount = [hasTodo, hasMomo, hasNoritoshi, hasMiwa, hasGakuganji, hasUtahime].filter(Boolean).length;
    if (kaCount >= 2) {
        active.push({ name: "Kyoto Alliance", description: "Start with 2 white energy; first draw costs 0 energy." });
    }
    // 16. Blood Manipulation
    if (hasChoso && hasNoritoshi) {
        active.push({ name: "Blood Manipulation", description: "All DoT effects upgraded to affliction type; +5 affliction per tick." });
    }
    // 17. Authentic Mutual Love
    if (hasYutaNormal && hasYutaJJK0) {
        active.push({ name: "Authentic Mutual Love", description: "Cannot be in the same team (lore: Yuta is only one person).", warn: true });
    }
    // 18. Prison Realm
    const hasOtherVillain = teamNames.some(n => isVillain(n) && !matchesName(n, "Kenjaku"));
    if (hasKenjaku && hasOtherVillain) {
        active.push({ name: "Prison Realm", description: "At battle start, one random enemy character is stunned for 1 turn." });
    }

    return active;
}

function buildSynergySummary(chars) {
    const teamNames = chars.map(c => c.name);
    const active = checkJJKSynergies(teamNames);

    const totalCosts = { green: 0, red: 0, blue: 0, white: 0, black: 0 };
    chars.forEach(c => {
        (c.skills || []).forEach(s => {
            (s.energy || []).forEach(e => {
                const key = (e || 'black').toLowerCase();
                totalCosts[key] = (totalCosts[key] || 0) + 1;
            });
        });
    });

    const colorLabel = { green: 'Phys', red: 'Blood', blue: 'Curse', white: 'Strat', black: 'Wild' };
    const entries = Object.entries(totalCosts).filter(([, v]) => v > 0);
    const costPills = entries.map(([k, v]) =>
        `<span class="synergy-pill"><span class="orb orb-${k}" style="width:10px;height:10px"></span> ${colorLabel[k]}: ${v}</span>`
    ).join('');

    let synergyHTML = '';
    let hasWarn = false;

    if (active.length > 0) {
        const synergyPills = active.map(s => {
            if (s.warn) {
                hasWarn = true;
                return `<div class="synergy-pill synergy-pill-warn" title="${esc(s.description)}">⚠️ ${esc(s.name)}: ${esc(s.description)}</div>`;
            }
            return `<div class="synergy-pill synergy-pill-active" title="${esc(s.description)}">⚡ ${esc(s.name)}: ${esc(s.description)}</div>`;
        }).join('');
        synergyHTML = `<div class="active-synergies-title" style="margin-top:10px;font-weight:bold;font-size:12px;color:var(--text)">ACTIVE SYNERGIES:</div><div class="active-synergies-list" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px">${synergyPills}</div>`;
    } else {
        synergyHTML = `<div class="active-synergies-title" style="margin-top:10px;font-weight:bold;font-size:12px;color:var(--muted)">NO ACTIVE SYNERGIES</div>`;
    }

    // Heavy reliance check
    const maxEntry = entries.reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    const totalEnergy = entries.reduce((s, [, v]) => s + v, 0);
    let warning = '';
    if (maxEntry[1] / totalEnergy > 0.5) {
        warning = `<div class="synergy-warn" style="margin-top:8px;color:#ffb703;font-size:12px">⚠️ Heavy ${colorLabel[maxEntry[0]]} reliance — consider diversifying</div>`;
    }

    return `<div class="synergy-bar" style="display:flex;flex-wrap:wrap;gap:6px">${costPills}</div>${synergyHTML}${warning}`;
}

document.getElementById('btn-lock-team').addEventListener('click', () => {
    if (selectedTeamChars.length !== 3) return;
    socket.emit('submit_team', { selected_names: selectedTeamChars });
});


// ── RESULTS ───────────────────────────────────────────────────────────────────
function showResults(players) {
    const recapContainer = document.getElementById('battle-recap-container');
    if (recapContainer) { recapContainer.classList.add('hidden'); }

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

    // Record win/loss for history & render recap
    const myPlayer = b.players.find(p => p.id === myPlayerId);
    const iWon = b.winner_id === myPlayerId;
    const opp = b.players.find(p => p.id !== myPlayerId);
    const myTeamNames = myPlayer && myPlayer.char_data ? myPlayer.char_data.map(c => c.name) : [];
    const mySynergies = myPlayer && myPlayer.active_synergies ? myPlayer.active_synergies : [];
    const difficultyLabel = state.cpu_difficulty ? state.cpu_difficulty.toUpperCase() : '';

    let biggestHit = 0;
    let biggestHitDesc = '—';
    if (b.action_log) {
        const dmgRegex = /(.+?) dealt (\d+)(?: piercing| affliction|)? damage to (.+?)\./i;
        b.action_log.forEach(logLine => {
            const match = logLine.match(dmgRegex);
            if (match) {
                const dmgVal = parseInt(match[2], 10);
                if (dmgVal > biggestHit) {
                    biggestHit = dmgVal;
                    biggestHitDesc = `💥 <strong>${esc(match[1])}</strong> dealt <strong style="color:#ef4444">${dmgVal} damage</strong> to ${esc(match[3])}`;
                }
            }
        });
    }

    const recapContainer = document.getElementById('battle-recap-container');
    if (recapContainer) {
        recapContainer.classList.remove('hidden');

        const synergiesHTML = b.players.map(p => {
            const synList = p.active_synergies && p.active_synergies.length > 0 
                ? p.active_synergies.map(s => `<span class="recap-syn-badge" style="background:rgba(245,158,11,0.15);color:var(--gold);border:1px solid rgba(245,158,11,0.3);padding:2px 6px;border-radius:4px;font-size:10px;margin:2px;display:inline-block;">⚡ ${esc(s)}</span>`).join(' ')
                : '<span class="recap-syn-none" style="color:var(--dim);font-size:11px;">None</span>';
            return `<div class="recap-player-synergies" style="margin-top:6px;font-size:12px;"><strong>${esc(p.name)}:</strong> ${synList}</div>`;
        }).join('');

        const diffBadge = difficultyLabel ? `<span class="recap-diff-badge ${state.cpu_difficulty.toLowerCase()}">${esc(difficultyLabel)}</span>` : '';

        recapContainer.innerHTML = `
            <div class="recap-card" style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:left;margin-top:16px;width:100%;box-sizing:border-box;">
                <div class="recap-title" style="font-family:'Cinzel',serif;font-size:16px;color:var(--gold);border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:10px;font-weight:700;">Battle Recap</div>
                <div class="recap-grid" style="display:grid;grid-template-columns:1fr;gap:6px;font-size:12px;">
                    <div class="recap-item">⏱️ <strong>Turns Played:</strong> ${b.turn_number}</div>
                    ${difficultyLabel ? `<div class="recap-item">🎯 <strong>AI Difficulty:</strong> ${diffBadge}</div>` : ''}
                    <div class="recap-item">⚔️ <strong>Biggest Strike:</strong> ${biggestHitDesc}</div>
                </div>
                <div class="recap-synergies-section" style="margin-top:12px;border-top:1px dashed var(--border);padding-top:10px;">
                    <div class="recap-subtitle" style="font-family:'Cinzel',serif;font-size:13px;color:var(--text);margin-bottom:4px;font-weight:600;">Active Synergies</div>
                    ${synergiesHTML}
                </div>
            </div>
        `;
    }

    recordResult(iWon, opp ? opp.name : '—', myTeamNames, mySynergies, difficultyLabel, b.turn_number, biggestHit);

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
    let me = null;
    if (currentGameState && currentGameState.players) {
        me = currentGameState.players.find(p => p.id === myPlayerId) || currentGameState.players[0];
    }
    const team = me && me.team ? me.team : [];
    if (selectedTeamChars.includes(name)) {
        selectedTeamChars = selectedTeamChars.filter(n => n !== name);
    } else if (selectedTeamChars.length < 3 && !selectedIdentityConflict(name, team)) {
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
            <span style="font-size:11px;color:var(--purple);font-weight:bold">${p.team.length} / ${MAX_TEAM} Drafted</span>
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
    let blackCost = 0;
    
    for (const c of cost) {
        if (c === 'black') {
            blackCost++;
        } else {
            if ((temp[c] || 0) <= 0) return false;
            temp[c]--;
        }
    }
    
    const colors = ['green', 'red', 'blue', 'white'];
    let surplus = 0;
    for (const c of colors) {
        surplus += Math.max(0, temp[c] || 0);
    }
    return surplus >= blackCost;
}

function renderEnergyPool(energy) {
    if (!energy) return '';
    const colors = [
        { key: 'green',  label: 'Phys',   icon: '🟢' },
        { key: 'red',    label: 'Blood',  icon: '🔴' },
        { key: 'blue',   label: 'Curse',  icon: '🔵' },
        { key: 'white',  label: 'Strat',  icon: '⚪' },
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

function renderJjkEnergyCore(energy) {
    if (!energy) return '';
    const colors = [
        { key: 'green', label: 'Phys' },
        { key: 'red', label: 'Blood' },
        { key: 'blue', label: 'Curse' },
        { key: 'white', label: 'Strat' },
    ];
    const orbs = [];
    colors.forEach(({ key }) => {
        const count = Math.max(0, energy[key] || 0);
        for (let i = 0; i < count; i++) orbs.push(key);
    });
    const cap = Math.max(8, orbs.length);
    const slots = [];
    for (let i = 0; i < cap; i++) slots.push(orbs[i] || '');
    const core = `
      <div class="energy-core" aria-label="Cursed energy core">
        <div class="energy-core-label">Energy</div>
        <div class="energy-core-cluster">
          ${slots.map(key => `
            <div class="energy-core-slot">
              <div class="orb ${key ? `orb-${key}` : 'empty'}"></div>
            </div>`).join('')}
        </div>
        <div class="energy-core-count">
          <div class="n">${String(orbs.length).padStart(2, '0')}</div>
          <div class="l">/ ${String(cap).padStart(2, '0')}</div>
        </div>
      </div>`;
    const breakdown = colors.map(({ key, label }) => {
        const count = energy[key] || 0;
        return `
        <div class="energy-chip energy-chip--${key}${count === 0 ? ' energy-chip--empty' : ''}">
          <div class="energy-chip-orb orb orb-${key}"></div>
          <div class="energy-chip-count">${count}</div>
          <div class="energy-chip-label">${label}</div>
        </div>`;
    }).join('');
    return `${core}<div class="energy-core-breakdown">${breakdown}</div>`;
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

function battleCharCardHTML(charData, charState, slot, isMyTeam, isMyTurn, isSolo, opponentEnergy, actedSlots) {
    const pct = Math.max(0, (charState.current_hp / charState.max_hp) * 100);
    const hpColor = pct > 50 ? 'var(--green)' : pct > 25 ? 'var(--gold)' : 'var(--red)';
    const faction = FACTION[charData.name] || 'other';
    const dead = !charState.alive;
    const firstName = charData.name.split(' ')[0];
    // 3-skills-per-turn: has this char already acted this turn?
    const hasActed = isMyTeam && Array.isArray(actedSlots) && actedSlots.includes(slot);

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

    // Intent Telegraphing — glow on enemy chars that can use a damaging skill
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
    if (hasActed) cardClass += ' battle-char--acted';

    // A char is clickable if: alive, my team, my turn, not awaiting target, and hasn't acted yet.
    const clickable = !dead && isMyTeam && isMyTurn && !battleSt.awaitingTarget && !hasActed;
    const asTarget  = isTargetable;

    let dataAttrs = `data-slot="${slot}" data-team="${isMyTeam ? 'mine' : 'opponent'}"`;
    if (clickable)  dataAttrs += ` data-action="select-char"`;
    if (asTarget)   dataAttrs += ` data-action="select-target"`;

    const actedBadge = hasActed ? '<div class="acted-badge">ACTED</div>' : '';
    const charType = charData.role || charData.char_type || 'Specialist';
    const typeIcons = {
        'Burst': 'BR',
        'Control': 'CT',
        'Tank': 'TK',
        'Setup': 'SU',
        'Punisher': 'PN',
        'AoE': 'AO',
        'Attacker': '⚔️',
        'Assassin': '🗡️',
        'Defender': '🛡️',
        'Controller': '🌀',
        'Support': '💊',
        'Specialist': '⚡',
        'Bruiser': '💪'
    };
    const icon = typeIcons[charType] || '⚡';

    return `
    <div class="${cardClass}" ${dataAttrs}>
      <div class="bchar-art ${hasReliablePortrait(charData) ? '' : 'art-missing'}" style="${characterArtStyle(charData)}">
        ${!hasReliablePortrait(charData) ? `<div class="char-art-fallback">${esc(charInitials(charData.name))}</div>` : ''}
        ${dead ? '<div class="death-overlay">✕</div>' : actedBadge}
        <div class="bchar-name">${esc(firstName)} <span class="battle-type-icon" title="${esc(charType)}">${icon}</span></div>
        ${!dead ? cooldownBadgesHTML(charState) : ''}
      </div>
      <div class="hp-bar-wrap">
        <div class="hp-lag-bar" data-lag-hp-char="${esc(charData.name)}" style="width:${pct.toFixed(1)}%"></div>
        <div class="hp-bar" data-hp-char="${esc(charData.name)}" style="width:${pct.toFixed(1)}%;background:${hpColor}"></div>
      </div>
      <div class="hp-text">${charState.current_hp}/${charState.max_hp}</div>
      ${statusBadgesHTML(charState)}
    </div>`;
}

function renderSkillPanel(charData, charState, myEnergy) {
    document.getElementById('skill-panel-char-name').textContent = charData.name;
    const list = document.getElementById('skill-list-battle');

    const drawDefaultSkills = () => {
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

            const baseCd = (!skill.cooldown || skill.cooldown === 'None' || skill.cooldown === '0') ? 'None' : skill.cooldown;

            return `
            <div class="battle-skill ${disabled ? 'disabled' : ''} ${typeClass}"
                 data-skill="${esc(skill.name)}"
                 ${!disabled ? 'data-action="select-skill"' : ''}>
              <div class="skill-top">
                <span class="skill-name">${esc(skill.name)}</span>
                <div class="orbs">${orbsHTML(skill.energy)}</div>
              </div>
              ${skillEffectsHTML(skill)}
              <div class="skill-desc">${esc(skill.description)}</div>
              <div class="skill-meta">
                <span class="skill-tgt-badge">${esc(targetLabel(skill))}</span>
                <span class="skill-cd-badge">🕒 CD: ${esc(baseCd)}</span>
                ${disabled
                    ? `<span class="cost-warn">${disabledReason}</span>`
                    : `<span style="color:var(--green);font-size:10px;font-weight:700">READY</span>`}
              </div>
            </div>`;
        }).join('');

        // Attach clicks
        list.querySelectorAll('[data-action="select-skill"]').forEach(el => {
            el.addEventListener('click', () => {
                const skillName = el.dataset.skill;
                const skill = charData.skills.find(s => s.name === skillName);
                if (!skill) return;

                // Manual Energy Wildcard Allocation
                const numWildcards = (skill.energy || []).filter(c => c === 'black').length;
                if (numWildcards > 0) {
                    startWildcardSelection(skill, numWildcards);
                } else {
                    proceedWithTargeting(skill, null);
                }
            });
        });
    };

    const startWildcardSelection = (skill, numWildcards) => {
        // Calculate available colors
        const tempPool = { ...myEnergy };
        for (const c of skill.energy || []) {
            if (c !== 'black') {
                if (tempPool[c] > 0) tempPool[c]--;
            }
        }

        const chosenColors = [];

        const drawWildcardSelector = () => {
            const neededCount = numWildcards - chosenColors.length;
            if (neededCount <= 0) {
                proceedWithTargeting(skill, chosenColors);
                return;
            }

            const availableColors = [];
            ['green', 'red', 'blue', 'white'].forEach(c => {
                if ((tempPool[c] || 0) > 0) {
                    availableColors.push(c);
                }
            });

            list.innerHTML = `
            <div class="wildcard-selection-panel">
                <h4 class="wildcard-prompt">Manual Energy Control</h4>
                <p class="wildcard-sub">Choose which colored energy pays the wildcard cost (${neededCount} left):</p>
                <div class="wildcard-options">
                    ${availableColors.map(c => `
                        <button class="btn-wildcard-choice choice-${c}" data-color="${c}">
                            <span class="orb orb-${c}"></span>
                            <span class="choice-label">${c.toUpperCase()} (${tempPool[c]} left)</span>
                        </button>
                    `).join('')}
                </div>
                <button id="btn-wildcard-cancel" class="btn-secondary" style="margin-top: 15px; width: 100%; padding: 8px; border-radius: 6px;">Cancel Selection</button>
            </div>`;

            list.querySelectorAll('.btn-wildcard-choice').forEach(btn => {
                btn.addEventListener('click', () => {
                    const color = btn.dataset.color;
                    chosenColors.push(color);
                    tempPool[color]--;
                    drawWildcardSelector();
                });
            });

            document.getElementById('btn-wildcard-cancel').onclick = () => {
                drawDefaultSkills();
            };
        };

        drawWildcardSelector();
    };

    const proceedWithTargeting = (skill, wildcardPays) => {
        battleSt.selectedSkillName = skill.name;
        battleSt.selectedSkillData = skill;
        battleSt.wildcardPays = wildcardPays;

        if (skill.target_type === 'self') {
            submitBattleAction(battleSt.selectedCharSlot, skill.name, myPlayerId, battleSt.selectedCharSlot, wildcardPays);
        } else if (skill.is_aoe) {
            const oppData = currentGameState.battle.players.find(p => p.id !== myPlayerId);
            const targetId = oppData ? oppData.id : myPlayerId;
            submitBattleAction(battleSt.selectedCharSlot, skill.name, targetId, 0, wildcardPays);
        } else if (skill.target_type === 'ally') {
            battleSt.awaitingTarget = true;
            battleSt.targetTeam = 'ally';
            document.getElementById('target-prompt').textContent = 'Select an ally to target';
            document.getElementById('target-prompt').classList.remove('hidden');
            document.getElementById('skill-panel').classList.add('hidden');
            renderBattle(currentGameState);
        } else {
            battleSt.awaitingTarget = true;
            battleSt.targetTeam = 'enemy';
            document.getElementById('target-prompt').textContent = 'Select an enemy to target';
            document.getElementById('target-prompt').classList.remove('hidden');
            document.getElementById('skill-panel').classList.add('hidden');
            renderBattle(currentGameState);
        }
    };

    drawDefaultSkills();
    document.getElementById('skill-panel').classList.remove('hidden');
    document.getElementById('btn-skill-cancel').onclick = resetBattleUI;
    renderBattle(currentGameState);
}

function resetBattleUI() {
    battleSt = { selectedCharSlot: null, selectedSkillName: null,
                 selectedSkillData: null, awaitingTarget: false, targetTeam: null, wildcardPays: null };
    document.getElementById('skill-panel').classList.add('hidden');
    document.getElementById('target-prompt').classList.add('hidden');
    document.querySelectorAll('.battle-char.targetable').forEach(el => el.classList.remove('targetable'));
    if (currentGameState && currentGameState.battle) renderBattle(currentGameState);
}

function submitBattleAction(charSlot, skillName, targetPlayerId, targetSlot, wildcardPays = null) {
    socket.emit('battle_action', {
        char_slot: charSlot,
        skill_name: skillName,
        target_player_id: targetPlayerId,
        target_slot: targetSlot,
        wildcard_pays: wildcardPays,
    });
    resetBattleUI();
}

function attachBattleClickHandlers(isMyTurn, myData, oppData, isSolo) {
    const selectBattleChar = (slot) => {
        if (!isMyTurn || !myData || !myData.char_states[slot]) return;
        if (myData.char_states[slot].stun_turns > 0) {
            toast(`${myData.char_states[slot].char_name} is stunned!`);
            return;
        }
        battleSt.selectedCharSlot = slot;
        battleSt.awaitingTarget = false;
        battleSt.selectedSkillName = null;
        document.getElementById('target-prompt').classList.add('hidden');
        renderSkillPanel(myData.char_data[slot], myData.char_states[slot], myData.energy);
    };
    // My chars (bottom row) — click to select and show skill panel
    document.querySelectorAll('[data-action="select-char"]').forEach(el => {
        el.addEventListener('click', () => {
            selectBattleChar(parseInt(el.dataset.slot, 10));
        });
    });

    document.querySelectorAll('[data-action="select-char-command"]').forEach(el => {
        el.addEventListener('click', () => {
            selectBattleChar(parseInt(el.dataset.slot, 10));
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
                slot,
                battleSt.wildcardPays
            );
        });
    });

}

function battleCommandTrayHTML(isMyTurn, myData, b) {
    if (!myData || b.winner_id) return '';

    const actedSlots = myData.acted_slots || [];
    const canActSlots = new Set((b.can_act_slots || []).map(Number));
    const selectedSlot = battleSt.selectedCharSlot;
    const selectedChar = selectedSlot !== null ? myData.char_data[selectedSlot] : null;

    if (!isMyTurn) {
        return `
        <div class="command-copy">
          <span class="command-kicker">Enemy Turn</span>
          <strong>Hold formation</strong>
          <small>${esc(b.current_player_name)} is choosing an action.</small>
        </div>`;
    }

    if (battleSt.awaitingTarget && battleSt.selectedSkillData) {
        const targetText = battleSt.targetTeam === 'ally' ? 'Choose an ally' : 'Choose an enemy';
        return `
        <div class="command-copy">
          <span class="command-kicker">Targeting</span>
          <strong>${esc(battleSt.selectedSkillName)}</strong>
          <small>${targetText} on the board.</small>
        </div>
        <button class="command-cancel" data-action="command-cancel">Cancel</button>`;
    }

    const fighterButtons = myData.char_data.slice(0, 3).map((cd, slot) => {
        const cs = myData.char_states[slot];
        const dead = !cs || !cs.alive;
        const stunned = cs && cs.stun_turns > 0;
        const acted = actedSlots.includes(slot);
        const canAct = canActSlots.has(slot) && !dead && !stunned && !acted;
        const active = selectedSlot === slot;
        const label = dead ? 'Down' : acted ? 'Acted' : stunned ? 'Stun' : canAct ? 'Ready' : 'Wait';
        return `
        <button class="command-fighter ${active ? 'is-active' : ''}" ${canAct ? `data-action="select-char-command" data-slot="${slot}"` : 'disabled'}>
          <span class="command-avatar ${hasReliablePortrait(cd) ? '' : 'art-missing'}" style="${characterArtStyle(cd)}">
            ${!hasReliablePortrait(cd) ? `<span>${esc(charInitials(cd.name))}</span>` : ''}
          </span>
          <span class="command-name">${esc(cd.name.split(' ')[0])}</span>
          <span class="command-state">${label}</span>
        </button>`;
    }).join('');

    const heading = selectedChar
        ? `<strong>${esc(selectedChar.name)}</strong><small>Pick a skill from the command sheet.</small>`
        : `<strong>Choose a fighter</strong><small>${actedSlots.length}/3 actions used this turn.</small>`;

    return `
    <div class="command-copy">
      <span class="command-kicker">Your Turn</span>
      ${heading}
    </div>
    <div class="command-fighters">${fighterButtons}</div>`;
}

function renderBattleCommandTray(isMyTurn, myData, b) {
    const tray = document.getElementById('battle-command-tray');
    if (!tray) return;
    const html = battleCommandTrayHTML(isMyTurn, myData, b);
    tray.innerHTML = html;
    tray.classList.toggle('hidden', !html);
    tray.classList.toggle('is-targeting', !!battleSt.awaitingTarget);
    tray.classList.toggle('has-sheet-open', !battleSt.awaitingTarget && battleSt.selectedCharSlot !== null);
    tray.querySelectorAll('[data-action="command-cancel"]').forEach(btn => {
        btn.addEventListener('click', resetBattleUI);
    });
}

function renderBattle(state) {
    if (!state || !state.battle) return;
    const b = state.battle;

    const logEl = document.getElementById('battle-log');
    const oldLogLength = logEl && logEl.dataset.lastLength ? parseInt(logEl.dataset.lastLength, 10) : 0;

    // Gather current HP widths and values to animate them smoothly after innerHTML redraw
    const prevHpWidths = {};
    const prevHps = {};
    document.querySelectorAll('[data-hp-char]').forEach(el => {
        const name = el.getAttribute('data-hp-char');
        prevHpWidths[name] = el.style.width || '100%';
        
        const card = el.closest('.battle-char');
        if (card) {
            const hpTextEl = card.querySelector('.hp-text');
            if (hpTextEl) {
                prevHps[name] = parseInt(hpTextEl.textContent.split('/')[0]);
            }
        }
    });
    const isMyTurn = (b.current_player_id === myPlayerId);
    document.body.classList.add('jjk-battle-active');
    document.body.classList.toggle('jjk-opponent-turn', !isMyTurn);

    const myData  = b.players.find(p => p.id === myPlayerId);
    const oppData = b.players.find(p => p.id !== myPlayerId) || myData;
    const isSolo  = b.players.length === 1;

    // 3-skills-per-turn: count how many of my chars have acted
    const myActed = (myData && myData.acted_slots) ? myData.acted_slots.length : 0;
    const myLivingActive = myData
        ? myData.char_states.slice(0, 3).filter(cs => cs.alive && cs.stun_turns === 0).length
        : 0;
    const actedProgress = isMyTurn
        ? `${myActed}/${myLivingActive} acted`
        : '';
    const turnKey = `${b.turn_number}:${b.current_player_id}`;
    if (lastBattleTurnKey && lastBattleTurnKey !== turnKey) {
        showJjkTurnBanner(isMyTurn
            ? { main: 'YOUR ACTION', sub: 'command your sorcerers', eyebrow: `TURN ${String(b.turn_number).padStart(2, '0')}` }
            : { main: 'DOMAIN INTRUSION', sub: 'opponent strikes', eyebrow: `TURN ${String(b.turn_number).padStart(2, '0')}`, variant: 'crimson' });
    }
    lastBattleTurnKey = turnKey;

    // Turn bar
    document.getElementById('battle-turn-badge').textContent = `Turn ${b.turn_number}`;
    document.getElementById('battle-turn-avatar').textContent =
        (b.current_player_name || '?')[0].toUpperCase();
    document.getElementById('battle-turn-name').textContent = b.current_player_name;
    document.getElementById('battle-turn-hint').textContent = isMyTurn
        ? (myActed === 0
            ? 'Your turn — select characters to act'
            : `${actedProgress} — select next or End Turn`)
        : (oppData && oppData.id === -1
            ? `Special Grade CPU (${state.cpu_difficulty ? state.cpu_difficulty.toUpperCase() : 'NORMAL'}) is assessing threats...`
            : `Waiting for ${b.current_player_name}…`);

    // My energy pool
    document.getElementById('my-energy-pool').innerHTML =
        myData ? renderJjkEnergyCore(myData.energy) : '';

    // My active synergies
    const mySynergiesEl = document.getElementById('my-battle-synergies');
    if (mySynergiesEl) {
        mySynergiesEl.innerHTML = myData && myData.active_synergies && myData.active_synergies.length > 0
            ? myData.active_synergies.map(s => `<span class="synergy-pill synergy-pill-active" style="font-size:11px;padding:3px 8px;margin:2px;display:inline-block">⚡ ${esc(s)}</span>`).join('')
            : '';
    }

    // Render opponent team (top) — in solo, same player shown as enemy
    if (oppData) {
        document.getElementById('chars-opponent').innerHTML =
            oppData.char_data.map((cd, i) =>
                battleCharCardHTML(cd, oppData.char_states[i], i, false, isMyTurn, isSolo, oppData.energy, [])
            ).join('');
    }

    // My-turn visual on team label
    const teamMineEl = document.getElementById('team-mine');
    if (teamMineEl) {
        if (isMyTurn) teamMineEl.classList.add('is-my-turn');
        else teamMineEl.classList.remove('is-my-turn');
    }

    // Render my team (bottom) — pass acted_slots so acted chars show badge
    if (myData) {
        const myActedSlots = myData.acted_slots || [];
        document.getElementById('chars-mine').innerHTML =
            myData.char_data.map((cd, i) =>
                battleCharCardHTML(cd, myData.char_states[i], i, true, isMyTurn, isSolo, null, myActedSlots)
            ).join('');
    }

    // Hyper-premium HP drain and lag animations + hit/death detection
    document.querySelectorAll('[data-hp-char]').forEach(el => {
        const name = el.getAttribute('data-hp-char');
        const targetWidth = el.style.width || '100%';
        const lagEl = el.closest('.hp-bar-wrap')?.querySelector('.hp-lag-bar');
        const card = el.closest('.battle-char');
        
        // Find new HP and alive state
        let newHp = 100;
        let isAlive = true;
        if (card) {
            const hpTextEl = card.querySelector('.hp-text');
            if (hpTextEl) {
                newHp = parseInt(hpTextEl.textContent.split('/')[0]) || 0;
            }
            isAlive = !card.classList.contains('battle-char--dead');
        }

        const oldWidth = prevHpWidths[name];
        const oldHp = prevHps[name];

        if (oldWidth !== undefined && oldHp !== undefined) {
            // Apply smooth HP transition and lag bar delay
            el.style.transition = 'none';
            el.style.width = oldWidth;
            if (lagEl) {
                lagEl.style.transition = 'none';
                lagEl.style.width = oldWidth;
            }

            // Force reflow
            void el.offsetHeight;

            // Restore transition and animate
            el.style.transition = '';
            requestAnimationFrame(() => {
                el.style.width = targetWidth;
            });

            if (lagEl) {
                setTimeout(() => {
                    lagEl.style.transition = '';
                    lagEl.style.width = targetWidth;
                }, 400);
            }

            // Compare HP to detect damage and trigger hit/death effects
            if (newHp < oldHp) {
                // Determine if this is an affliction hit from log messages
                const newMsgs = (b.action_log || []).slice(oldLogLength);
                const isAffliction = newMsgs.some(msg => {
                    const m = msg.toLowerCase();
                    return (m.includes('takes') || m.includes('affliction')) && m.includes(name.toLowerCase().split(' ')[0]);
                });

                if (card) {
                    const hitClass = isAffliction ? 'battle-char--hit-afflict' : 'battle-char--hit';
                    card.classList.add(hitClass);
                    card.addEventListener('animationend', () => card.classList.remove(hitClass), { once: true });
                }

                // Screen shake on major hits (35+ damage)
                const diff = oldHp - newHp;
                if (diff >= 35 && window.JJK) {
                    window.JJK.shake(400);
                }
            }

            // Death animation
            if (oldHp > 0 && newHp <= 0 && card) {
                card.classList.remove('battle-char--dead');
                const deathOverlay = card.querySelector('.death-overlay');
                if (deathOverlay) {
                    deathOverlay.style.display = 'none';
                }

                card.classList.add('battle-char--dying');

                setTimeout(() => {
                    card.classList.remove('battle-char--dying');
                    card.classList.add('battle-char--dead');
                    if (deathOverlay) {
                        deathOverlay.style.display = '';
                    }
                }, 600);
            }
        }
    });

    // End Turn button — show when it's my turn and I've acted at least once
    let endTurnBtn = document.getElementById('btn-battle-end-turn');
    if (!endTurnBtn) {
        endTurnBtn = document.createElement('button');
        endTurnBtn.id = 'btn-battle-end-turn';
        endTurnBtn.className = 'btn-end-turn';
        endTurnBtn.textContent = 'End Turn';
        endTurnBtn.addEventListener('click', () => {
            socket.emit('battle_end_turn');
            resetBattleUI();
        });
        // Insert into the turn indicator bar at the top for maximum mobile visibility!
        const turnBar = document.getElementById('battle-turn-bar');
        if (turnBar) turnBar.appendChild(endTurnBtn);
    }
    const canEnd = b.can_end_turn && isMyTurn && !b.winner_id;
    endTurnBtn.style.display = canEnd ? 'block' : 'none';

    // Turn bar pulse — highlight when it's my turn
    const turnBar = document.getElementById('battle-turn-bar');
    if (turnBar) {
        if (isMyTurn) turnBar.classList.add('my-turn');
        else turnBar.classList.remove('my-turn');
    }

    // Action log — color-coded by message type, with per-char hit animations
    const currentLogLength = (b.action_log || []).length;
    if (logEl) logEl.dataset.lastLength = currentLogLength;

    if (currentLogLength > oldLogLength) {
        // Collect all new messages since last render
        const newMsgs = (b.action_log || []).slice(oldLogLength);

        // Helper: find a battle-char card by character name
        function findCharCard(charName) {
            const first = (charName || '').split(' ')[0];
            return document.querySelector(`.bchar-name`) &&
                [...document.querySelectorAll('.bchar-name')]
                    .find(el => el.textContent.trim() === first)
                    ?.closest('.battle-char');
        }

        // Parse each new message for hit animations + floating numbers
        newMsgs.forEach(msg => {
            const m = msg.toLowerCase();

            // Pattern: "X dealt N damage to Y."
            let match = msg.match(/dealt (\d+) damage to (.+?)\./i);
            if (match) {
                const [, amt, tgt] = match;
                const card = findCharCard(tgt);
                if (window.JJK && card) window.JJK.hitChar(card, parseInt(amt), 'dmg');
            }
            // Pattern: "X dealt N piercing damage to Y."
            match = msg.match(/dealt (\d+) piercing damage to (.+?)\./i);
            if (match) {
                const [, amt, tgt] = match;
                const card = findCharCard(tgt);
                if (window.JJK && card) window.JJK.hitChar(card, parseInt(amt), 'pierce');
            }
            // Pattern: "X dealt N affliction damage to Y."
            match = msg.match(/dealt (\d+) affliction damage to (.+?)\./i);
            if (match) {
                const [, amt, tgt] = match;
                const card = findCharCard(tgt);
                if (window.JJK && card) window.JJK.hitChar(card, parseInt(amt), 'afflict');
            }
            // Pattern: "Y takes N damage from a cursed effect." (DoT)
            match = msg.match(/^(.+?) takes (\d+) damage/i);
            if (match) {
                const [, tgt, amt] = match;
                const card = findCharCard(tgt);
                if (window.JJK && card) window.JJK.hitChar(card, parseInt(amt), 'afflict');
            }
            // Pattern: "Y restored N HP."
            match = msg.match(/^(.+?) restored (\d+) HP/i);
            if (match) {
                const [, tgt, amt] = match;
                const card = findCharCard(tgt);
                if (window.JJK && card) window.JJK.hitChar(card, parseInt(amt), 'heal');
            }
            // Pattern: "Y is stunned for N turn(s)."
            if (m.includes('is stunned')) {
                const match = msg.match(/^(.+?) is stunned/i);
                if (match) {
                    const [, tgt] = match;
                    const card = findCharCard(tgt);
                    if (window.JJK && card) window.JJK.hitChar(card, 'STUN', 'stun');
                }
            }
            // Pattern: "Y is invulnerable!"
            if (m.includes('is invulnerable!')) {
                const tgt = msg.replace(/is invulnerable!.*/i, '').trim();
                const card = findCharCard(tgt);
                if (window.JJK && card) window.JJK.hitChar(card, 0, 'miss');
            }
        });

        // Global effects based on latest message
        const latestAction = b.action_log[b.action_log.length - 1];
        const lowerAction = latestAction.toLowerCase();

        if (lowerAction.includes('ultimate') || lowerAction.includes('unlimited void') || lowerAction.includes('malevolent shrine') || lowerAction.includes('domain expansion')) {
            if (window.JJK) {
                window.JJK.flash();
                window.JJK.shake(1000);
                window.JJK.domainExpansion();
                if (window.JJK.AudioBus) window.JJK.AudioBus.ult();
            }
        } else if (lowerAction.includes('swapped') || lowerAction.includes('tags in')) {
            if (window.JJK && window.JJK.AudioBus) window.JJK.AudioBus.keep();
        } else if (lowerAction.includes('damage') || lowerAction.includes('attacks') || lowerAction.includes('hits')) {
            if (window.JJK) {
                window.JJK.shake(300);
                if (window.JJK.AudioBus) window.JJK.AudioBus.draw();
            }
        } else if (lowerAction.includes('restored') || lowerAction.includes('healed') || lowerAction.includes('shield')) {
            if (window.JJK && window.JJK.AudioBus) window.JJK.AudioBus.pass();
        }
    }

    const maxLogs = 10;
    const displayedLogs = (b.action_log || []).slice().reverse().slice(0, maxLogs);
    const logCount = displayedLogs.length;

    logEl.innerHTML = displayedLogs.map((msg, i) => {
        let cls = 'log-entry';
        const m = msg.toLowerCase();
        if (m.includes('defeated'))                          cls += ' log-defeat';
        else if (m.includes('damage'))                       cls += ' log-damage';
        else if (m.includes('restored') || m.includes('healed')) cls += ' log-heal';
        else if (m.includes('stunned') || m.includes('invulnerable') || m.includes('cursed') || m.includes('reduction')) cls += ' log-status';
        if (i === 0)                                         cls += ' log-latest';
        
        // Stagger delay: oldest first (cascades up to the newest message)
        const delay = (logCount - 1 - i) * 80;
        return `<div class="${cls}" style="animation-delay: ${delay}ms;">${esc(msg)}</div>`;
    }).join('');

    renderBattleCommandTray(isMyTurn, myData, b);
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
        if (!char && currentGameState.last_drawn_choices) {
            const found = (currentGameState.last_drawn_choices || []).find(c => c.name === name);
            if (found) char = found;
        }
    }
    if (!char) return;

    document.getElementById('char-modal-sheet').innerHTML = `
        <div style="display:flex;justify-content:flex-end;padding:12px 14px 0">
            <button class="icon-btn" id="btn-modal-close" aria-label="Close">✕</button>
        </div>
        ${charCardHTML(char)}`;
    const modalFrame = document.querySelector('#char-modal-sheet .char-card-frame');
    if (modalFrame && window.JJK) window.JJK.tilt(modalFrame);
    document.getElementById('char-modal').classList.remove('hidden');
    document.getElementById('scrim').classList.remove('hidden');
    document.getElementById('btn-modal-close').addEventListener('click', () => {
        document.getElementById('char-modal').classList.add('hidden');
        if (!document.getElementById('teams-panel').classList.contains('open'))
            document.getElementById('scrim').classList.add('hidden');
    });
}

// ── HYPER-PREMIUM AAA EFFECTS & CONTROLS BINDING ────────────────────────────

// 1. Audio Mute/Unmute Toggle
const sfxBtn = document.getElementById('btn-sfx-toggle');
if (sfxBtn) {
    sfxBtn.addEventListener('click', () => {
        if (window.JJK && window.JJK.AudioBus) {
            const currentlyMuted = sfxBtn.classList.contains('muted');
            if (currentlyMuted) {
                sfxBtn.classList.remove('muted');
                sfxBtn.textContent = '🔊';
                window.JJK.AudioBus.mute(false);
                window.JJK.AudioBus.click();
                toast('Audio unmuted! Immerse in the domain.');
            } else {
                sfxBtn.classList.add('muted');
                sfxBtn.textContent = '🔇';
                window.JJK.AudioBus.mute(true);
                toast('Audio muted.');
            }
        }
    });
}

// 2. Spawn Purple Embers on Lobby Screen
const setupScreen = document.getElementById('setup');
if (setupScreen && window.JJK) {
    const embersContainer = document.createElement('div');
    embersContainer.className = 'embers';
    setupScreen.appendChild(embersContainer);
    window.JJK.spawnEmbers(embersContainer, 16);
}

// Energy legend toggle
const energyLegendToggle = document.getElementById('energy-legend-toggle');
const energyLegendEl = document.getElementById('energy-legend');
if (energyLegendToggle && energyLegendEl) {
    energyLegendToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        energyLegendEl.classList.toggle('hidden');
    });
    // Close on outside click
    document.addEventListener('click', () => energyLegendEl.classList.add('hidden'));
}

// 3. Delegate Sound Effects across all interactive elements
document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .btn, .face-down, .mini-card, .sel-card');
    if (target && window.JJK && window.JJK.AudioBus) {
        if (target.id !== 'btn-sfx-toggle') {
            window.JJK.AudioBus.click();
        }
    }
});

let lastHoverTime = 0;
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('button, .btn, .face-down, .mini-card, .sel-card, .char-card, .battle-char');
    if (target && window.JJK && window.JJK.AudioBus) {
        const now = Date.now();
        if (now - lastHoverTime > 120) {
            window.JJK.AudioBus.hover();
            lastHoverTime = now;
        }
    }
});
