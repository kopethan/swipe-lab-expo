# Plan Lab handoff notes

This lab explores a standalone Plans product area for Hellowhen. It is intentionally separate from Trade, Needs, Offers, Agenda, auth, payments, maps, uploads, and backend services.

## Current product shape

- **Plan feed** is deck-only: one active square deck per plan, with no visible build guide or summary text block above each deck.
- **Plan deck order** is ordered Place cards only; the Plan summary lives in the detail hero and final review copy, not inside feed decks.
- **Diagonal deck gesture** follows the Trade feed direction: bottom-right to top-left moves forward, top-left to bottom-right moves backward.
- **Vertical scrolling** should win when the gesture is close to the vertical axis.
- **Plan detail** is the product-facing page opened from the deck.
- **Public discussion** is a local mock section at the end of the detail page.
- **Join flow** is free, local, and does not create approval requests, trades, agenda items, or payments.
- **Place Library** stores reusable local and online places for plans.
- **Plans header menu** hides deeper areas such as My plans, Joined plans, My places, Hellowhen Place Library, Create place, and lab notes behind the list/menu icon.

## Candidates to move toward production later

- `ContinuousSquareStackDeck` gesture intent and active-card behavior.
- Visual Place-only deck structure with Plan summary kept outside the feed deck and outside per-card feed text.
- Plan detail route/timeline layout.
- Local/online Place model shape, with first-launch media guidance of **1 image per Place for free users**.
- Place Library picker and detail panel patterns.
- Join / Joined / Leave state language.
- Public discussion placement at the bottom of Plan detail.

## Keep lab-only for now

- Mock Plan, Place, Trade, and Me hub data.
- Local-only joined plan state.
- Local-only public discussion messages and composer.
- Local-only place creation, edit, copy, and delete actions.
- Prototype navigation shell around Plans / Me / Trade.
- Any copy that mentions this as a lab or preview, except collapsed handoff notes hidden in the Plan menu.

## Production integration notes

- Add real route boundaries before connecting data.
- Decide whether the user-facing name stays **Plans** or changes to **Projects**.
- Add backend models only after the Plan and Place product language is stable.
- Keep Plan independent from Trade at first; linking Plan to Trade can be a later phase.
- Keep online place access safe: show domain/platform clearly before users open a link.
- Keep offline place safety clear: prefer public meeting points and explicit meeting instructions.

## QA checklist

- Diagonal forward/back gestures work on every Place-only Plan deck.
- Page scroll works when the user swipes near vertically.
- Tapping a deck opens Plan detail without accidental swipe commits.
- Detail page remains readable on mobile, tablet, and desktop.
- Join, Joined, and Leave states update local previews consistently.
- Place detail and Use in Plan actions work from the picker and library.
- Plans feed header actions open filters, the Plan area menu, and Create Plan without adding guide copy to the feed.

## Media limit recommendation

- Free users: 1 image per Place.
- Plus users: 5 images per Place.
- Admin/starter Places: up to 6 images per Place for curated examples.

For the feed deck, show one visual per Place card. Extra media belongs in the Place detail or future gallery, not the feed card.
