Bottom sheet for Queue Review, character detail, and confirmation modals. Position its parent `relative` so the sheet covers the phone canvas, not the whole viewport.

```jsx
<Sheet open={reviewing} title="Queue Review" onClose={() => setReviewing(false)}>
  ...queued actions...
</Sheet>
```
