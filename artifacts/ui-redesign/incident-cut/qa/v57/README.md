# Incident Cut combat QA — v57

- Origin: `http://127.0.0.1:5000/?qa=v57`
- Browser: Codex in-app Chromium browser.
- Console: 0 warnings, 0 errors after the final viewport pass.
- Interaction path: CPU Practice -> Team Setup -> Matchup -> Combat; exercised Planning, Orders Open, Queue Review, pass/resolution, status presentation, and live in-place resizing.
- Runtime canvas measurements: 360x800, 390x844, and 430x932 exactly.
- Capture caveat: the browser screenshot API omitted the final scanline at 390x844 and 430x932; the live DOM, shell, and Phaser canvas measurements remained exact.

| Capture | Viewport / canvas | PNG pixels | SHA-256 |
| --- | --- | --- | --- |
| `360x800-combat.png` | 360x800 | 360x800 | `6D625941FE5A4B574EA277123B99B3B4E79C1D6BB8AC88C4F7DADD4DAACFF10F` |
| `390x844-combat.png` | 390x844 | 390x843 | `AD4C4F843690BA8B54488D322F39D719DF8D0909E310B8CA9C974D8D45217DA1` |
| `430x932-combat.png` | 430x932 | 430x931 | `7F3D061A172047A5E42A1D2C1F808C62968D27E71B1FA4038121B8552BB55B9A` |
| `360x800-resolution.png` | 360x800 | 360x800 | `08B085163696DB58845E3DFC498B1905B072BD5937695E35C735683605B2F717` |

This is dirty-worktree implementation evidence, not release evidence tied to a committed SHA.
