// ────────────────────────────────────────────────────────────────────────
// Browse.jsx — character roster: faction tabs + search + grid.
// (Addresses heuristic gap 5.1 — no search — in the original UI.)
// ────────────────────────────────────────────────────────────────────────

function Browse({ allChars, onBack, onPick }) {
  const [faction, setFaction] = React.useState('all');
  const [q, setQ] = React.useState('');

  const counts = React.useMemo(() => {
    const c = { all: allChars.length };
    FACTION_KEYS.forEach(k => c[k] = 0);
    allChars.forEach(ch => { const f = FACTION[ch.name] || 'other'; c[f] = (c[f] || 0) + 1; });
    return c;
  }, [allChars]);

  const filtered = allChars
    .filter(c => faction === 'all' || (FACTION[c.name] || 'other') === faction)
    .filter(c => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <section className="screen active" id="browse">
      <header className="app-header">
        <button className="icon-btn" onClick={onBack}><Icon.ArrowLeft/></button>
        <span className="header-title">Characters</span>
        <div style={{ width: 40 }}/>
      </header>

      <div className="browse-search">
        <input className="search-field" placeholder="Search characters…"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="faction-bar">
        <button className={`f-tab ${faction === 'all' ? 'active' : ''}`} onClick={() => setFaction('all')}>
          All <span className="f-count">{counts.all}</span>
        </button>
        {FACTION_KEYS.map(k => (
          <button key={k} className={`f-tab ${faction === k ? 'active' : ''}`} onClick={() => setFaction(k)}>
            {FACTION_LABEL[k]} <span className="f-count">{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      <div className="char-grid">
        {filtered.map(c => <CharThumb key={c.name} char={c} onClick={() => onPick && onPick(c)} />)}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--jjk-muted)' }}>
            No sorcerers match “{q}”.
          </div>
        )}
      </div>
    </section>
  );
}

Object.assign(window, { Browse });
