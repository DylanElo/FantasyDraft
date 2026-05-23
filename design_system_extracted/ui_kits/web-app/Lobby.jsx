// ────────────────────────────────────────────────────────────────────────
// Lobby.jsx — parallaxing shrine background, kanji seal logo,
// player count + name inputs, Begin Draft + Browse CTAs.
// ────────────────────────────────────────────────────────────────────────

function Lobby({ onStart, onBrowse }) {
  const [count, setCount] = React.useState(2);
  const [names, setNames] = React.useState(['', '', '', '']);
  const shrineRef = React.useRef(null);
  const embersRef = React.useRef(null);
  const firstNameRef = React.useRef(null);

  React.useEffect(() => {
    const off = JJK.attachParallax(shrineRef.current);
    JJK.spawnEmbers(embersRef.current, 18);
    setTimeout(() => firstNameRef.current && firstNameRef.current.focus(), 200);
    return off;
  }, []);

  function updateName(i, v) {
    setNames(prev => { const next = [...prev]; next[i] = v; return next; });
  }

  function go() {
    const final = names.slice(0, count).map((n, i) => n.trim() || `Player ${i + 1}`);
    onStart(final);
  }

  function onKey(e, i) {
    if (e.key === 'Enter') {
      const inputs = document.querySelectorAll('.name-field');
      if (i < count - 1) inputs[i + 1] && inputs[i + 1].focus();
      else go();
    }
  }

  return (
    <section className="screen active" id="lobby">
      <div className="shrine-bg" ref={shrineRef}>
        <div className="shrine-layer far"/>
        <div className="shrine-layer mid"/>
        <div className="embers" ref={embersRef}/>
      </div>
      <div className="lobby-wrap">
        <div className="lobby-inner">
          <div className="logo-block">
            <div className="logo-kanji">呪</div>
            <div className="logo-jjk">JJK</div>
            <div className="logo-sub">FANTASY DRAFT</div>
            <p className="logo-tagline">Build your cursed team</p>
          </div>

          <div className="setup-form">
            <div className="form-group">
              <div className="form-label">Players</div>
              <div className="count-row">
                {[2,3,4].map(n => (
                  <button key={n}
                    className={`count-btn ${count === n ? 'active' : ''}`}
                    onMouseEnter={() => JJK.AudioBus.hover()}
                    onClick={() => { JJK.AudioBus.click(); setCount(n); }}>{n}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div className="form-label">Names</div>
              {Array.from({ length: count }).map((_, i) => (
                <div className="name-row" key={i}>
                  <div className="name-pill">{['一','二','三','四'][i]}</div>
                  <input
                    ref={i === 0 ? firstNameRef : null}
                    className="name-field"
                    type="text"
                    placeholder={`Sorcerer ${i+1}`}
                    value={names[i]}
                    onChange={(e) => updateName(i, e.target.value)}
                    onKeyDown={(e) => onKey(e, i)}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <PrimaryButton onClick={() => { JJK.shake(280); go(); }}>
              Begin Draft <Icon.ArrowRight size={18}/>
            </PrimaryButton>
            <PrimaryButton type="ghost" onClick={onBrowse}>Browse Characters</PrimaryButton>
          </div>

          <div className="energy-legend">
            <div className="legend-title">Energy types</div>
            <div className="legend-row">
              <span className="legend-item"><Orb kind="green" size="lg"/> Physical</span>
              <span className="legend-item"><Orb kind="red" size="lg"/> Bloodline</span>
              <span className="legend-item"><Orb kind="blue" size="lg"/> Curse</span>
              <span className="legend-item"><Orb kind="white" size="lg"/> Strategic</span>
              <span className="legend-item"><Orb kind="black" size="lg"/> General</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Lobby });
