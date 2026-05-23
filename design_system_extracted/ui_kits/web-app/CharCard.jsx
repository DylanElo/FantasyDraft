// ────────────────────────────────────────────────────────────────────────
// CharCard.jsx — the headline AAA card.
//   • 3D tilt that tracks the cursor (effects.tilt)
//   • Holographic foil layer reacting to the tilt angle
//   • Particle smoke entrance
//   • Faction‑colored border
//   • Skill rows with ULT badge on the longest‑cooldown skill
// ────────────────────────────────────────────────────────────────────────

function CharCard({ char, smoke = true }) {
  const frameRef = React.useRef(null);

  React.useEffect(() => {
    if (!frameRef.current) return;
    const off = JJK.tilt(frameRef.current);
    return off;
  }, [char]);

  if (!char) return null;
  const faction = FACTION[char.name] || 'other';
  const hasImg = char.image_url && !char.image_url.includes('placeholder');

  return (
    <div ref={frameRef} className={`char-card-frame ${smoke ? 'smoke' : ''}`}>
      <div className={`char-card faction-${faction}`}>
        {hasImg ? (
          <div className="char-art" style={{ backgroundImage: `url('${char.image_url}')` }} />
        ) : (
          <div className="char-art">
            <div className="char-art-fallback">呪</div>
          </div>
        )}
        <div className="char-namebar">
          <div className="char-name">{char.name}</div>
          <FactionBadge name={char.name} />
        </div>
        <div className="char-body">
          <p className="char-desc">{char.description}</p>
          <div className="skills-list">
            {(char.skills || []).map((s, i) => <SkillRow key={i} char={char} skill={s} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Smaller thumb used in browse / panel
function CharThumb({ char, onClick }) {
  const faction = FACTION[char.name] || 'other';
  const hasImg = char.image_url && !char.image_url.includes('placeholder');
  return (
    <div className={`char-thumb faction-${faction}`}
         onMouseEnter={() => JJK.AudioBus.hover()}
         onClick={() => { JJK.AudioBus.click(); onClick && onClick(char); }}>
      <div className="char-thumb-art"
           style={hasImg ? { backgroundImage: `url('${char.image_url}')` } : {}}>
        <div className="char-thumb-info">
          <div className="char-thumb-name">{char.name}</div>
          <div className="char-thumb-faction">{FACTION_LABEL[faction]}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CharCard, CharThumb });
