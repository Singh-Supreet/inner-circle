// Scroll-progress (p, 0→1 across the Hero section's scroll runway) breakpoints
// for the walk → turn → point → cards sequence. Single source of truth —
// CharacterScene (3D animation) and Hero (headline fade, card reveal) both
// read from this so the choreography can't drift out of sync between files.
//
// Everything after `cardsEnd` is deliberate scroll buffer: the cards stay
// fully visible with nothing else moving, so Manifesto only starts sliding
// up once the user keeps scrolling past a fully-revealed Hero, not during it.
export const HERO_TIMELINE = {
  walkStart:     0.10, // character starts walking right, turning to profile
  profileDone:   0.18, // profile turn complete (held until walkEnd)
  walkFadeStart: 0.50, // walking weight (leg cycle, bob, sway) starts fading out — wider than the other phases on purpose, so crossing the screen doesn't feel rushed
  walkEnd:       0.58, // walking ends; the turn-to-face-cards begins
  turnEnd:       0.68, // character now fully facing the cards
  pointEnd:      0.78, // pointing arm has finished raising
  cardsEnd:      0.86, // cards fully revealed — rest of scroll is buffer
}
