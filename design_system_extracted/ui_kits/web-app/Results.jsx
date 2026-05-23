// ────────────────────────────────────────────────────────────────────────
// Results.jsx — trophy, ink-brush winner reveal, animated standings,
// + 領域展開 cinematic flash when first revealed.
// ────────────────────────────────────────────────────────────────────────

function Results({ players, onPlayAgain, onSameLineup }) {
  const standings = React.useMemo(() => {
    return players
      .map(p => ({ name: p.name, score: scoreTeam(p.team), team: p.team }))
      .sort((a, b) => b.score - a.score);
  }, [players]);

  React.useEffect(() => {
    JJK.domainExpansion();
  }, []);

  const medals = ['🥇','🥈','🥉','4️⃣'];

  return (
    <section className="screen active" id="results">
      <div className="bg-glow" style={{ background: '#f59e0b', width: 480, height: 480, top: -120, left: '50%', transform: 'translateX(-50%)', opacity: 0.18 }}/>
      <div className="results-wrap">
        <div className="results-inner">
          <div className="trophy-block">
            <span className="trophy"><Icon.Trophy size={96}/></span>
            <div className="winner-stage">
              <h2 className="winner-name" key={standings[0].name}>{standings[0].name}</h2>
              <div className="winner-sub">Wins the Draft</div>
            </div>
          </div>

          <div className="standings">
            {standings.map((s, i) => (
              <div key={s.name + i} className={`standing-row ${i === 0 ? 'is-winner' : ''}`}>
                <div className="stand-rank">{medals[i] || '·'}</div>
                <div className="stand-info">
                  <div className="stand-name">{s.name}</div>
                  <div className="stand-pts">{s.score} pts</div>
                  <div className="stand-team">
                    {s.team.map((c, j) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="sep">·</span>}
                        {c.name}
                      </React.Fragment>
                    ))}
                    {s.team.length === 0 && '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="results-actions">
            <PrimaryButton onClick={onSameLineup}>Same Lineup <Icon.ArrowRight size={18}/></PrimaryButton>
            <PrimaryButton type="ghost" onClick={onPlayAgain}>New Game</PrimaryButton>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Results });
