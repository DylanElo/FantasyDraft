Command-dock technique card shown in Combat for the selected fighter's four skills.

```jsx
<SkillCard name="Divergent Fist" cost={['B','B']} cooldown={0} effect="Delayed second hit, +12 dmg" state="ready" onClick={selectSkill} />
```

`state` drives the disabled treatment: `ready` (tappable), `cooldown`/`energy`/`stunned` (dimmed + reason label, not tappable). `cost` renders as colored energy pips using the 5 energy tokens.
