// ────────────────────────────────────────────────────────────────────────
// app.jsx — orchestrator. Loads characters then routes between screens.
// Renders Tweaks panel for AAA mode / mute toggles.
// ────────────────────────────────────────────────────────────────────────

const SCREEN = { LOBBY: 'lobby', DRAFT: 'draft', RESULTS: 'results', BROWSE: 'browse', CARD_PEEK: 'peek' };

function App() {
  const [screen, setScreen] = React.useState(SCREEN.LOBBY);
  const [allChars, setAllChars] = React.useState([]);
  const [players, setPlayers] = React.useState(null);
  const [lastNames, setLastNames] = React.useState(null);
  const [finalGame, setFinalGame] = React.useState(null);
  const [peekChar, setPeekChar] = React.useState(null);

  // Tweaks
  const [aaa, setAaa] = React.useState(true);
  const [muted, setMuted] = React.useState(true); // mute by default — auto-play hostile

  React.useEffect(() => {
    window.__JJK_AAA = aaa;
  }, [aaa]);

  React.useEffect(() => {
    JJK.AudioBus.mute(muted);
  }, [muted]);

  React.useEffect(() => {
    loadCharacters().then(setAllChars).catch(() => setAllChars([]));
  }, []);

  function startDraft(names) {
    if (!allChars.length) return;
    setLastNames(names);
    setPlayers(names);
    setScreen(SCREEN.DRAFT);
  }

  function finishDraft(game) {
    setFinalGame(game);
    setScreen(SCREEN.RESULTS);
  }

  return (
    <div className="app-stage">
      {screen === SCREEN.LOBBY && (
        <Lobby onStart={startDraft} onBrowse={() => setScreen(SCREEN.BROWSE)} />
      )}
      {screen === SCREEN.DRAFT && (
        <Draft players={players} allChars={allChars}
               onFinish={finishDraft}
               onOpenBrowse={() => setScreen(SCREEN.BROWSE)} />
      )}
      {screen === SCREEN.RESULTS && finalGame && (
        <Results
          players={finalGame.players}
          onPlayAgain={() => { setFinalGame(null); setPlayers(null); setScreen(SCREEN.LOBBY); }}
          onSameLineup={() => { setFinalGame(null); startDraft(lastNames); }}
        />
      )}
      {screen === SCREEN.BROWSE && (
        <Browse allChars={allChars}
                onBack={() => setScreen(players ? SCREEN.DRAFT : SCREEN.LOBBY)}
                onPick={(c) => setPeekChar(c)} />
      )}

      {peekChar && (
        <div className="peek-scrim" onClick={() => setPeekChar(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex: 70, display:'flex', alignItems:'center', justifyContent:'center', padding:18, backdropFilter:'blur(6px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width:'min(380px, 100%)' }}>
            <CharCard char={peekChar} smoke={false}/>
            <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setPeekChar(null)}>Close</button>
          </div>
        </div>
      )}

      <TweaksPanel
        aaa={aaa} setAaa={setAaa}
        muted={muted} setMuted={setMuted}
        onDemoUlt={() => JJK.domainExpansion()}
        onDemoShake={() => JJK.shake(420)}
        onDemoFlash={() => JJK.flash()}
      />
    </div>
  );
}

// ── Tweaks panel (visible when "Tweaks" toggle is on in the toolbar) ───
function TweaksPanel({ aaa, setAaa, muted, setMuted, onDemoUlt, onDemoShake, onDemoFlash }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e.data && e.data.type;
      if (t === '__activate_edit_mode')   setOpen(true);
      if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent && window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', right: 18, bottom: 18, width: 280, zIndex: 200,
      background: 'rgba(14,14,38,0.96)', border: '1px solid var(--jjk-border-hi)',
      borderRadius: 16, padding: 16, color: 'var(--jjk-text)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 14, letterSpacing: 1 }}>Tweaks</div>
        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => {
          setOpen(false);
          window.parent && window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
        }}><Icon.X size={14}/></button>
      </div>

      <Toggle label="AAA Mode" subtitle="Tilt, foil, shake, particles" value={aaa} onChange={setAaa}/>
      <Toggle label="Audio" subtitle="Synthesised SFX" value={!muted} onChange={(v) => setMuted(!v)}/>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--jjk-muted)', textTransform:'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Demo</div>
        <DemoBtn onClick={onDemoUlt}>Domain Expansion (Ultimate)</DemoBtn>
        <DemoBtn onClick={onDemoShake}>Screen Shake</DemoBtn>
        <DemoBtn onClick={onDemoFlash}>Hit Flash</DemoBtn>
      </div>
    </div>
  );
}

function Toggle({ label, subtitle, value, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:12, padding: '8px 0', cursor:'pointer' }}>
      <div style={{
        width: 38, height: 22, borderRadius: 100, position:'relative',
        background: value ? 'var(--jjk-purple)' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s',
        boxShadow: value ? '0 0 12px rgba(124,58,237,0.5)' : 'none',
      }}>
        <div style={{
          position:'absolute', top:2, left: value ? 18 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.18s ease-out',
        }}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 10, color: 'var(--jjk-muted)' }}>{subtitle}</div>}
      </div>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ display: 'none' }}/>
    </label>
  );
}

function DemoBtn({ onClick, children }) {
  return (
    <button className="btn-ghost" style={{ height: 36, fontSize: 12, fontWeight: 700 }} onClick={onClick}>
      {children}
    </button>
  );
}

Object.assign(window, { App, TweaksPanel });
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
