/* Cursed Arena — app shell: phone canvas, screen router, tab bar. */

const { TabBar } = window.CursedArenaDesignSystem_845983;

function App() {
  const [screen, setScreen] = React.useState('home');
  const go = setScreen;
  const inBattle = screen === 'combat' || screen === 'results';

  const body = {
    home: <window.LobbyScreen go={go} />,
    roster: <window.RosterScreen />,
    team: <window.TeamScreen go={go} />,
    combat: <window.CombatScreen go={go} />,
    results: <window.ResultsScreen go={go} />,
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
        <TabBar
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

window.CAApp = App;
