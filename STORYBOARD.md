# Finca Luna Nueva — storyboard

## Asset roles

- `hero-day`: arrival and lobby backdrop.
- `exterior-pool`: transition from property to water.
- `aerial-day`: territory and closing scale.
- `exterior-night`: emotional closing / conversion.
- `blueprint` + `build-01…06`: scroll-controlled construction sequence.
- `pool-water`, `restaurant`, `pool-deck`, `outdoor-shower`: Experience chapters.
- `room-forest`, `suite-terrace`, `suite-panorama`: Stay portals and room selection.
- `lounge`, `room-sitting`, `bathroom`: room-detail journey.
- `concept-plan`: the architectural thesis behind the hotel.

## Spatial states

1. **Lobby** — cinematic opening, then three spatial portals.
2. **Stay** — pinned horizontal room showroom, followed by an editorial suite walkthrough.
3. **Experience** — four vertical chapters: Gather, Immerse, Reset, Outside.
4. **The Place** — pinned construction timeline, materials, territory, original concept.
5. **Booking** — persistent bottom-sheet overlay, available from every state.

Portal entry uses a photographic expansion. Returning to the lobby uses the inverse visual grammar. Mobile keeps the same states with vertical flow, shorter transforms and no cursor tilt.

Critical loading is limited to the current hero. Portal images are eager only on the lobby; downstream images use responsive WebP output and lazy loading. Hover/focus prefetches the chosen route.
