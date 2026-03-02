# Swipe Lab — Slice 5: Glitch Diagnosis Checklist

This slice adds **no behavior changes**. It provides a **decision-tree** to interpret what you observe with the Slice 4 toggles.

You already have:
- `DeckProbeCard` per card (shows `m#` mount instance + `r#` render count + input state)
- A/B toggles on **Feed** (`/trade`) and **Settings deck** (`/deck-settings`)

---

## What counts as “the glitch”
Any of these signals means **content is being remounted or swapped**:

1) **Remount**
- You come back to the **same card id** (ex: `C07`)
- `m#` changes (ex: `m12 → m13`)
- Your typed text resets

2) **Content swap / flash**
- You swipe to `C07` but briefly see `C06` content (wrong CARD label)
- Then it “snaps” to the correct one

3) **Unexpected unmount log**
- Console shows `[DeckProbeCard] unmount` for a card that should remain in the visible stack.

> Note: `r#` increasing is normal (re-render). **`m#` changing is the red flag** (remount).

---

## Feed deck (`/trade`) — Toggle meaning

### Toggles
- **Render back card bodies**
  - ON: body is mounted for the visible stack (top + back cards)
  - OFF: only the top card body is mounted; back cards show a shell

- **Use content-owner gating**
  - ON: only the “owner” card renders the heavy body; prevents duplicates / cross-wiring
  - OFF: each visible card renders its own body directly

### Decision tree (Feed)

#### Case F1 — Glitch happens only when **Render back card bodies = OFF**
✅ Root cause: *Top-only body mounting.*
- When a card becomes top, its body mounts (fresh state) → looks like a “reload”.

**Fix pattern (real app):**
- Keep body mounted for at least the visible stack (top + N back cards).
- If performance is a concern, mount simplified bodies for back cards, but keep keys/state stable.

#### Case F2 — Glitch happens only when **content-owner gating = OFF**
✅ Root cause: *duplicate body mounts / owner switching.*
- Multiple cards render the same sub-tree (or fight over shared resources), then React reconciles and swaps.

**Fix pattern (real app):**
- Keep content-owner gating ON (or enforce that only one card renders the “real” content subtree).
- Ensure any shared state is keyed by `cardId`.

#### Case F3 — Glitch happens even when both are ON
✅ Likely root cause: **unstable keys** (the most common “wrong content flash” cause).
Examples:
- `key={index}` anywhere in the card stack
- `key` derived from `activeIndex` / position in stack
- any `Math.random()`/timestamp in a key
- changing the array identity or re-sorting without stable ids

**Fix pattern (real app):**
- Ensure the card root uses `key={card.id}` (stable, unique).
- Avoid index keys in any mapped child lists inside the card body.
- Keep the cards array stable (don’t recreate objects every render if keys depend on object identity).

---

## Settings deck (`/deck-settings`) — Toggle meaning

### Toggles
- **Keep all cards mounted**
  - ON: `maxVisible = ALL` (matches your main project anti-glitch rule)
  - OFF: `maxVisible = 3` (virtualizes / unmounts cards outside the window)

- **Render stack card bodies**
  - ON: body is mounted for visible stack (not only top)
  - OFF: only top body is mounted

- **Use content-owner gating**
  - Same meaning as Feed

### Decision tree (Settings)

#### Case S1 — Glitch happens only when **Keep all cards mounted = OFF**
✅ Root cause: *virtualization/unmount outside visible window.*
- Cards are intentionally unmounted when not visible → state resets on return.

**Fix pattern (real app):**
- Keep `maxVisible = numberOfCards` (or persist per-card state outside card bodies).
- If you must virtualize, store the card state keyed by `sectionId` in a parent store.

#### Case S2 — Glitch happens only when **Render stack card bodies = OFF**
✅ Root cause: *top-only mounting (same as Feed Case F1).*

**Fix pattern (real app):**
- Keep back card bodies mounted at least for the visible stack.

#### Case S3 — Glitch happens only when **content-owner gating = OFF**
✅ Root cause: *duplicate mounts / switching owners (same as Feed Case F2).*

#### Case S4 — Glitch happens even with (Keep all mounted ON + stack bodies ON + gating ON)
✅ Almost certainly **unstable keys** (same as Feed Case F3).

---

## What to capture (so we can lock the real fix)
When you find the first toggle combo that reproduces the glitch, capture:

1) Screen recording showing:
- the **toggle states**
- the **CARD id** label
- the probe’s `m#` changing or the wrong card flashing

2) Console logs around the moment (mount/unmount lines)

3) Which screen: Feed (`/trade`) or Settings (`/deck-settings`)

---

## If you want a “safe default”
If your goal is **zero glitch** (even at some perf cost), these settings typically eliminate it:

- Feed: **Render back card bodies = ON** and **content-owner gating = ON**
- Settings: **Keep all cards mounted = ON**, **Render stack card bodies = ON**, **content-owner gating = ON**

If that still glitches → it’s almost always **key stability**.

---
