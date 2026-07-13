Chunky, beveled tactile CTA button — use for any primary tap action (Battle, Confirm, Claim).

```jsx
<Button variant="primary" size="lg" fullWidth onClick={startBattle}>
  Battle
</Button>
```

Variants: `primary` (violet, default CTA), `gold` (currency/reward actions), `secondary` (neutral panel action), `ghost` (tertiary/cancel), `danger` (surrender/delete). Sizes `sm`/`md`/`lg`. Pass `disabled` to gray it out; `icon` for a leading glyph.
