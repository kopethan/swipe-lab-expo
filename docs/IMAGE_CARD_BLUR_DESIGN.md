# Image Card Blur Design

This document describes the **full-bleed image card** prototype added to the lab.

Route:
- `/image-card`

Component:
- `components/prototype/full-bleed-blur-card.tsx`

The goal is to keep this pattern **portable** so it can later be reused inside other projects, feeds, decks, or detail pages with minimal visual drift.

---

## Purpose

This card pattern is meant for image-first surfaces where the image should feel immersive and edge-to-edge, while the lower part of the card becomes more readable for overlay content.

The design direction is:
- **no visible border**
- **image fills the full card area**
- **soft atmospheric fade near the bottom**
- **no visible seam** where the effect begins
- usable with **rectangle** and **square** formats

---

## Current prototype behavior

The current lab prototype includes:
- one **horizontal rectangle** demo
- one **perfect square** demo
- a bottom overlay effect that begins around **50% of the card height**
- a fade that transitions from **almost invisible** in the middle to **more visible** near the bottom edge

The effect is intentionally designed so users should **not clearly detect the starting line** of the blur/tint region.

---

## Visual rules

### 1. Full-bleed image
The background image should fully fill the card.

Rules:
- no inner padding around the image
- no framed-photo look
- no border line around the visual area
- image should crop naturally when aspect ratios differ

Use this when the image itself is the main visual surface.

### 2. Soft bottom atmospheric fade
The lower half of the card should gradually become easier to place text or UI on top of.

The transition should feel:
- soft
- progressive
- almost invisible at the start
- stronger only near the bottom quarter

Important:
- the effect should **not** look like a hard gradient band
- the effect should **not** reveal a clear “start line”
- the effect should **not** suddenly switch from sharp image to blurred/tinted image

### 3. Blur-like feeling, not a harsh overlay
In this prototype, the visual goal is a **blur-like atmospheric support layer**, not a heavy dark mask.

That means:
- keep the mid-card effect very subtle
- concentrate most visual strength near the bottom edge
- preserve the image identity and color mood
- avoid turning the lower area muddy or overly gray

---

## Why the first version showed a visible line

The earlier version created a visible line because the lower overlay started too abruptly. Even if blur is added, users can still detect the transition when:
- opacity increases too fast
- tint starts too early with too much strength
- the effect is built with too few steps
- the first visible layer is already noticeable

The fix direction is:
- begin from **near-zero visibility**
- ramp up in **smaller, smoother steps**
- use an **eased curve** instead of a linear jump
- keep the first part of the fade almost imperceptible

---

## Recommended tuning model

When reusing this pattern later, tune it with these four parameters:

### A. Start point
Where the atmospheric fade begins.

Suggested range:
- **46% to 52%** of card height

Guidance:
- use closer to **50%** when you want a cleaner hero image
- use closer to **46–48%** when you need more support for text

### B. Strength curve
How fast the effect becomes visible.

Recommended:
- use a **slow start**, then stronger increase near the bottom
- avoid a straight linear fade whenever possible

Think of it as:
- 50% to 70% = almost invisible
- 70% to 85% = softly visible
- 85% to 100% = readable support zone

### C. Bottom intensity
How strong the final effect is at the lower edge.

Recommended:
- enough for text contrast
- not so strong that it looks like a black footer pasted over the card

### D. Card shape
This pattern should work across multiple card formats.

Suggested starter formats:
- **horizontal rectangle** for feeds and deck previews
- **square** for gallery or place tiles
- **portrait rectangle** only when a more editorial layout is needed

---

## Reuse guidance

This pattern is a good fit for:
- feed cards
- place cards
- event or plan cards
- media banners
- swipe/deck cards
- hero blocks with bottom-aligned metadata

It is less suitable when:
- the image itself must remain fully unobstructed
- the card already contains many chrome elements or borders
- the design needs a very technical or data-heavy look

---

## Content placement guidance

Best placements on top of this card:
- title near the lower third or lower quarter
- short metadata row at the bottom
- chips or badges with strong contrast
- subtle action affordances in corners

Avoid:
- dense paragraphs on top of the image
- multiple stacked rows of low-contrast text
- placing critical text exactly where the fade starts

For best results:
- keep key text closer to the lower quarter
- let the most transparent part remain mostly decorative

---

## Design intent for future product use

When this pattern is moved into a production project, the desired feeling is:
- more premium than a bordered thumbnail card
- softer than a hard footer gradient
- image-led, but still practical for overlay UI
- adaptable to different content types without redesigning the whole card shell

The image should feel like the **entire card surface**, while the lower fade acts like a hidden support layer for readability.

---

## Implementation notes

The current prototype is intentionally isolated in the lab so it can be iterated safely without affecting other screens.

If moved into production later, keep these implementation principles:
- preserve **stable sizing rules** per card type
- keep the effect configurable via props or theme tokens
- avoid per-screen ad hoc overlay tweaks
- keep one shared component as the visual source of truth

A good future API shape would include controls for:
- image source
- aspect ratio / dimensions
- fade start point
- fade intensity
- corner radius
- overlay content slot

---

## Suggested next experiments

Useful follow-up experiments in the lab:

1. **46–48% start point test**
   - Compare against the current 50% start
   - Goal: slightly softer readability ramp without revealing the seam

2. **Content overlay test**
   - Add title + subtitle + small badge
   - Check readability over bright and dark images

3. **Map / OSM surface variant**
   - Replace the photo with a map-style visual
   - Verify that the same fade still feels premium

4. **Very bright image stress test**
   - Test sky-heavy or white-heavy images
   - Confirm the lower area still supports text well

5. **Interactive card state test**
   - Pressed / hover / active states without adding borders
   - Keep the visual language clean and immersive

---

## Summary

This design pattern is a reusable **full-bleed image card with a seam-free bottom atmospheric fade**.

The core principles are:
- full image coverage
- no visible border
- fade begins around the middle
- transition starts from nearly invisible
- strongest support stays close to the bottom edge
- works for both horizontal rectangle and square cards

This is the baseline reference for future reuse in other projects.
