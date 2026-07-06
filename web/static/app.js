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
    hydrateV2LobbyFields();
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

const V2_STITCH_PORTRAITS = {
    yuji_itadori: '/static/assets/portraits/yuji-black-flash.svg',
    nobara_kugisaki: '/static/assets/portraits/yuta-okkotsu-jjk-0.svg',
    megumi_fushiguro: '/static/assets/portraits/gojo-young.svg',
    satoru_gojo: '/static/assets/portraits/gojo-unsealed.svg',
    ryomen_sukuna: '/static/assets/portraits/sukuna-heian-era.svg',
    mahito: '/static/assets/portraits/kenjaku.svg',
    aoi_todo: '/static/assets/portraits/yuji-awakened.svg',
    maki_zenin: '/static/assets/portraits/uraume.svg',
    yuta_okkotsu: '/static/assets/portraits/yuta-okkotsu-sendai.svg',
    hiromi_higuruma: '/static/assets/portraits/hiromi-higuruma.svg',
};

const V2_STITCH_FALLBACK_PORTRAITS = Object.values(V2_STITCH_PORTRAITS);

function v2CatalogCharacter(character) {
    const key = character?.character_id || character?.id;
    return BATTLE_V2_STARTER_ROSTER?.[key] || null;
}

function v2PortraitUrl(character) {
    const characterId = character?.character_id || character?.id;
    if (V2_STITCH_PORTRAITS[characterId]) return V2_STITCH_PORTRAITS[characterId];
    const seed = String(characterId || character?.name || '').split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
    return V2_STITCH_FALLBACK_PORTRAITS[seed % V2_STITCH_FALLBACK_PORTRAITS.length] || '';
}

function v2PortraitStyle(character) {
    const url = v2PortraitUrl(character);
    return url ? `background-image:url('${esc(url)}')` : '';
}

function v2PortraitHTML(character, className = 'stitch-archive-portrait') {
    const url = v2PortraitUrl(character);
    return `<div class="${className}" style="${url ? `background-image:url('${esc(url)}')` : ''}"><span>${esc(charInitials(character?.name))}</span></div>`;
}

function v2ArchiveImageHTML(character, className = 'w-full h-full object-cover') {
    const url = v2PortraitUrl(character);
    if (!url) {
        return `<div class="${className} bg-surface-container-highest flex items-center justify-center font-tactical-data text-primary">${esc(charInitials(character?.name))}</div>`;
    }
    return `<img class="${className}" data-alt="${esc(character?.name || 'Stitch arena fighter portrait')}" src="${esc(url)}"/>`;
}

function v2EnergyOrbHTML(color, className = 'w-3 h-3', count = null) {
    const tone = {
        red: 'bg-blood-crimson shadow-[0_0_8px_rgba(239,68,68,0.65)]',
        blue: 'bg-energy-cyan shadow-[0_0_8px_rgba(34,211,238,0.65)]',
        green: 'bg-primary shadow-[0_0_8px_rgba(210,187,255,0.65)]',
        white: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.65)]',
        black: 'bg-surface-variant border border-outline-variant/60',
    }[color] || 'bg-surface-variant border border-outline-variant/60';
    const label = count === null ? '' : `<span class="absolute inset-0 flex items-center justify-center font-tactical-data text-[9px] text-obsidian-base">${esc(count)}</span>`;
    return `<div class="${className} energy-orb ${tone} flex-shrink-0 relative overflow-hidden" title="${esc(color)}">${label}</div>`;
}

function v2EnergyOrbRowHTML(cost, maxSlots = 3) {
    const orbs = (cost || []).slice(0, maxSlots).map(color => v2EnergyOrbHTML(color)).join('');
    const empty = Array.from({ length: Math.max(0, maxSlots - (cost || []).length) }, () =>
        '<div class="w-3 h-3 rounded-full bg-surface-variant flex-shrink-0"></div>'
    ).join('');
    return `${orbs}${empty}`;
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

// ── BATTLE V2 ARENA ─────────────────────────────────────────────────────────
const v2State = {
    state: null,
    uiScreen: 'lobby',
    selectedCasterSlot: null,
    selectedSkillId: null,
    actions: [],
    wildcardPays: {},
    queueSubmitting: false,
    convertSource: 'green',
    convertTarget: 'red',
    playerTeam: ['yuji_itadori', 'nobara_kugisaki', 'megumi_fushiguro'],
    enemyTeam: ['satoru_gojo', 'ryomen_sukuna', 'mahito'],
    matchMode: 'cpu',
    lobbyStatus: null,
};

function setV2UiScreen(screen) {
    v2State.uiScreen = screen === 'team' ? 'team' : 'lobby';
}

function v2StoredValue(key, fallback = '') {
    try {
        return localStorage.getItem(key) || fallback;
    } catch (error) {
        return fallback;
    }
}

function v2SetStoredValue(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        // Storage can be unavailable in private contexts; the match can still start.
    }
}

function v2FieldValue(primaryId, fallbackId, fallbackValue = '') {
    const primary = document.getElementById(primaryId);
    const fallback = document.getElementById(fallbackId);
    return (primary?.value || fallback?.value || fallbackValue || '').trim();
}

function v2SyncFieldPair(primaryId, fallbackId, value) {
    [primaryId, fallbackId].forEach(id => {
        const field = document.getElementById(id);
        if (field && field.value !== value) field.value = value;
    });
}

function hydrateV2LobbyFields() {
    const name = v2FieldValue('v2-player-name', 'player-name', v2StoredValue('jjk_player_name', 'Player')) || 'Player';
    const room = v2FieldValue('v2-room-id', 'room-id', v2StoredValue('jjk_room_id', 'lobby')) || 'lobby';
    v2SyncFieldPair('v2-player-name', 'player-name', name);
    v2SyncFieldPair('v2-room-id', 'room-id', room);
    return { name, room };
}

function v2ReadLobbyFields() {
    const name = v2FieldValue('v2-player-name', 'player-name', 'Player') || 'Player';
    const room = v2FieldValue('v2-room-id', 'room-id', 'lobby') || 'lobby';
    v2SyncFieldPair('v2-player-name', 'player-name', name);
    v2SyncFieldPair('v2-room-id', 'room-id', room);
    v2SetStoredValue('jjk_player_name', name);
    v2SetStoredValue('jjk_room_id', room);
    return { name, room };
}

function renderV2BottomNav() {
    const active = v2State.state ? 'arena' : (v2State.uiScreen === 'team' ? 'roster' : 'lobby');
    document.querySelectorAll('#v2-bottom-nav [data-v2-nav]').forEach(button => {
        const isActive = button.dataset.v2Nav === active;
        button.classList.toggle('text-primary', isActive);
        button.classList.toggle('text-on-surface-variant', !isActive);
    });
}

function v2PlayerIds() {
    const ids = v2State.state ? Object.keys(v2State.state.players || {}) : [];
    const mine = ids.includes(myPlayerId) ? myPlayerId : ids[0];
    const enemy = ids.find(id => id !== mine);
    return { mine, enemy };
}

function v2BaseSkillFor(characterId, skillId) {
    const character = v2State.state?.skill_catalog?.[characterId];
    return (character?.skills || []).find(skill => skill.id === skillId);
}

function v2SkillFor(characterId, skillId, characterState = null) {
    const replacementId = characterState?.skill_replacements?.[skillId];
    const effective = replacementId ? v2BaseSkillFor(characterId, replacementId) : null;
    const base = v2BaseSkillFor(characterId, skillId);
    const skill = effective || base;
    if (!skill) return null;
    return {
        ...skill,
        original_slot_id: skillId,
        effective_skill_id: skill.id,
        replaced_from: replacementId && effective ? skillId : null,
    };
}

function v2SkillsFor(characterState) {
    const characterId = characterState?.character_id;
    return (v2State.state?.skill_catalog?.[characterId]?.skills || []).map(skill =>
        v2SkillFor(characterId, skill.id, characterState) || skill
    );
}

function v2ReplacementDebugEntries(player) {
    const entries = [];
    (player?.team || []).forEach((character, slot) => {
        Object.entries(character.skill_replacements || {}).forEach(([baseSkillId, replacementSkillId]) => {
            const rendered = v2SkillFor(character.character_id, baseSkillId, character);
            const ok = rendered?.effective_skill_id === replacementSkillId && rendered?.original_slot_id === baseSkillId;
            console.assert(ok, `Battle v2 replacement skill did not render in original slot: ${baseSkillId} -> ${replacementSkillId}`);
            entries.push({
                slot,
                character_id: character.character_id,
                base_skill_id: baseSkillId,
                replacement_skill_id: replacementSkillId,
                rendered_skill_id: rendered?.effective_skill_id || null,
                ok,
            });
        });
    });
    return entries;
}

function v2AliveCount(player) {
    return (player?.team || []).filter(character => character.alive).length;
}

function v2CurrentPlayer() {
    const { mine } = v2PlayerIds();
    return v2State.state?.players?.[mine] || null;
}

function v2IsMyTurn() {
    const { mine } = v2PlayerIds();
    return v2State.state?.turn_player_id === mine && v2State.state?.phase !== 'finished';
}

function v2ControlsLocked() {
    const me = v2CurrentPlayer();
    return !v2IsMyTurn() || !!me?.queue_confirmed || !!v2State.queueSubmitting;
}

function v2TargetLabel(skill) {
    const rule = skill?.target_rule || {};
    const count = rule.max_targets && rule.max_targets > 1 ? `${rule.min_targets}-${rule.max_targets}` : '1';
    switch (rule.kind) {
        case 'enemy': return `Enemy x${count}`;
        case 'enemy_team': return 'Enemy team';
        case 'ally': return rule.allow_self ? `Ally/self x${count}` : `Ally x${count}`;
        case 'ally_team': return 'Ally team';
        case 'self': return 'Self';
        default: return rule.kind ? String(rule.kind) : 'Target';
    }
}

function v2EffectLabel(effect) {
    const amount = Number(effect.amount || 0);
    const duration = effect.duration ? ` ${effect.duration}t` : '';
    if (effect.type === 'damage') {
        const damageType = effect.damage_type ? ` ${effect.damage_type}` : '';
        const bonus = effect.payload?.bonus_amount ? ` (+${effect.payload.bonus_amount})` : '';
        return `${amount}${damageType}${bonus}`;
    }
    if (effect.type === 'heal') return `Heal ${amount}`;
    if (effect.type === 'health_steal') return `Steal ${amount}`;
    if (effect.type === 'apply_status' || effect.type === 'status') {
        const statusName = effect.payload?.name || effect.status || 'Status';
        const details = v2StatusPayloadParts(effect).slice(0, 2);
        return `${statusName}${duration}${details.length ? `: ${details.join(', ')}` : ''}`;
    }
    if (effect.type === 'remove_status') return `Remove ${effect.status || 'status'}`;
    if (effect.type === 'cleanse') return 'Cleanse';
    if (effect.type === 'dispel') return 'Dispel';
    return effect.type ? `${effect.type}${amount ? ` ${amount}` : ''}${duration}` : '';
}

function v2StatusPayloadParts(effect) {
    const payload = effect?.payload || {};
    const parts = [];
    const stunClasses = payload.stun_classes || [];
    if (Array.isArray(stunClasses) && stunClasses.length) parts.push(`stun ${stunClasses.join('/')}`);
    if (payload.invulnerable) parts.push('invulnerable');
    if (payload.ignore_stun) parts.push('ignore stun');
    if (payload.domain) parts.push('domain');
    if (payload.anti_domain) parts.push('anti-domain');
    if (payload.punish_non_domain) parts.push('punish non-domain');
    if (payload.soul_skills_sure_hit) parts.push('soul sure-hit');
    if (payload.damage_reduction) parts.push(`${payload.damage_reduction} DR`);
    if (payload.destructible_defense) parts.push(`${payload.destructible_defense} shield`);
    if (payload.damage_output_delta) parts.push(`${payload.damage_output_delta > 0 ? '+' : ''}${payload.damage_output_delta} damage`);
    if (payload.healing_received_delta) parts.push(`${payload.healing_received_delta > 0 ? '+' : ''}${payload.healing_received_delta} healing`);
    if (payload.black_cost_delta) parts.push(`${payload.black_cost_delta > 0 ? '+' : ''}${payload.black_cost_delta} black cost`);
    if (payload.damage_bonus) parts.push(`+${payload.damage_bonus} next damage`);
    if (payload.turn_end_damage) {
        const damageType = payload.turn_end_damage_type ? ` ${payload.turn_end_damage_type}` : '';
        parts.push(`${payload.turn_end_damage}${damageType}/turn`);
    }
    if (payload.condition_status) parts.push(`if ${payload.condition_status}`);
    if (payload.counter) parts.push('counter');
    if (payload.reflect) parts.push('reflect');
    if (payload.skill_replacements) parts.push('replaces skill');
    return parts;
}

function v2EffectChipsHTML(skill) {
    const effects = (skill.effects || []).map(v2EffectLabel).filter(Boolean);
    if (!effects.length) return '';
    return `<div class="v2-effect-row">${effects.map(label =>
        `<span class="v2-effect-chip">${esc(label)}</span>`
    ).join('')}</div>`;
}

function v2ActionTargetLabel(action) {
    const targetPlayer = v2State.state?.players?.[action.target_player_id];
    const names = (action.target_slots && action.target_slots.length ? action.target_slots : [action.target_slot])
        .filter(slot => slot !== null && slot !== undefined)
        .map(slot => targetPlayer?.team?.[slot]?.name)
        .filter(Boolean);
    if (names.length) return names.join(', ');
    return targetPlayer?.name || action.target_player_id || 'target';
}

function v2SelectedSkill() {
    const { mine } = v2PlayerIds();
    const me = v2State.state?.players?.[mine];
    const caster = me?.team?.[v2State.selectedCasterSlot];
    return caster ? v2SkillFor(caster.character_id, v2State.selectedSkillId, caster) : null;
}

function v2LivingSlots(player) {
    return (player?.team || [])
        .map((character, slot) => character.alive ? slot : null)
        .filter(slot => slot !== null);
}

function v2QueuedSlots() {
    return new Set(v2State.actions.map(action => Number(action.caster_slot)));
}

function v2QueueLimit(player) {
    return v2LivingSlots(player).length;
}

function v2NextOpenCasterSlot(player, preferredSlot = null) {
    const queued = v2QueuedSlots();
    if (preferredSlot !== null && preferredSlot !== undefined) {
        const preferred = player?.team?.[preferredSlot];
        if (preferred?.alive && !queued.has(Number(preferredSlot))) return Number(preferredSlot);
    }
    return (player?.team || []).findIndex((character, slot) => character.alive && !queued.has(slot));
}

function v2EnsureSelectedCaster(me, isMyTurn) {
    if (!isMyTurn || !me || v2ControlsLocked()) return;
    const current = me.team?.[v2State.selectedCasterSlot];
    const currentQueued = v2QueuedSlots().has(Number(v2State.selectedCasterSlot));
    if (current?.alive && !currentQueued) return;
    const nextSlot = v2NextOpenCasterSlot(me);
    v2State.selectedCasterSlot = nextSlot >= 0 ? nextSlot : null;
    v2State.selectedSkillId = null;
}

function v2HasRequiredStatus(character, skill) {
    const required = skill?.target_rule?.required_status;
    if (!required) return true;
    return (character?.statuses || []).some(status => status.id === required || status.name === required);
}

function v2CanTargetCharacter(character, slot, isMine, isTurn) {
    if (!isTurn || v2ControlsLocked() || !v2State.selectedSkillId || !character?.alive) return false;
    const skill = v2SelectedSkill();
    const kind = skill?.target_rule?.kind || 'enemy';
    if (!v2HasRequiredStatus(character, skill)) return false;
    if (kind === 'enemy') return !isMine;
    if (kind === 'ally') {
        if (!isMine) return false;
        return skill.target_rule?.allow_self || slot !== v2State.selectedCasterSlot;
    }
    return false;
}

function v2TeamTargetSlots(player, skill) {
    const slots = v2LivingSlots(player).filter(slot => v2HasRequiredStatus(player?.team?.[slot], skill));
    const maxTargets = skill?.target_rule?.max_targets || slots.length;
    return slots.slice(0, maxTargets);
}

function v2TeamSkillHasTargets(player, skill) {
    const rule = skill?.target_rule || {};
    if (rule.kind !== 'enemy_team' && rule.kind !== 'ally_team') return true;
    return v2TeamTargetSlots(player, skill).length >= (rule.min_targets || 1);
}

function v2RosterEntries() {
    return Object.values(BATTLE_V2_STARTER_ROSTER || {});
}

function v2PickerButtonHTML(character, teamKey) {
    const selected = v2State[teamKey].includes(character.id);
    const locked = !selected && v2State[teamKey].length >= 3;
    const selectedIndex = v2State[teamKey].indexOf(character.id);
    const role = character.role || 'Fighter';
    const state = character.state || 'Cursed Energy';
    const costPreview = (character.skills || [])
        .flatMap(skill => skill.cost || [])
        .filter(Boolean)
        .slice(0, 3);
    const cardClass = locked
        ? 'relative rounded-lg overflow-hidden blade-cut border border-error-container bg-surface-container-highest flex flex-col h-[260px] cursor-not-allowed opacity-60'
        : selected
            ? (selectedIndex === 0
                ? 'relative rounded-lg overflow-hidden blade-cut shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-prestige-gold holo-shimmer bg-charcoal-plate flex flex-col h-[260px] cursor-pointer group'
                : 'relative rounded-lg overflow-hidden blade-cut shadow-[0_0_20px_rgba(168,85,247,0.3)] border-2 border-energy-purple holo-shimmer bg-charcoal-plate flex flex-col h-[260px] cursor-pointer group')
            : 'relative rounded-lg overflow-hidden blade-cut border border-outline-variant bg-charcoal-plate flex flex-col h-[260px] cursor-pointer group hover:border-outline transition-colors';
    const accent = selectedIndex === 0 ? 'text-prestige-gold border-prestige-gold/50' : selected ? 'text-energy-purple border-energy-purple/50' : 'text-on-surface-variant border-outline/30';
    const icon = selected ? (selectedIndex === 0 ? 'bolt' : 'swords') : 'shield';
    const imageClass = locked
        ? 'absolute inset-0 w-full h-full object-cover grayscale mix-blend-luminosity'
        : selected
            ? 'absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
            : 'absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100';
    return `
      <button class="${cardClass}" type="button" data-v2-pick-team="${teamKey}" data-character-id="${esc(character.id)}" aria-pressed="${selected ? 'true' : 'false'}" ${locked ? 'disabled' : ''}>
        <div class="absolute inset-0 bg-gradient-to-t from-obsidian-base ${locked ? 'via-error-container/20' : 'via-transparent'} to-transparent z-10"></div>
        <div class="absolute top-2 right-2 z-20 flex flex-col gap-1">
          <div class="w-6 h-6 bg-surface-container/80 backdrop-blur-sm border ${accent} rounded flex items-center justify-center">
            <span class="material-symbols-outlined text-[14px] ${accent.split(' ')[0]}">${icon}</span>
          </div>
        </div>
        ${locked ? `
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSJ0cmFuc3BhcmVudCI+PC9yZWN0Pgo8cGF0aCBkPSJNMCA4TDggMFoiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iLjIiPjwvcGF0aD4KPC9zdmc+')] z-20 pointer-events-none"></div>
        <div class="absolute inset-0 z-30 flex items-center justify-center">
          <div class="bg-surface-container/90 backdrop-blur-sm px-3 py-1.5 rounded blade-cut border border-blood-crimson flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px] text-blood-crimson">lock</span>
            <span class="font-label-micro text-label-micro text-blood-crimson">SQUAD FULL</span>
          </div>
        </div>` : ''}
        <div class="flex-1 relative">
          ${v2ArchiveImageHTML(character, imageClass)}
        </div>
        <div class="relative z-20 p-3 ${locked ? 'bg-surface-container-highest border-t border-white/5' : 'bg-charcoal-plate/90 backdrop-blur-md border-t border-white/10'} flex flex-col gap-2">
          <div class="flex justify-between items-center gap-2">
            <span class="font-tactical-data text-[12px] font-bold ${selected ? accent.split(' ')[0] : 'text-on-surface'} uppercase tracking-wider truncate">${esc(character.name)}</span>
            <span class="font-label-micro text-label-micro text-on-surface-variant">${selected ? `P${selectedIndex + 1}` : ''}</span>
          </div>
          <div class="font-tactical-data text-[10px] text-on-surface-variant truncate">${esc(role.split('/')[0].trim())} / ${esc(state)}</div>
          <div class="flex items-center gap-1 ${locked ? 'opacity-50' : ''}">${v2EnergyOrbRowHTML(costPreview)}</div>
        </div>
        ${selected ? '<div class="absolute inset-0 border-2 border-prestige-gold/50 z-30 pointer-events-none rounded-lg mix-blend-overlay"></div>' : ''}
      </button>`;
}

function renderV2Picker() {
    const playerPicker = document.getElementById('v2-player-picker');
    const enemyPicker = document.getElementById('v2-enemy-picker');
    if (!playerPicker || !enemyPicker) return;
    const entries = v2RosterEntries();
    const byId = Object.fromEntries(entries.map(character => [character.id, character]));
    document.getElementById('v2-picker')?.classList.toggle('pvp', v2State.matchMode === 'pvp');
    document.querySelectorAll('[data-v2-mode]').forEach(button => {
        const active = button.dataset.v2Mode === v2State.matchMode;
        button.className = active
            ? 'h-10 rounded-lg border border-primary/30 bg-primary-container/20 text-primary font-tactical-data text-[11px] uppercase'
            : 'h-10 rounded-lg border border-outline-variant bg-surface-container/60 text-on-surface-variant font-tactical-data text-[11px] uppercase';
    });
    const pickerCount = document.getElementById('v2-picker-count');
    if (pickerCount) pickerCount.textContent = `${v2State.playerTeam.length}/3`;
    playerPicker.innerHTML = entries.map(character => v2PickerButtonHTML(character, 'playerTeam')).join('');
    const enemyColumn = document.getElementById('v2-enemy-picker-column');
    const enemyLabel = document.getElementById('v2-enemy-picker-label');
    enemyColumn?.classList.toggle('hidden', v2State.matchMode === 'pvp');
    if (enemyLabel) enemyLabel.textContent = v2State.matchMode === 'pvp' ? 'OPPONENT STARTERS' : 'CPU STARTERS';
    enemyPicker.innerHTML = v2State.matchMode === 'pvp'
        ? ''
        : entries.map(character => v2PickerButtonHTML(character, 'enemyTeam')).join('');
    document.getElementById('v2-player-summary').innerHTML = v2State.playerTeam.map((id, index) =>
        `<span class="bg-charcoal-plate/80 border border-primary/20 text-primary rounded px-2 py-1 font-tactical-data text-[10px] uppercase">${index + 1}. ${esc(byId[id]?.name || id)}</span>`
    ).join('');
    document.getElementById('v2-enemy-summary').innerHTML = v2State.enemyTeam.map((id, index) =>
        `<span class="bg-charcoal-plate/80 border border-blood-crimson/20 text-blood-crimson rounded px-2 py-1 font-tactical-data text-[10px] uppercase">${index + 1}. ${esc(byId[id]?.name || id)}</span>`
    ).join('');
    const lobbyNote = document.getElementById('v2-lobby-note');
    if (lobbyNote) {
        if (v2State.matchMode === 'pvp') {
            const roomId = v2FieldValue('v2-room-id', 'room-id', 'lobby') || 'lobby';
            const waiting = v2State.lobbyStatus?.status === 'waiting';
            lobbyNote.textContent = waiting
                ? `Waiting in room ${v2State.lobbyStatus.room_id}. Share this room code with your opponent.`
                : `Private PvP will open room ${roomId}. Your opponent chooses their own starters.`;
            lobbyNote.classList.remove('hidden');
        } else {
            lobbyNote.classList.add('hidden');
            lobbyNote.textContent = '';
        }
    }
}

function v2StatusHTML(character) {
    const statuses = character.statuses || [];
    if (!statuses.length) return '';
    return `<div class="flex flex-wrap gap-1 mt-1">${statuses.slice(0, 2).map(status => {
        const details = v2StatusPayloadParts({ payload: status.payload || {} }).slice(0, 2);
        const duration = status.duration > 0 ? `${status.duration}t` : 'perm';
        return `<span class="bg-primary/15 text-primary border border-primary/20 rounded px-1 py-0.5 font-tactical-data text-[8px] uppercase" title="${esc(details.join(', '))}">${esc(status.name)} ${duration}</span>`;
    }).join('')}</div>`;
}

function v2CharacterCardHTML(character, slot, isMine, isTurn) {
    const selected = isMine && v2State.selectedCasterSlot === slot;
    const queuedIndex = v2State.actions.findIndex(action => Number(action.caster_slot) === slot);
    const queued = queuedIndex >= 0;
    const dead = !character.alive;
    const targetable = v2CanTargetCharacter(character, slot, isMine, isTurn);
    const hpPct = Math.max(0, Math.min(100, Math.round((character.hp / character.max_hp) * 100)));
    const locked = isMine && v2ControlsLocked();
    const stateLabel = dead
        ? 'Defeated'
        : queued
            ? `Queued #${queuedIndex + 1}`
            : targetable
                ? 'Legal target'
                : selected
                    ? 'Selecting skill'
                    : locked
                        ? 'Locked'
                        : isMine && isTurn
                            ? 'Ready'
                            : isMine
                                ? 'Standing by'
                                : '';
    const hpTone = hpPct <= 30 ? 'critical' : hpPct <= 60 ? 'wounded' : 'healthy';
    const hpColor = isMine ? 'bg-health-emerald' : 'bg-blood-crimson';
    const hpShadow = isMine ? 'shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'shadow-[0_0_8px_rgba(239,68,68,0.8)]';
    const cardClass = selected
        ? 'relative w-[34%] h-full bg-charcoal-plate rounded-lg flex flex-col overflow-hidden z-30 ring-2 ring-prestige-gold shadow-[0_0_20px_rgba(245,158,11,0.5)] transform -translate-y-4 text-left'
        : targetable
            ? 'relative w-[34%] h-[110%] bg-charcoal-plate rounded-lg flex flex-col overflow-hidden intent-glow z-20 animate-float text-left'
            : isMine
                ? 'relative w-[30%] h-[90%] bg-charcoal-plate rounded-lg border border-white/10 flex flex-col overflow-hidden shadow-lg opacity-80 text-left'
                : 'relative w-[30%] h-full bg-charcoal-plate rounded-lg border border-white/10 flex flex-col overflow-hidden animate-float text-left';
    const stateBadge = dead
        ? `<div class="absolute inset-0 z-30 bg-obsidian-base/70 flex items-center justify-center"><span class="font-tactical-data text-[10px] text-error uppercase">Defeated</span></div>`
        : selected
            ? `<div class="absolute top-1 left-1 bg-charcoal-plate/80 backdrop-blur text-prestige-gold font-tactical-data text-[10px] px-1 rounded flex items-center z-20"><span class="material-symbols-outlined text-[12px] mr-1">star</span> LEAD</div>`
            : targetable
                ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blood-crimson text-white font-tactical-data text-[10px] px-2 py-0.5 rounded flex items-center gap-1 z-30 shadow-[0_0_10px_rgba(239,68,68,0.8)]"><span class="material-symbols-outlined text-[10px]">local_fire_department</span> STRIKE</div>`
                : queued
                    ? `<div class="absolute top-1 left-1 bg-charcoal-plate/80 backdrop-blur text-energy-cyan font-tactical-data text-[10px] px-1 rounded flex items-center z-20"><span class="material-symbols-outlined text-[12px] mr-1">done</span> Q${queuedIndex + 1}</div>`
                    : '';
    return `
      <button class="${cardClass} ${dead ? 'grayscale opacity-45' : ''} ${queued && !selected ? 'ring-1 ring-energy-cyan/70' : ''}"
        type="button" style="animation-delay: ${slot * 0.5}s;" data-v2-role="${isMine ? 'caster' : 'target'}" data-v2-side="${isMine ? 'mine' : 'enemy'}" data-slot="${slot}" data-hp-tone="${hpTone}" ${dead ? 'disabled' : ''}>
        ${stateBadge}
        <div class="flex-1 bg-surface-container relative bg-cover bg-center" data-alt="${esc(character.name)}" style="${v2PortraitStyle(character)}; background-size: cover; background-position: center;">
          ${(character.statuses || []).length && !dead ? `<div class="absolute top-1 right-1 flex gap-1 z-20">${(character.statuses || []).slice(0, 2).map(status => `<span class="material-symbols-outlined text-[12px] ${isMine ? 'text-energy-cyan' : 'text-error'}" title="${esc(status.name)}">warning</span>`).join('')}</div>` : ''}
        </div>
        <div class="${selected || targetable ? 'h-2.5' : 'h-2'} w-full bg-surface-container-highest absolute bottom-0 left-0">
          <div class="h-full ${hpColor} ${hpShadow}" style="width:${hpPct}%"></div>
        </div>
        <span class="sr-only">${esc(character.name)} ${esc(stateLabel)} ${character.hp}/${character.max_hp} HP</span>
      </button>`;
}

function v2ArenaFighterModel(character, slot, side, isTurn) {
    const selected = side === 'mine' && v2State.selectedCasterSlot === slot;
    const queuedIndex = v2State.actions.findIndex(action => Number(action.caster_slot) === slot);
    const targetable = v2CanTargetCharacter(character, slot, side === 'mine', isTurn);
    const dead = !character.alive;
    const locked = side === 'mine' && v2ControlsLocked();
    const stateLabel = dead
        ? 'Defeated'
        : queuedIndex >= 0
            ? `Queued #${queuedIndex + 1}`
            : targetable
                ? 'Target'
                : selected
                    ? 'Active'
                    : locked
                        ? 'Locked'
                        : side === 'mine' && isTurn
                            ? 'Ready'
                            : '';
    return {
        side,
        slot,
        name: character.name,
        role: v2CatalogCharacter(character)?.role || '',
        state: v2CatalogCharacter(character)?.state || '',
        hp: character.hp,
        maxHp: character.max_hp,
        alive: character.alive,
        statuses: character.statuses || [],
        selected,
        queued: queuedIndex >= 0,
        targetable,
        stateLabel,
    };
}

function v2SyncPhaserArena(state, me, foe, isMyTurn) {
    const element = document.getElementById('v2-phaser-arena');
    if (!element || !window.JJKPhaserBattle || !state || !me || !foe) return;
    const renderer = window.JJKPhaserBattle.mount(element);
    if (!renderer) return;
    const selected = me.team?.[v2State.selectedCasterSlot];
    const skill = selected && v2State.selectedSkillId
        ? v2SkillFor(selected.character_id, v2State.selectedSkillId, selected)
        : null;
    const prompt = skill
        ? 'Choose a legal target'
        : selected
            ? 'Choose a skill'
            : isMyTurn
                ? 'Choose your fighter'
                : 'Waiting for opponent';
    renderer.update({
        presentation: 'dom_overlay',
        phase: state.phase,
        turn: state.turn_number,
        prompt,
        queueCount: v2State.actions.length,
        mine: (me.team || []).map((character, slot) => v2ArenaFighterModel(character, slot, 'mine', isMyTurn)),
        enemy: (foe.team || []).map((character, slot) => v2ArenaFighterModel(character, slot, 'enemy', isMyTurn)),
    });
}

function v2QueuedSkillIds() {
    return new Set(v2State.actions.map(action => action.skill_id));
}

function v2QueueCostSummary(player, actions = v2State.actions) {
    const energy = player?.energy || {};
    const remaining = {
        green: energy.green || 0,
        red: energy.red || 0,
        blue: energy.blue || 0,
        white: energy.white || 0,
    };
    const spent = { green: 0, red: 0, blue: 0, white: 0, black: 0 };
    const actionCosts = {};
    let wildcardRequired = 0;
    let wildcardChosen = 0;

    for (const action of actions) {
        const caster = player?.team?.[action.caster_slot];
        const skill = caster ? v2SkillFor(caster.character_id, action.skill_id, caster) : null;
        const cost = skill?.cost || [];
        actionCosts[action.id] = cost;
        for (const color of cost) {
            spent[color] = (spent[color] || 0) + 1;
            if (color === 'black') {
                wildcardRequired += 1;
            } else {
                remaining[color] = (remaining[color] || 0) - 1;
            }
        }
        for (const pay of v2State.wildcardPays[action.id] || []) {
            if (pay && pay in remaining) {
                wildcardChosen += 1;
                remaining[pay] -= 1;
            }
        }
    }

    const missingSpecific = Object.entries(remaining)
        .filter(([, value]) => value < 0)
        .map(([color]) => color);
    const needsWildcardChoice = wildcardChosen < wildcardRequired;
    const canPay = missingSpecific.length === 0 && !needsWildcardChoice;
    const reason = missingSpecific.length
        ? `Short on ${missingSpecific.join(', ')}`
        : needsWildcardChoice
            ? 'Choose wildcard payments'
            : 'Queue payable';

    return {
        actionCosts,
        canPay,
        missingSpecific,
        needsWildcardChoice,
        reason,
        remaining,
        spent,
        wildcardRequired,
        wildcardChosen,
    };
}

function v2QueuePaymentStatus(player) {
    return v2QueueCostSummary(player);
}

function v2QueuedSkillFitStatus(skill) {
    const { mine } = v2PlayerIds();
    const player = v2State.state?.players?.[mine];
    if (!player || !skill) return { canFit: false, reason: 'Unavailable' };

    const summary = v2QueueCostSummary(player);
    const remaining = { ...summary.remaining };
    let wildcardNeeded = Math.max(0, summary.wildcardRequired - summary.wildcardChosen);

    for (const color of skill.cost || []) {
        if (color === 'black') {
            wildcardNeeded += 1;
        } else {
            remaining[color] = (remaining[color] || 0) - 1;
        }
    }

    const missingSpecific = Object.entries(remaining)
        .filter(([, value]) => value < 0)
        .map(([color]) => color);
    if (missingSpecific.length) {
        return { canFit: false, reason: `Would be short on ${missingSpecific.join(', ')}` };
    }

    const spareEnergy = Object.values(remaining).reduce((sum, value) => sum + Math.max(0, value), 0);
    if (spareEnergy < wildcardNeeded) {
        return { canFit: false, reason: 'Not enough energy for wildcard' };
    }

    return { canFit: true, reason: '' };
}

function v2RemainingEnergyHTML(summary) {
    return ['green', 'red', 'blue', 'white'].map(color => {
        const value = summary.remaining[color] || 0;
        const tone = value < 0 ? 'short' : value === 0 ? 'spent' : 'ok';
        return `<span class="v2-energy-balance ${tone}"><span class="orb orb-${color}"></span><span>${esc(color)}</span><strong>${esc(value)}</strong></span>`;
    }).join('');
}

function v2CostText(cost) {
    if (!cost || !cost.length) return 'No cost';
    return cost.map(color => color === 'black' ? 'wildcard' : color).join(' + ');
}

function v2QueuePaymentHTML(player) {
    if (!v2State.actions.length) return '';
    const status = v2QueuePaymentStatus(player);
    const spentColors = ['green', 'red', 'blue', 'white', 'black']
        .flatMap(color => Array.from({ length: status.spent[color] || 0 }, () => color));
    return `
      <div class="v2-queue-status ${status.canPay ? 'payable' : 'blocked'}">
        <div>
          <strong>${esc(status.canPay ? 'Queue ready' : status.reason)}</strong>
          <small>${status.canPay
              ? 'All queued costs are covered.'
              : status.needsWildcardChoice
                  ? 'Choose a wildcard payment for each black cost.'
                  : 'Remove an action or pick a cheaper skill.'}</small>
        </div>
        <span>${spentColors.length ? orbsHTML(spentColors) : 'No energy cost'} ${status.wildcardRequired ? `Wildcard ${status.wildcardChosen}/${status.wildcardRequired}` : ''}</span>
        <div class="v2-energy-balance-row" title="Energy remaining after queued costs">${v2RemainingEnergyHTML(status)}</div>
      </div>`;
}

function v2EnergyConversionHTML(player) {
    if (!player) return '';
    const colors = ['green', 'red', 'blue', 'white'];
    const source = colors.includes(v2State.convertSource) ? v2State.convertSource : colors[0];
    const fallbackTarget = colors.find(color => color !== source) || colors[1];
    const target = colors.includes(v2State.convertTarget) && v2State.convertTarget !== source ? v2State.convertTarget : fallbackTarget;
    const hasSourceEnergy = Number(player.energy?.[source] || 0) >= 2;
    const hardLocked = v2ControlsLocked() || v2State.actions.length > 0 || !!player.energy_converted_this_turn;
    const locked = hardLocked || !hasSourceEnergy;
    if (locked) return '';
    v2State.convertSource = source;
    v2State.convertTarget = target;
    const sourceOptions = colors.map(color =>
        `<option value="${color}" ${source === color ? 'selected' : ''}>${color} (${player.energy?.[color] || 0})</option>`
    ).join('');
    const targetOptions = colors.map(color =>
        `<option value="${color}" ${target === color ? 'selected' : ''} ${source === color ? 'disabled' : ''}>${color}</option>`
    ).join('');
    const reason = player.energy_converted_this_turn
        ? 'Conversion used'
        : v2State.actions.length
            ? 'Cancel queue to convert'
            : !hasSourceEnergy
                ? 'Need 2 source'
            : locked
                ? 'Unavailable'
                : 'Convert';
    return `
      <div class="pointer-events-auto flex items-center gap-1 bg-charcoal-plate/80 backdrop-blur-md rounded-full px-2 py-1 border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${locked ? 'opacity-60' : ''}">
        <span class="material-symbols-outlined text-[14px] text-energy-cyan">sync_alt</span>
        <select class="v2-convert-source bg-obsidian-base text-on-surface-variant border border-outline-variant/40 rounded-full text-[10px] font-tactical-data py-1 pl-2 pr-6" ${hardLocked ? 'disabled' : ''}>${sourceOptions}</select>
        <select class="v2-convert-target bg-obsidian-base text-on-surface-variant border border-outline-variant/40 rounded-full text-[10px] font-tactical-data py-1 pl-2 pr-6" ${hardLocked ? 'disabled' : ''}>${targetOptions}</select>
        <button class="v2-convert-submit bg-primary-container/25 text-primary border border-primary/30 rounded-full px-2 py-1 font-tactical-data text-[10px] uppercase" type="button" ${locked ? 'disabled' : ''}>${esc(reason)}</button>
      </div>`;
}

function v2ActionTargetSlots(action, skill) {
    const rule = skill?.target_rule || {};
    if (rule.kind === 'enemy_team' || rule.kind === 'ally_team') {
        const targetPlayer = v2State.state?.players?.[action.target_player_id];
        return (targetPlayer?.team || [])
            .map((character, slot) => character.alive ? slot : null)
            .filter(slot => slot !== null);
    }
    if (action.target_slots && action.target_slots.length) return action.target_slots;
    return action.target_slot === null || action.target_slot === undefined ? [] : [action.target_slot];
}

function v2PreviewTargetName(targetPlayer, slot) {
    return targetPlayer?.team?.[slot]?.name || `Slot ${Number(slot) + 1}`;
}

function v2EffectPreviewParts(effect, action, skill, hpPreview, ownerPlayerId) {
    const targetPlayer = v2State.state?.players?.[action.target_player_id];
    const targets = v2ActionTargetSlots(action, skill);
    const targetNames = targets.map(slot => v2PreviewTargetName(targetPlayer, slot));
    const amount = Number(effect.amount || 0);
    const parts = [];

    if (effect.type === 'damage' || effect.type === 'health_steal') {
        targets.forEach(slot => {
            const key = `${action.target_player_id}:${slot}`;
            const target = targetPlayer?.team?.[slot];
            if (!target) return;
            const before = hpPreview[key] ?? target.hp;
            const after = Math.max(0, before - amount);
            hpPreview[key] = after;
            const type = effect.damage_type ? ` ${effect.damage_type}` : '';
            const bonus = effect.payload?.bonus_amount ? `, +${effect.payload.bonus_amount} if condition hits` : '';
            parts.push(`${v2PreviewTargetName(targetPlayer, slot)}: ${amount}${type} damage (${before}->${after} HP${bonus})`);
        });
        if (effect.type === 'health_steal' && amount) parts.push(`Caster heals ${amount}`);
    } else if (effect.type === 'heal') {
        targets.forEach(slot => {
            const key = `${action.target_player_id}:${slot}`;
            const target = targetPlayer?.team?.[slot];
            if (!target) return;
            const before = hpPreview[key] ?? target.hp;
            const after = Math.min(target.max_hp || 100, before + amount);
            hpPreview[key] = after;
            parts.push(`${v2PreviewTargetName(targetPlayer, slot)}: heals ${amount} (${before}->${after} HP)`);
        });
    } else if (effect.type === 'apply_status') {
        const statusName = effect.payload?.name || effect.status || 'Status';
        const duration = effect.duration ? ` for ${effect.duration}t` : '';
        const details = v2StatusPayloadParts(effect);
        const names = effect.target === 'self'
            ? [v2State.state?.players?.[ownerPlayerId]?.team?.[action.caster_slot]?.name || 'Caster']
            : targetNames;
        parts.push(`${statusName}${duration} on ${names.join(', ') || 'target'}${details.length ? ` (${details.join(', ')})` : ''}`);
    } else if (effect.type === 'remove_status') {
        parts.push(`Remove ${effect.status || 'status'} from ${targetNames.join(', ') || 'target'}`);
    } else if (effect.type === 'cleanse') {
        parts.push(`Cleanse ${targetNames.join(', ') || 'target'}`);
    } else if (effect.type === 'dispel') {
        parts.push(`Dispel ${targetNames.join(', ') || 'target'}`);
    }
    return parts;
}

function v2ActionPreviewHTML(action, skill, hpPreview, ownerPlayerId) {
    if (!skill) return '';
    const lines = (skill.effects || []).flatMap(effect => v2EffectPreviewParts(effect, action, skill, hpPreview, ownerPlayerId));
    if (!lines.length) return '';
    return `<div class="v2-preview-lines">${lines.map(line =>
        `<span>${esc(line)}</span>`
    ).join('')}</div>`;
}

function v2SkillButtonHTML(skill, character, disabled) {
    const slotId = skill.original_slot_id || skill.id;
    const cooldown = character.cooldowns?.[skill.effective_skill_id || skill.id] || 0;
    const fit = v2QueuedSkillFitStatus(skill);
    const { mine, enemy } = v2PlayerIds();
    const targetPlayer = skill.target_rule?.kind === 'ally_team'
        ? v2State.state?.players?.[mine]
        : v2State.state?.players?.[enemy];
    const hasTeamTargets = v2TeamSkillHasTargets(targetPlayer, skill);
    const isDisabled = disabled || cooldown > 0 || !fit.canFit || !hasTeamTargets;
    const selected = v2State.selectedSkillId === slotId;
    const reason = cooldown > 0 ? `Cooldown ${cooldown}` : !fit.canFit ? fit.reason : !hasTeamTargets ? 'No legal targets' : '';
    const replacementNote = skill.replaced_from ? `Replaces ${skill.replaced_from}` : '';
    const primaryClass = (skill.classes || [])[0] || 'Skill';
    const cost = skill.cost || [];
    const effect = (skill.effects || []).map(v2EffectLabel).filter(Boolean)[0] || v2TargetLabel(skill);
    const skillName = String(skill.name || '?').toUpperCase();
    const title = skillName.length > 18 ? `${skillName.slice(0, 16)}...` : skillName;
    const activeClass = selected
        ? 'relative bg-charcoal-plate border border-primary/50 rounded-lg p-3 text-left overflow-hidden foil-sweep shadow-[0_0_15px_rgba(210,187,255,0.2)] hover:shadow-[0_0_20px_rgba(210,187,255,0.4)] transition-all flex flex-col justify-between h-24'
        : 'relative bg-surface-variant border border-outline-variant/50 rounded-lg p-3 text-left flex flex-col justify-between h-24 hover:border-white/30 transition-colors';
    const disabledClass = cooldown > 0
        ? 'relative bg-obsidian-base border border-surface-container-high rounded-lg p-3 text-left flex flex-col justify-center items-center h-24 opacity-60 cursor-not-allowed'
        : 'relative bg-charcoal-plate border border-error/30 rounded-lg p-3 text-left overflow-hidden h-24 cursor-not-allowed';
    const blockedLabel = cooldown > 0
        ? `${cooldown} TURNS`
        : !fit.canFit
            ? 'NO ENERGY'
            : !hasTeamTargets
                ? 'NO TARGET'
                : 'LOCKED';
    return `
      <button class="${isDisabled ? disabledClass : activeClass}" type="button" data-skill-id="${esc(slotId)}" data-effective-skill-id="${esc(skill.effective_skill_id || skill.id)}" ${reason ? `title="${esc(reason)}"` : ''} ${isDisabled ? 'disabled' : ''}>
        ${isDisabled && cooldown <= 0 ? '<div class="absolute inset-0 pointer-events-none opacity-20" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239,68,68,0.5) 10px, rgba(239,68,68,0.5) 11px);"></div>' : ''}
        ${isDisabled && cooldown > 0 ? `
          <span class="material-symbols-outlined text-outline text-3xl mb-1">hourglass_empty</span>
          <span class="font-tactical-data text-lg text-outline">${esc(blockedLabel)}</span>
          <div class="absolute top-2 left-2 font-headline-lg-mobile text-[12px] text-outline-variant">${esc(title)}</div>
        ` : `
          <div class="flex justify-between items-start ${isDisabled ? 'opacity-50' : ''}">
            <span class="font-headline-lg-mobile text-[16px] ${selected ? 'text-primary' : 'text-on-surface'}">${esc(title)}</span>
            <div class="flex gap-1">${cost.length ? cost.map(color => v2EnergyOrbHTML(color)).join('') : '<span class="font-tactical-data text-[10px] text-on-surface-variant">FREE</span>'}</div>
          </div>
          <div class="flex justify-between items-end gap-2 ${isDisabled ? 'opacity-50' : ''}">
            <span class="bg-primary/20 text-primary font-tactical-data text-[10px] px-1.5 py-0.5 rounded truncate">${esc(primaryClass)}</span>
            <span class="font-tactical-data text-xs text-on-surface-variant truncate">${esc(effect)}</span>
          </div>
          ${replacementNote ? `<div class="absolute bottom-1 left-3 font-tactical-data text-[8px] text-energy-cyan">${esc(replacementNote)}</div>` : ''}
        `}
        ${isDisabled && cooldown <= 0 ? `<div class="absolute inset-0 flex items-center justify-center"><span class="font-tactical-data text-sm text-error bg-obsidian-base/80 px-2 py-1 rounded">${esc(blockedLabel)}</span></div>` : ''}
      </button>`;
}

function v2PendingActionPayloads() {
    return v2State.actions.map((action, index) => ({
        ...action,
        queue_index: index,
        wildcard_pays: v2State.wildcardPays[action.id] || [],
    }));
}

function resetClassicV2Match() {
    if (!v2State.state && v2State.lobbyStatus?.status === 'waiting') {
        socket.emit('battle_v2_leave_pvp', { room_id: v2State.lobbyStatus.room_id });
    }
    v2State.state = null;
    v2State.actions = [];
    v2State.wildcardPays = {};
    v2State.selectedCasterSlot = null;
    v2State.selectedSkillId = null;
    v2State.lobbyStatus = null;
    setV2UiScreen('lobby');
    renderClassicV2();
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
    const { mine } = v2PlayerIds();
    const me = v2State.state?.players?.[mine];
    const queuedSlots = new Set(v2State.actions.map(action => action.caster_slot));
    const nextSlot = (me?.team || []).findIndex((character, slot) => character.alive && !queuedSlots.has(slot));
    v2State.selectedCasterSlot = nextSlot >= 0 ? nextSlot : casterSlot;
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
    const locked = v2ControlsLocked();
    if (!v2State.actions.length) {
        return `
          <div class="v2-section-head">
            <span>Action Queue</span>
            <strong>Empty</strong>
          </div>
          <div class="v2-empty">Queue up to one skill from each active fighter. Actions resolve top to bottom.</div>`;
    }
    const hpPreview = {};
    const paymentSummary = v2QueuePaymentStatus(me);
    const items = v2State.actions.map((action, index) => {
        const caster = me?.team?.[action.caster_slot];
        const skill = caster ? v2SkillFor(caster.character_id, action.skill_id, caster) : null;
        const blackCount = (skill?.cost || []).filter(color => color === 'black').length;
        const actionCost = paymentSummary.actionCosts[action.id] || skill?.cost || [];
        const pays = v2State.wildcardPays[action.id] || [];
        const wildcardControls = Array.from({ length: blackCount }, (_, payIndex) => `
          <select class="v2-wildcard-select" data-action-id="${esc(action.id)}" data-pay-index="${payIndex}">
            ${['', 'green', 'red', 'blue', 'white'].map(color =>
                `<option value="${color}" ${pays[payIndex] === color ? 'selected' : ''}>${color || 'pay wildcard'}</option>`
            ).join('')}
          </select>`).join('');
        return `
          <div class="v2-queue-item ${locked ? 'locked' : ''}">
            <div>
              <strong>${index + 1}. ${esc(caster?.name || 'Unknown')}</strong>
              <span>${esc(skill?.name || action.skill_id)}</span>
              <small>Target: ${esc(v2ActionTargetLabel(action))}</small>
              <div class="v2-action-cost">
                <strong>Cost</strong>
                ${actionCost.length ? orbsHTML(actionCost) : ''}
                <span class="v2-action-cost-text">${esc(v2CostText(actionCost))}</span>
              </div>
              ${v2ActionPreviewHTML(action, skill, hpPreview, mine)}
            </div>
            <div class="v2-queue-controls">
              ${wildcardControls}
              <button class="icon-btn v2-move" data-dir="-1" data-action-id="${esc(action.id)}" title="Move up">↑</button>
              <button class="icon-btn v2-move" data-dir="1" data-action-id="${esc(action.id)}" title="Move down">↓</button>
              <button class="icon-btn v2-remove" data-action-id="${esc(action.id)}" title="Remove">✕</button>
            </div>
          </div>`;
    }).join('');
    return `
      <div class="v2-section-head">
        <span>Action Queue</span>
        <strong>${v2State.actions.length}/${v2QueueLimit(me)} queued</strong>
      </div>
      ${v2QueuePaymentHTML(me)}
      ${items}`;
}

function v2LogEntryHTML(event) {
    const type = String(event.type || 'event').replace(/_/g, ' ');
    const tone = event.type === 'damage' || event.type === 'status_damage'
        ? 'damage'
        : event.type === 'heal' || event.type === 'health_steal'
            ? 'heal'
            : event.type === 'battle_finished'
                ? 'finish'
                : event.type && event.type.includes('status')
                    ? 'status'
                    : 'neutral';
    return `
      <div class="${tone === 'damage' ? 'text-blood-crimson' : tone === 'heal' ? 'text-health-emerald' : tone === 'finish' ? 'text-prestige-gold' : 'text-on-surface-variant'}">
        [T${esc(event.turn_number || '')}] ${esc(type).toUpperCase()} ${esc(event.message)}
      </div>`;
}

function v2TurnStatusHTML(state, me, foe, isMyTurn) {
    const current = state.players[state.turn_player_id];
    const mineQueued = v2State.actions.length;
    const mineLimit = v2QueueLimit(me);
    const foeLiving = v2AliveCount(foe);
    const safeLimit = Math.max(1, mineLimit);
    const progressPct = Math.min(100, Math.round((mineQueued / safeLimit) * 100));
    const locked = me?.queue_confirmed || v2State.queueSubmitting;
    const paymentStatus = v2State.actions.length ? v2QueuePaymentStatus(me) : null;
    const confirmed = me?.queue_confirmed ? 'Confirmed' : v2State.queueSubmitting ? 'Resolving' : `${mineQueued}/${mineLimit} queued`;
    const openSlots = Math.max(0, mineLimit - mineQueued);
    const turnTone = isMyTurn ? 'active' : 'waiting';
    const secondCardTitle = locked
        ? 'Queue locked'
        : paymentStatus && !paymentStatus.canPay
            ? paymentStatus.reason
            : openSlots
                ? `${openSlots} action${openSlots === 1 ? '' : 's'} left`
                : 'Queue full';
    const secondCardHint = paymentStatus && !paymentStatus.canPay
        ? 'Fix queue payment before confirming.'
        : openSlots
            ? 'Pick another ready fighter or confirm now.'
            : 'Confirm to resolve from top to bottom.';
    return `
      <div class="v2-turn-card ${turnTone}">
        <strong>${isMyTurn ? 'Your action window' : `${esc(current?.name || 'Opponent')} acting`}</strong>
        <span>${esc(confirmed)} · ${v2AliveCount(me)} allies alive · ${foeLiving} enemies alive</span>
      </div>
      <div class="v2-turn-card ${locked ? 'locked' : ''}">
        <div class="v2-queue-meter" aria-hidden="true"><span style="width:${progressPct}%"></span></div>
        <strong>${esc(secondCardTitle)}</strong>
        <span>${esc(secondCardHint)}</span>
      </div>`;
}

function v2PhaseHint(state, me, isMyTurn) {
    if (state.winner_id) return `${state.players[state.winner_id]?.name || state.winner_id} wins`;
    if (!isMyTurn) return `Waiting on ${state.players[state.turn_player_id]?.name || 'opponent'}.`;
    if (v2State.queueSubmitting || me?.queue_confirmed) return 'Resolving queued actions. Results will appear in the log.';
    if (!v2State.actions.length) return 'Select a fighter, choose a skill, then choose a legal target.';
    const paymentStatus = v2QueuePaymentStatus(me);
    if (!paymentStatus.canPay) return `${paymentStatus.reason}. Fix the queue before confirming.`;
    const remaining = Math.max(0, v2QueueLimit(me) - v2State.actions.length);
    if (remaining > 0) return `${remaining} fighter${remaining === 1 ? '' : 's'} can still queue an action, or confirm now.`;
    return 'All living fighters are queued. Confirm to resolve.';
}

function v2RecentResolutionHTML(state) {
    const recent = (state.event_log || [])
        .filter(event => ['skill_resolved', 'damage', 'heal', 'health_steal', 'status_damage', 'battle_finished', 'turn_started'].includes(event.type))
        .slice(-4)
        .reverse();
    if (!recent.length) return '';
    return `
      <div class="flex flex-col gap-1 mb-1">
        ${recent.map(event => `<div>${esc(event.message)}</div>`).join('')}
      </div>`;
}

function v2EventDamageAmount(event) {
    const direct = Number(event.amount ?? event.damage ?? event.payload?.amount ?? event.payload?.damage);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = String(event.message || '').match(/(?:-|for\s+)(\d+)/i);
    return match ? Number(match[1]) : 0;
}

function v2RenderResultView(state, me, foe, mine) {
    const winner = state.players[state.winner_id];
    const iWon = state.winner_id === mine;
    const loser = iWon ? foe : me;
    const damageEvents = (state.event_log || []).filter(event => event.type === 'damage' || event.type === 'status_damage');
    const totalDamage = damageEvents.reduce((sum, event) => sum + v2EventDamageAmount(event), 0);
    const highlights = damageEvents.slice(-3).reverse();
    const energyTotal = Object.values(me?.energy || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const title = document.getElementById('v2-result-title');
    const copy = document.getElementById('v2-result-copy');
    const winnerEl = document.getElementById('v2-result-winner');
    const defeatedEl = document.getElementById('v2-result-defeated');
    const damageEl = document.getElementById('v2-result-damage');
    const energyEl = document.getElementById('v2-result-energy');
    const turnsEl = document.getElementById('v2-result-turns');
    const highlightsEl = document.getElementById('v2-result-highlights');
    if (title) title.textContent = iWon ? 'VICTORY' : 'DEFEAT';
    if (copy) copy.textContent = `${winner?.name || state.winner_id} controls the domain`;
    if (winnerEl) winnerEl.textContent = winner?.name || state.winner_id;
    if (defeatedEl) {
        defeatedEl.innerHTML = (loser?.team || []).slice(0, 3).map(character => `
          <div class="w-8 h-8 rounded bg-surface-container-highest overflow-hidden border border-outline-variant/50">
            ${v2ArchiveImageHTML(character, 'w-full h-full object-cover')}
          </div>
        `).join('');
    }
    if (damageEl) damageEl.textContent = totalDamage.toLocaleString();
    if (energyEl) energyEl.textContent = `${energyTotal}/10`;
    if (turnsEl) turnsEl.textContent = String(state.turn_number || 0);
    if (highlightsEl) {
        highlightsEl.innerHTML = highlights.length
            ? highlights.map(event => `
              <li class="flex justify-between items-center bg-surface-container-high p-2 rounded gap-3">
                <span class="text-on-surface truncate">${esc(event.message || event.type)}</span>
                <span class="text-blood-crimson font-bold shrink-0">-${v2EventDamageAmount(event).toLocaleString()} DMG</span>
              </li>
            `).join('')
            : '<li class="bg-surface-container-high p-2 rounded text-on-surface-variant">No strike data recorded.</li>';
    }
}

function v2CommandAvatarHTML(character, slot, selectedSlot) {
    const queued = v2State.actions.some(action => Number(action.caster_slot) === slot);
    const active = Number(selectedSlot) === slot;
    const dead = !character?.alive;
    const avatarClass = active
        ? 'w-12 h-12 rounded-full border-2 border-prestige-gold bg-surface-container shadow-[0_0_15px_rgba(245,158,11,0.4)] overflow-hidden relative'
        : queued || dead
            ? 'w-10 h-10 rounded-full border border-outline-variant opacity-50 grayscale bg-surface-container overflow-hidden relative'
            : 'w-10 h-10 rounded-full border border-outline-variant bg-surface-container overflow-hidden relative';
    return `
      <button class="${avatarClass}" type="button" data-v2-role="caster" data-v2-side="mine" data-slot="${slot}" ${dead ? 'disabled' : ''} title="${esc(character?.name || `Slot ${slot + 1}`)}">
        ${queued && !active ? '<div class="absolute inset-0 bg-black/40 flex items-center justify-center font-tactical-data text-xs text-white z-10">DONE</div>' : ''}
        ${v2ArchiveImageHTML(character, 'w-full h-full object-cover')}
      </button>`;
}

function renderClassicV2() {
    const state = v2State.state;
    const classicScreen = document.getElementById('classic-v2');
    const lobbyView = document.getElementById('v2-lobby-view');
    const setupView = document.getElementById('v2-setup-view');
    const battleView = document.getElementById('v2-battle-view');
    const resultView = document.getElementById('v2-result-view');
    const bottomNav = document.getElementById('v2-bottom-nav');
    const title = document.getElementById('v2-phase-title');
    const hint = document.getElementById('v2-phase-hint');
    const startButton = document.getElementById('btn-v2-start');
    const newMatchButton = document.getElementById('btn-v2-new-match');
    const cancelButton = document.getElementById('btn-v2-cancel');
    const endTurnButton = document.getElementById('btn-v2-end-turn');
    const confirmButton = document.getElementById('btn-v2-confirm');
    if (!state) {
        hydrateV2LobbyFields();
        const showLobby = v2State.uiScreen !== 'team' && v2State.lobbyStatus?.status !== 'waiting';
        classicScreen?.classList.remove('v2-battle-active');
        classicScreen?.classList.remove('v2-finished');
        classicScreen?.classList.add('v2-setup-active');
        lobbyView?.classList.toggle('hidden', !showLobby);
        setupView?.classList.toggle('hidden', showLobby);
        battleView?.classList.add('hidden');
        resultView?.classList.add('hidden');
        bottomNav?.classList.remove('hidden');
        renderV2BottomNav();
        if (title) title.textContent = 'Assemble Your Trio';
        if (hint) {
            hint.textContent = v2State.matchMode === 'pvp'
                ? (v2State.lobbyStatus?.status === 'waiting'
                    ? 'Waiting for your opponent to enter the domain.'
                    : 'Choose three fighters and open a Private PvP domain from the lobby room code.')
                : 'Select three fighters for your squad and three CPU opponents for the upcoming bout.';
        }
        ['v2-my-team', 'v2-enemy-team', 'v2-energy-row', 'v2-selected-panel', 'v2-queue-panel', 'v2-log'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        document.getElementById('v2-queue-panel')?.classList.add('hidden');
        const turnStatus = document.getElementById('v2-turn-status');
        if (turnStatus) turnStatus.innerHTML = '';
        startButton?.classList.remove('hidden');
        newMatchButton?.classList.toggle('hidden', v2State.lobbyStatus?.status !== 'waiting');
        cancelButton?.classList.add('hidden');
        endTurnButton?.classList.add('hidden');
        confirmButton?.classList.add('hidden');
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = 'Confirm Queue';
        }
        if (startButton) {
            startButton.disabled = v2State.lobbyStatus?.status === 'waiting';
            startButton.textContent = v2State.matchMode === 'pvp'
                ? (v2State.lobbyStatus?.status === 'waiting' ? 'Waiting for Opponent' : 'Open PvP Domain')
                : 'Ignite Battle';
        }
        if (newMatchButton) {
            newMatchButton.disabled = false;
            newMatchButton.textContent = v2State.lobbyStatus?.status === 'waiting' ? 'Cancel Wait' : 'New Match';
        }
        document.getElementById('v2-picker')?.classList.remove('hidden');
        if (!showLobby) renderV2Picker();
        return;
    }
    classicScreen?.classList.add('v2-battle-active');
    classicScreen?.classList.remove('v2-setup-active');
    classicScreen?.classList.toggle('v2-finished', !!state.winner_id);
    if (classicScreen) classicScreen.scrollTop = 0;
    window.scrollTo(0, 0);
    lobbyView?.classList.add('hidden');
    setupView?.classList.add('hidden');
    battleView?.classList.toggle('hidden', !!state.winner_id);
    resultView?.classList.toggle('hidden', !state.winner_id);
    bottomNav?.classList.add('hidden');
    renderV2BottomNav();
    startButton?.classList.add('hidden');
    newMatchButton?.classList.remove('hidden');
    cancelButton?.classList.toggle('hidden', v2State.actions.length === 0);
    endTurnButton?.classList.toggle('hidden', v2State.actions.length === 0);
    confirmButton?.classList.toggle('hidden', v2State.actions.length === 0);
    document.getElementById('v2-picker')?.classList.add('hidden');
    const { mine, enemy } = v2PlayerIds();
    const me = state.players[mine];
    const foe = state.players[enemy];
    const isMyTurn = state.turn_player_id === mine && state.phase !== 'finished';
    if (state.winner_id) v2RenderResultView(state, me, foe, mine);
    v2EnsureSelectedCaster(me, isMyTurn);
    document.getElementById('v2-turn-badge').textContent = `Turn ${state.turn_number}`;
    title.textContent = state.winner_id ? 'Victory Recap' : state.phase.replace(/_/g, ' ').toUpperCase();
    hint.textContent = v2PhaseHint(state, me, isMyTurn);
    document.getElementById('v2-turn-status').innerHTML = v2TurnStatusHTML(state, me, foe, isMyTurn);
    document.getElementById('v2-energy-row').innerHTML = renderEnergyPool(me?.energy || {}) + v2EnergyConversionHTML(me);
    document.getElementById('v2-my-team').innerHTML = (me?.team || []).map((character, slot) =>
        v2CharacterCardHTML(character, slot, true, isMyTurn)
    ).join('');
    document.getElementById('v2-enemy-team').innerHTML = (foe?.team || []).map((character, slot) =>
        v2CharacterCardHTML(character, slot, false, isMyTurn)
    ).join('');
    v2SyncPhaserArena(state, me, foe, isMyTurn);
    const selected = me?.team?.[v2State.selectedCasterSlot];
    const selectedLocked = selected && v2State.actions.some(a => a.caster_slot === v2State.selectedCasterSlot);
    const commandHint = selectedLocked
        ? 'This fighter already has an action queued.'
        : isMyTurn
            ? 'Choose an ability, then tap a highlighted target.'
            : 'Waiting for the opponent to finish planning.';
    const commandAvatars = (me?.team || []).map((character, slot) =>
        v2CommandAvatarHTML(character, slot, v2State.selectedCasterSlot)
    ).join('');
    document.getElementById('v2-selected-panel').innerHTML = selected
        ? `<div class="flex justify-center gap-4 py-3 px-margin-safe border-b border-white/5 relative">
             ${commandAvatars}
             <div class="absolute right-4 top-1/2 -translate-y-1/2 text-right pointer-events-none">
               <div class="font-tactical-data text-[10px] text-prestige-gold uppercase">${selectedLocked ? 'Queued' : 'Lead'}</div>
               <div class="font-tactical-data text-[9px] text-on-surface-variant">${v2State.actions.length}/${v2QueueLimit(me)} queue</div>
             </div>
           </div>
           <div class="flex-1 p-4 grid grid-cols-2 gap-3 pb-6">${v2SkillsFor(selected).map(skill =>
            v2SkillButtonHTML(skill, selected, !isMyTurn || v2QueuedSkillIds().has(skill.original_slot_id || skill.id) || selectedLocked)
        ).join('')}</div>`
        : `<div class="flex justify-center gap-4 py-3 px-margin-safe border-b border-white/5 relative">
             ${commandAvatars}
           </div>
           <div class="p-4 pb-6">
             <div class="relative bg-surface-variant border border-outline-variant/50 rounded-lg p-3 text-left flex flex-col justify-center h-24">
               <span class="font-headline-lg-mobile text-[16px] text-on-surface">SELECT FIGHTER</span>
               <span class="font-tactical-data text-xs text-on-surface-variant">${esc(commandHint)}</span>
             </div>
           </div>`;
    const queuePanel = document.getElementById('v2-queue-panel');
    if (queuePanel) {
        queuePanel.innerHTML = v2QueueHTML();
        queuePanel.classList.toggle('is-empty', v2State.actions.length === 0);
        queuePanel.classList.toggle('hidden', v2State.actions.length === 0);
    }
    const logPanel = document.getElementById('v2-log');
    const eventLog = state.event_log || [];
    logPanel.classList.toggle('hidden', eventLog.length === 0);
    logPanel.innerHTML = `
      <div class="text-energy-cyan uppercase mb-1">Log ${esc(eventLog.length)}</div>
      ${v2RecentResolutionHTML(state)}
      ${eventLog.slice().reverse().slice(0, 6).map(v2LogEntryHTML).join('')}`;
    const paymentStatus = v2QueuePaymentStatus(me);
    confirmButton.disabled = !isMyTurn || v2State.actions.length === 0 || !paymentStatus.canPay || !!me?.queue_confirmed || v2State.queueSubmitting;
    confirmButton.textContent = v2State.queueSubmitting ? 'Resolving...' : paymentStatus.canPay ? 'Confirm' : 'Pay Energy';
    confirmButton.title = paymentStatus.canPay ? 'Confirm queued actions' : paymentStatus.reason;
    cancelButton.disabled = !isMyTurn || v2State.actions.length === 0 || !!me?.queue_confirmed || v2State.queueSubmitting;
    endTurnButton.disabled = !isMyTurn || v2State.queueSubmitting;
    newMatchButton.disabled = false;
    newMatchButton.textContent = 'New Match';
    window.__v2DebugState = {
        selectedCasterSlot: v2State.selectedCasterSlot,
        selectedSkillId: v2State.selectedSkillId,
        actionCount: v2State.actions.length,
        phase: state.phase,
        turnPlayerId: state.turn_player_id,
        replacementSkillSlots: v2ReplacementDebugEntries(me),
    };
}

function v2StartMatch() {
    if (!BATTLE_V2_ENABLED) {
        toast('Battle v2 is disabled for this server.');
        return;
    }
    if (v2State.playerTeam.length !== 3 || (v2State.matchMode === 'cpu' && v2State.enemyTeam.length !== 3)) {
        toast(v2State.matchMode === 'pvp' ? 'Choose exactly 3 starters.' : 'Choose exactly 3 starters for each side.');
        return;
    }
    const { name: nameInput, room: roomInput } = v2ReadLobbyFields();
    v2State.actions = [];
    v2State.wildcardPays = {};
    v2State.queueSubmitting = false;
    v2State.selectedCasterSlot = null;
    v2State.selectedSkillId = null;
    v2State.lobbyStatus = null;
    setV2UiScreen('team');
    if (v2State.matchMode === 'pvp') {
        socket.emit('battle_v2_join_pvp', {
            room_id: roomInput,
            player_name: nameInput,
            player_team: v2State.playerTeam,
        });
    } else {
        socket.emit('battle_v2_start_classic', {
            room_id: 'classic_v2_' + Math.random().toString(36).slice(2, 8),
            player_name: nameInput,
            player_team: v2State.playerTeam,
            enemy_team: v2State.enemyTeam,
        });
    }
    showScreen('classic-v2');
    renderClassicV2();
}

socket.on('battle_v2_update', (data) => {
    v2State.state = data;
    v2State.lobbyStatus = null;
    v2State.queueSubmitting = false;
    const { mine } = v2PlayerIds();
    const ownPending = data.pending_actions?.[mine] || [];
    const me = data.players?.[mine];
    if (ownPending.length) {
        v2State.actions = ownPending;
        v2State.wildcardPays = Object.fromEntries(ownPending.map(action => [action.id, action.wildcard_pays || []]));
    } else if (data.phase === 'planning' || data.phase === 'finished' || data.turn_player_id !== mine || me?.queue_confirmed) {
        v2State.actions = [];
        v2State.wildcardPays = {};
    }
    document.getElementById('v2-error')?.classList.add('hidden');
    showScreen('classic-v2');
    renderClassicV2();
});

socket.on('battle_v2_error', (data) => {
    v2State.queueSubmitting = false;
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
// Render cached panels without blocking core navigation bindings.
try {
    renderHistory();
    renderRosterLab();
} catch (error) {
    console.warn('Initial panel render failed', error);
}

document.getElementById('btn-roster-lab').addEventListener('click', () => {
    renderRosterLab();
    showScreen('roster-lab');
});

document.getElementById('btn-roster-back').addEventListener('click', () => {
    showScreen('setup');
});

const classicV2Button = document.getElementById('btn-classic-v2');
classicV2Button.addEventListener('click', () => {
    if (!BATTLE_V2_ENABLED) {
        toast('Battle v2 is disabled for this server.');
        return;
    }
    showScreen('classic-v2');
    setV2UiScreen('lobby');
    renderClassicV2();
});

socket.on('battle_v2_lobby', (data) => {
    v2State.state = null;
    v2State.lobbyStatus = data.status === 'cancelled' ? null : data;
    v2State.queueSubmitting = false;
    if (v2State.lobbyStatus?.status === 'waiting') setV2UiScreen('team');
    showScreen('classic-v2');
    renderClassicV2();
});
classicV2Button.disabled = !BATTLE_V2_ENABLED;

document.getElementById('btn-v2-back').addEventListener('click', () => {
    if (!v2State.state && v2State.uiScreen === 'team') {
        setV2UiScreen('lobby');
        renderClassicV2();
        return;
    }
    if (BATTLE_V2_ENABLED && !v2State.state) {
        setV2UiScreen('lobby');
        renderClassicV2();
        return;
    }
    showScreen('setup');
});

document.getElementById('btn-v2-start').addEventListener('click', v2StartMatch);
document.getElementById('btn-v2-new-match').addEventListener('click', resetClassicV2Match);
document.getElementById('btn-v2-cancel').addEventListener('click', () => {
    v2State.queueSubmitting = false;
    socket.emit('battle_v2_cancel_queue');
});
document.getElementById('btn-v2-end-turn').addEventListener('click', () => {
    if (v2State.queueSubmitting) return;
    v2State.actions = [];
    v2State.wildcardPays = {};
    v2State.selectedSkillId = null;
    v2State.queueSubmitting = true;
    renderClassicV2();
    socket.emit('battle_v2_end_turn');
});
document.getElementById('btn-v2-confirm').addEventListener('click', () => {
    if (v2ControlsLocked()) return;
    v2UpdateQueue();
    v2State.queueSubmitting = true;
    renderClassicV2();
    socket.emit('battle_v2_confirm_queue');
});

document.getElementById('classic-v2').addEventListener('click', (event) => {
    const resultAction = event.target.closest('[data-v2-result-action]');
    if (resultAction) {
        const action = resultAction.dataset.v2ResultAction;
        v2State.state = null;
        v2State.actions = [];
        v2State.wildcardPays = {};
        v2State.selectedCasterSlot = null;
        v2State.selectedSkillId = null;
        v2State.lobbyStatus = null;
        setV2UiScreen(action === 'rematch' ? 'team' : 'lobby');
        renderClassicV2();
        return;
    }

    const lobbyEntry = event.target.closest('[data-v2-enter-mode]');
    if (lobbyEntry) {
        v2State.matchMode = lobbyEntry.dataset.v2EnterMode === 'pvp' ? 'pvp' : 'cpu';
        v2State.lobbyStatus = null;
        setV2UiScreen('team');
        renderClassicV2();
        return;
    }

    const navButton = event.target.closest('[data-v2-nav]');
    if (navButton) {
        const destination = navButton.dataset.v2Nav;
        if (destination === 'lobby' || destination === 'history') {
            setV2UiScreen('lobby');
        } else {
            setV2UiScreen('team');
        }
        renderClassicV2();
        return;
    }

    const modeButton = event.target.closest('[data-v2-mode]');
    if (modeButton) {
        v2State.matchMode = modeButton.dataset.v2Mode === 'pvp' ? 'pvp' : 'cpu';
        v2State.lobbyStatus = null;
        renderClassicV2();
        return;
    }

    const controlsLocked = v2ControlsLocked();
    const picker = event.target.closest('[data-v2-pick-team]');
    if (picker) {
        const teamKey = picker.dataset.v2PickTeam;
        const characterId = picker.dataset.characterId;
        const team = v2State[teamKey];
        if (!Array.isArray(team)) return;
        if (team.includes(characterId)) {
            v2State[teamKey] = team.filter(id => id !== characterId);
        } else if (team.length < 3) {
            v2State[teamKey] = [...team, characterId];
        }
        renderV2Picker();
        return;
    }
    const convert = event.target.closest('.v2-convert-submit');
    if (convert) {
        if (convert.disabled || controlsLocked) return;
        socket.emit('battle_v2_convert_energy', {
            source: v2State.convertSource,
            target: v2State.convertTarget,
        });
        return;
    }
    const targetCard = event.target.closest('[data-v2-role][data-slot]');
    if (controlsLocked && targetCard) return;
    if (targetCard && v2State.selectedCasterSlot !== null && v2State.selectedSkillId) {
        const { mine, enemy } = v2PlayerIds();
        const side = targetCard.dataset.v2Side;
        const targetPlayerId = side === 'mine' ? mine : enemy;
        const targetPlayer = v2State.state?.players?.[targetPlayerId];
        const targetSlot = Number(targetCard.dataset.slot);
        const targetCharacter = targetPlayer?.team?.[targetSlot];
        if (v2CanTargetCharacter(targetCharacter, targetSlot, side === 'mine', true)) {
            v2AddAction(v2State.selectedCasterSlot, v2State.selectedSkillId, targetPlayerId, targetSlot);
            return;
        }
        toast('That target is not legal for this skill.');
        return;
    }
    const caster = event.target.closest('[data-v2-role="caster"]');
    if (controlsLocked && caster) return;
    if (caster) {
        v2State.selectedCasterSlot = Number(caster.dataset.slot);
        v2State.selectedSkillId = null;
        renderClassicV2();
        return;
    }
    const skill = event.target.closest('[data-skill-id]');
    if (controlsLocked && skill) return;
    if (skill && !skill.disabled) {
        v2State.selectedSkillId = skill.dataset.skillId;
        const { mine, enemy } = v2PlayerIds();
        const me = v2State.state.players[mine];
        const selectedCharacter = me?.team?.[v2State.selectedCasterSlot];
        const selectedSkill = selectedCharacter ? v2SkillFor(selectedCharacter.character_id, v2State.selectedSkillId, selectedCharacter) : null;
        const targetKind = selectedSkill?.target_rule?.kind || 'enemy';
        if (targetKind === 'self') {
            v2AddAction(v2State.selectedCasterSlot, v2State.selectedSkillId, mine, v2State.selectedCasterSlot);
            return;
        }
        if (targetKind === 'enemy_team') {
            const targetSlots = v2TeamTargetSlots(v2State.state.players[enemy], selectedSkill);
            if (!targetSlots.length) {
                toast('No legal targets for this skill.');
                return;
            }
            v2AddAction(v2State.selectedCasterSlot, v2State.selectedSkillId, enemy, null, targetSlots);
            return;
        }
        if (targetKind === 'ally_team') {
            const targetSlots = v2TeamTargetSlots(me, selectedSkill);
            if (!targetSlots.length) {
                toast('No legal targets for this skill.');
                return;
            }
            v2AddAction(v2State.selectedCasterSlot, v2State.selectedSkillId, mine, null, targetSlots);
            return;
        }
        toast(targetKind === 'ally' ? 'Choose an allied target.' : 'Choose an enemy target.');
        renderClassicV2();
        return;
    }
    const remove = event.target.closest('.v2-remove');
    if (controlsLocked && remove) return;
    if (remove) {
        v2State.actions = v2State.actions.filter(action => action.id !== remove.dataset.actionId);
        delete v2State.wildcardPays[remove.dataset.actionId];
        v2SubmitPlan();
        renderClassicV2();
        return;
    }
    const move = event.target.closest('.v2-move');
    if (controlsLocked && move) return;
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

window.addEventListener('jjk:v2-arena-click', (event) => {
    const detail = event.detail || {};
    const side = detail.side === 'enemy' ? 'enemy' : 'mine';
    const slot = Number(detail.slot);
    if (!Number.isFinite(slot)) return;
    const button = document.querySelector(`#classic-v2 [data-v2-side="${side}"][data-slot="${slot}"]`);
    button?.click();
});

document.getElementById('classic-v2').addEventListener('change', (event) => {
    const sourceSelect = event.target.closest('.v2-convert-source');
    if (sourceSelect) {
        v2State.convertSource = sourceSelect.value;
        if (v2State.convertTarget === v2State.convertSource) {
            v2State.convertTarget = ['green', 'red', 'blue', 'white'].find(color => color !== v2State.convertSource) || 'green';
        }
        renderClassicV2();
        return;
    }
    const targetSelect = event.target.closest('.v2-convert-target');
    if (targetSelect) {
        v2State.convertTarget = targetSelect.value;
        renderClassicV2();
        return;
    }
    const select = event.target.closest('.v2-wildcard-select');
    if (!select) return;
    if (v2ControlsLocked()) return;
    const actionId = select.dataset.actionId;
    const payIndex = Number(select.dataset.payIndex);
    const pays = v2State.wildcardPays[actionId] || [];
    pays[payIndex] = select.value;
    v2State.wildcardPays[actionId] = pays.filter(Boolean);
    v2UpdateQueue();
    renderClassicV2();
});

['v2-player-name', 'player-name'].forEach(id => {
    const field = document.getElementById(id);
    field?.addEventListener('input', (event) => {
        const value = event.target.value;
        v2SyncFieldPair('v2-player-name', 'player-name', value);
        v2SetStoredValue('jjk_player_name', value);
    });
});

['v2-room-id', 'room-id'].forEach(id => {
    const field = document.getElementById(id);
    field?.addEventListener('input', (event) => {
        const value = event.target.value;
        v2SyncFieldPair('v2-room-id', 'room-id', value);
        v2SetStoredValue('jjk_room_id', value);
    });
});

hydrateV2LobbyFields();
if (BATTLE_V2_ENABLED) {
    showScreen('classic-v2');
    setV2UiScreen('lobby');
    renderClassicV2();
}

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

// Stitch arena energy rack override for Battle v2.
function renderEnergyPool(energy) {
    if (!energy) return '';
    const colors = [
        { key: 'red', label: 'Blood' },
        { key: 'blue', label: 'Curse' },
        { key: 'green', label: 'Focus' },
        { key: 'white', label: 'Strat' },
    ];
    const total = colors.reduce((sum, { key }) => sum + Number(energy[key] || 0), 0);
    const cap = Math.max(10, total);
    const chips = colors.map(({ key, label }) => v2EnergyOrbHTML(key, 'w-5 h-5', energy[key] || 0).replace(`title="${esc(key)}"`, `title="${esc(label)} ${energy[key] || 0}"`)).join('');
    return `
      <div class="flex items-center gap-2 bg-charcoal-plate/80 backdrop-blur-md rounded-full px-4 py-2 border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        ${chips}
        <span class="font-tactical-data text-tactical-data ml-2 text-on-surface-variant">${total}/${cap}</span>
      </div>`;
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
