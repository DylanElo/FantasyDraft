/* Cursed Arena V2 — shell + router. */

const { TabBar: TabBarV2 } = window.CursedArenaDesignSystem_845983;

function AppV2() {
  const [screen, setScreen] = React.useState('home');
  const go = setScreen;
  const inBattle = screen === 'combat' || screen === 'results';

  const body = {
    home: <window.LobbyV2 go={go} />,
    roster: <window.RosterV2 />,
    team: <window.TeamV2 go={go} />,
    combat: <window.CombatV2 go={go} />,
    results: <window.ResultsV2 go={go} />,
  }[screen];

  return (
    <div style={{
      width: 390, height: 844, display: 'flex', flexDirection: 'column',
      background: 'var(--surface-app-grad)', color: 'var(--text-on-dark)',
      borderRadius: 24, overflow: 'hidden', border: '2px solid var(--ink-950)',
      fontFamily: 'var(--font-ui)', position: 'relative',
    }} data-screen-label={screen}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{body}</div>
      {!inBattle && (
        <TabBarV2
          activeId={screen === 'team' ? 'battle' : screen}
          onChange={(id) => go(id === 'battle' ? 'team' : id)}
          tabs={[
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'roster', label: 'Roster', icon: '🗂' },
            { id: 'battle', label: 'Battle', icon: '⚔', hero: true },
            { id: 'missions', label: 'Missions', icon: '🗺' },
            { id: 'profile', label: 'Profile', icon: '👤' },
          ]}
        />
      )}
    </div>
  );
}

window.CAAppV2 = AppV2;
