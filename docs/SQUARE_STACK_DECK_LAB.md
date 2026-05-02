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

## LAB5c - Progressive reference blur smoothing

- Refined the lower atmosphere to better match the progressive blur reference image.
- Added low-opacity bridge blur bands above the main blur field to soften the transition between the untouched image and the blurred lower zone.
- Increased the blur slice count and overlap so the blur grows more continuously from top to bottom.
- Slightly expanded the atmosphere height again, with stronger protection on static-map cards.



## LAB5d — Align square deck blur with Image Card design

- Replaced the square-card custom local lower-atmosphere model with the same full-card sliced fade model used by `FullBleedBlurCard`.
- The blur/tint now starts from a card-level percentage, not from a nested bottom container, so the transition matches the `/image-card` reference more closely.
- Removed bridge bands, feather veils, and accent washes that were creating a visible frosted-panel feeling.
- Kept static-map cards slightly stronger, starting around 46% of card height, while photo cards start around 50%.
- The intended look is the Image Card rule: almost invisible in the middle, softly visible lower down, strongest near the bottom edge.


## LAB5e — Remove top shade and stabilize image fallback

- Removed the separate top shade layer from the square demo card; it was visible as a gray rectangle over every card.
- Added per-card image failure handling so a failed remote image cleanly falls back to the lab fallback surface instead of leaving the blur/image layers in a half-loaded state.
- Added a stable recycling key to the main image layer so card identity stays tied to the card id while swiping.

## LAB6 — Vertical/page scroll test routes

Adds three routes that reuse the same square deck engine while placing it under real vertical-scroll pressure:

- `/square-deck-page` — one deck embedded inside a normal feed-like page with content above and below.
- `/square-deck-scroll` — three deck sections in one vertical `ScrollView` to stress-test moving between decks.
- `/square-deck-mixed` — photo, static-map-like, and fallback cards in one route for media regression checks.

The deck pan now uses `activeOffsetX([-12, 12])` so mostly vertical drags can be handled by the parent `ScrollView`, while deliberate up-left / down-right diagonal gestures still activate the deck.


## LAB6a — HelloWhen-style gesture intent classifier

The square deck now uses a lab-local copy of the HelloWhen deck gesture intent model instead of the coarse `activeOffsetX` route test.

Intent rules:

- mostly vertical drags fail the deck gesture so parent `ScrollView` routes can scroll naturally;
- top-right / bottom-left diagonal drags are treated as scroll intent;
- top-left / bottom-right diagonal drags are treated as card swipe intent when the requested direction exists;
- horizontal drags still swipe the deck;
- unavailable directions, such as previous on the first card or next on the last card, are handed to scroll instead of fighting the page.

This patch is isolated to `features/square-stack-deck` and does not touch the older `features/deck` implementation.


## LAB5f-v2 - Remove blur stripe seams

- Replaced the many narrow blur slices in the square deck card with a small set of large overlapping blur wash bands.
- This removes the visible horizontal stripe/gap artifacts that appeared in the lower text zone.
- Kept the Image Card design principle: the blur starts subtly around the middle and becomes strongest near the bottom.
- Static-map cards still receive slightly earlier and stronger readability protection than photo cards.
