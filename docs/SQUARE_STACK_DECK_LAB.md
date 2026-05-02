# Square Stack Deck Lab

This lab is intentionally separate from the existing `features/deck` implementation.

## Goal

Prototype a square-card stack where diagonal swipes are driven by one continuous physical model:

```txt
visualOffset = cardIndex - activeIndex - progress
```

- `progress = 1` means the next card has visually reached the top.
- `progress = -1` means the previous card has visually reached the top.
- At commit, `activeIndex += direction` and `progress = 0` should produce the same card positions as the pre-commit final frame.

That is the core anti-pop/rebase rule.

## Route

Open:

```txt
/square-deck
```

## Gesture

- Swipe up-left for next.
- Swipe down-right for previous.

The gesture scalar is based on both x and y translation so the deck feels diagonal rather than purely horizontal.

## What this lab deliberately avoids

- No `top-*`, `back-*`, `ghost-prev-*` render keys.
- No duplicate visual owners for the same card.
- No separate previous-card ghost layer.
- No role-based media remount.
- No hidden inactive card bodies.

Each card is keyed by the stable card id.

## Visible window

The deck renders:

```txt
activeIndex - 1
activeIndex
activeIndex + 1
activeIndex + 2
activeIndex + 3
activeIndex + 4
```

This keeps the incoming previous card and far tail card alive during the gesture.

## Porting rule for HelloWhen later

The HelloWhen Places feed should only receive this model after the lab proves:

- previous swipe has no release pop
- current top remains visible behind incoming previous
- tail card remains visible with 5+ cards
- image cards do not remount while moving between top/back/depth poses
- dark/light clipping and rounded corners remain stable

## LAB2 sizing rule

The deck should size from the route's measured stage whenever possible, not only from the raw window dimensions.

The square deck screen measures the center stage with `onLayout` and passes:

```txt
availableWidth
availableHeight
```

into `ContinuousSquareStackDeck`. The deck then reserves fixed diagonal-depth space before choosing the card size:

```txt
cardSize = min(
  availableWidth - depthAllowanceX,
  availableHeight - depthAllowanceY,
  maxCardSize
)
```

The preferred minimum card size is only a preference. On small phones, the card is allowed to shrink below that minimum instead of clipping at the bottom or right edge.

This keeps the lab honest for later HelloWhen mobile work, where the real deck sits between native headers, top tabs, action bars, and bottom tab/navigation areas.


## LAB3 four-card subtle depth rule

The deck still mounts one previous card and one hidden forward tail card, but the idle visual stack should read as four cards only:

```txt
active card
back card 1
back card 2
back card 3
hidden tail card mounted at offset 4
```

The hidden tail card exists so that a next swipe can slide it into the far depth slot during the same continuous motion. It should not suddenly appear after release.

Depth is intentionally subtle:

```txt
offset 0: full size
offset 1: about 7px down/right, barely smaller
offset 2: about 13px down/right
offset 3: about 19px down/right
offset 4: mounted but invisible
```

Shadows also fade with depth instead of every card using the same heavy shadow. Users should feel a physical stack, but they should not notice a strong stair-step effect.

## LAB4 HelloWhen-like fake PlaceCard content

The square deck now uses fake place cards instead of probe/input cards. This keeps the clean continuous deck engine isolated while making the visual payload closer to HelloWhen mobile Places feed.

The LAB4 card simulates:

```txt
- full-bleed photo/map/fallback media
- top media/status chrome
- lower readable information panel
- title, area, descriptor, distance/mood pills, and tags
- light/dark adaptive surfaces
```

This slice intentionally does not copy real HelloWhen feed code and does not add the expensive lower-third blur yet. LAB5 should bring in the image-card blur/fill behavior in a controlled way, and LAB6 should add a more explicit static OSM/map simulation.


## LAB5 lower-third blur/fill rule

LAB5 ports the image-card lab's lower atmospheric support into the square PlaceCard simulation. The card keeps one full-bleed base image, then adds a clipped lower atmosphere layer that starts softly and becomes stronger near the bottom third.

Implementation rules:

```txt
- do not add a hard footer block
- keep the media full bleed behind the text
- keep the start of the lower effect hard to notice
- use fewer blur slices than the standalone image-card lab
- keep transition={0} and stable media source objects during deck movement
- fallback cards use tint/fill only because they do not have a photo source
```

This is still a lab simulation. LAB6 should add explicit photo/static-map/fallback variants and stress-test bright map surfaces in light and dark modes.


## LAB5a bottom-up blur fade rule

LAB5a keeps the lower-third atmosphere from LAB5, but removes the visible seam between the clear image zone and the readable lower text zone. The atmosphere now starts higher on the card with near-zero opacity, ramps stronger toward the bottom, and avoids using a separate hard footer shade.

Implementation rules:

```txt
- the lower atmosphere is taller than the visible text area
- the first blur slices are nearly invisible
- blur/tint strength increases only as it approaches the bottom
- no standalone bottom shade sits above the atmosphere
- the lower text panel is much less boxed and has no visible border
- keep transition={0} and stable source objects for the repeated blurred image layers
```

The intended result is not a frosted rectangle. It should feel like the image itself becomes softer and more readable near the bottom.

## LAB5b - Full text-zone atmosphere + HelloWhen text layout

- Expanded the atmospheric blur/fill field so the full visible text area sits inside the protected zone.
- Removed the boxed lower panel styling from the lab card.
- Replaced the prototype text layout with the main HelloWhen PlaceCard overlay structure: top mode chip, eyebrow row, title, subtitle, and footer tags.
- Static-map demo cards receive slightly stronger readability protection than photo cards.
