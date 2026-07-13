Bottom tab bar for the app shell — Home, Roster, an elevated hero Battle button, Missions, Profile.

```jsx
<TabBar
  tabs={[
    { id: 'home', label: 'Home', icon: <Home size={18} /> },
    { id: 'roster', label: 'Roster', icon: <Users size={18} /> },
    { id: 'battle', label: 'Battle', icon: <Swords size={24} />, hero: true },
    { id: 'missions', label: 'Missions', icon: <Map size={18} /> },
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
  ]}
  activeId="home"
  onChange={setTab}
/>
```
