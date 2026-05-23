// ────────────────────────────────────────────────────────────────────────
// Draft.jsx — the main drafting screen.
// Header / turn bar / face-down OR decide state / action bar.
// ────────────────────────────────────────────────────────────────────────

const MAX_TEAM = 5;
const Draft_STATE = { DRAW: 0, DECIDE: 1, DONE: 2 };

function Draft({ players, allChars, onFinish, onOpenBrowse }) {
  const [game, setGame] = React.useState(() => makeGame(players, allChars));
  const toast = useToast();
  const cur = game.players[game.idx];

  function commit(g) { setGame({ ...g }); }

  function doDraw() {
    JJK.AudioBus.draw();
    JJK.shake(180);
    const card = g_draw(game);
    if (game.cur.passUsed) {
      toast.push(`${cur.name} drew ${card.name} (auto‑kept).`);
    } else {
      toast.push(`${cur.name} drew ${card.name}.`);
    }
    commit(game);
    if (game.state === Draft_STATE.DONE) setTimeout(() => onFinish(game), 600);
  }

  function doKeep() {
    JJK.AudioBus.keep();
    const card = game.drawn;
    g_keep(game);
    toast.push(`${cur.name} kept ${card.name}.`);
    commit(game);
    if (game.state === Draft_STATE.DONE) setTimeout(() => onFinish(game), 600);
  }

  function doPass() {
    if (cur.passUsed) return;
    JJK.AudioBus.pass();
    JJK.shake(220);
    const card = g_pass(game);
    toast.push(`${cur.name} passed → ${card.name} (auto‑kept).`);
    commit(game);
    if (game.state === Draft_STATE.DONE) setTimeout(() => onFinish(game), 600);
  }

  // Round number: every player has the same pick‑count once a round closes.
  const round = Math.min(Math.floor(game.players.reduce((s,p)=>s+p.team.length,0) / game.players.length) + 1, MAX_TEAM);
  const deckLeft = game.deck.length;

  return (
    <section className="screen active" id="draft">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">呪</span>
          <span className="header-title">Fantasy Draft</span>
        </div>
        <div className="header-right">
          <span className="deck-badge" title="Deck remaining">{deckLeft} left</span>
          <span className="round-badge">R{round} / {MAX_TEAM}</span>
          <button className="icon-btn" onClick={onOpenBrowse} title="Browse roster"><Icon.Grid/></button>
        </div>
      </header>

      <div className="turn-bar">
        <div className="turn-avatar">{cur.name[0].toUpperCase()}</div>
        <div className="turn-text">
          <div className="turn-name">{cur.name}</div>
          <div className="turn-hint">
            {game.state === Draft_STATE.DRAW
              ? 'Tap the talisman to draw'
              : cur.passUsed ? 'Keep — your pass is spent' : 'Keep, or pass once for a redraw'}
          </div>
        </div>
        <div className="turn-pips">
          {Array.from({ length: MAX_TEAM }).map((_, i) =>
            <div key={i} className={`pip ${i < cur.team.length ? 'done' : ''}`} />)}
        </div>
      </div>

      <div className="draft-body">
        {game.state === Draft_STATE.DRAW ? (
          <div className="draw-state">
            <div className="face-down" onClick={doDraw}>
              <div className="face-kanji">呪</div>
              <div className="face-label">TAP TO DRAW</div>
            </div>
            <div className="draw-hint">Round {round} of {MAX_TEAM}</div>
          </div>
        ) : (
          <div className="decide-state">
            <CharCard char={game.drawn}/>
          </div>
        )}
      </div>

      <div className="action-bar">
        {game.state === Draft_STATE.DRAW ? (
          <button className="action-btn btn-draw" onClick={doDraw} onMouseEnter={()=>JJK.AudioBus.hover()}>
            <Icon.Draw/> Draw
          </button>
        ) : (
          <React.Fragment>
            <button className="action-btn btn-keep" onClick={doKeep} onMouseEnter={()=>JJK.AudioBus.hover()}>
              <Icon.Check/> Keep
            </button>
            <button className="action-btn btn-pass" onClick={doPass} disabled={cur.passUsed}
                    onMouseEnter={()=>JJK.AudioBus.hover()}>
              <Icon.X/> {cur.passUsed ? 'Pass spent' : 'Pass'}
            </button>
          </React.Fragment>
        )}
      </div>

      {toast.node}
    </section>
  );
}

// ── Game engine — mutates in place; React state is just a re‑render hook
function makeGame(playerNames, allChars) {
  return {
    players: playerNames.map((n, i) => ({ id: i, name: n, team: [], passUsed: false })),
    deck: shuffle([...allChars]),
    idx: 0,
    state: Draft_STATE.DRAW,
    drawn: null,
    get cur() { return this.players[this.idx]; },
  };
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pop(deck, all) {
  return deck.length ? deck.pop() : all[Math.floor(Math.random() * all.length)];
}
function g_advance(g) {
  g.drawn = null;
  const n = g.players.length;
  if (g.players.every(p => p.team.length >= MAX_TEAM)) { g.state = Draft_STATE.DONE; return; }
  let tries = 0;
  do { g.idx = (g.idx + 1) % n; tries++; } while (g.cur.team.length >= MAX_TEAM && tries < n);
  g.state = Draft_STATE.DRAW;
}
function g_draw(g) {
  const card = pop(g.deck, g.deck);
  g.drawn = card;
  if (g.cur.passUsed) {
    g.cur.team.push(card);
    g_advance(g);
  } else {
    g.state = Draft_STATE.DECIDE;
  }
  return card;
}
function g_keep(g) {
  if (g.state !== Draft_STATE.DECIDE) return;
  g.cur.team.push(g.drawn);
  g_advance(g);
}
function g_pass(g) {
  if (g.state !== Draft_STATE.DECIDE || g.cur.passUsed) return;
  g.cur.passUsed = true;
  const card = pop(g.deck, g.deck);
  g.drawn = card;
  g.cur.team.push(card);
  g_advance(g);
  return card;
}

Object.assign(window, { Draft });
