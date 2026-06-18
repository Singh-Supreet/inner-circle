# Inner Circle — LunaZone Front-End Assignment

Live demo: _(deploy URL here)_

## Stack

| Layer | Library / Tool |
|---|---|
| Framework | React 18 + Vite |
| 3D rendering | React Three Fiber + Three.js + Drei |
| Animation | GSAP 3 + ScrollTrigger |
| Smooth scroll | Lenis |
| Fonts | Syne (headline), Space Grotesk (body) — Google Fonts |

## How to run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build locally
```

Node ≥ 18 required.

## What's built

### Hero section
- Sticky scroll container (1000 vh runway) so animations have room to breathe.
- SVG mandala background — counter-rotates on mousemove via GSAP.
- 3D bunny character (`bunny_character.glb`) rendered with React Three Fiber. Mouse parallax tilts the character; on scroll it walks right (~20–75% progress), turns, and extends an arm toward the feature cards (~75–93%).
- Three feature cards slide in from the left via GSAP once the bunny is pointing. On mobile they're always visible stacked below the character.
- "INNER CIRCLE" edge-to-edge outline headline at the bottom, letters fade out during the walk scroll window.

### Manifesto section
- Pinned scroll section (~6 × 520 px runway). Paragraphs scroll-reveal line-by-line: active paragraph = full white + zero blur, neighbours dim + blur, far lines = near-invisible. `perspective rotateX` adds a depth tilt on out-of-focus lines.
- 3D character (horse placeholder for the brief's exercise-bike character) procedurally animates its gait driven by scroll progress via `useFrame`.
- Horizontal logo marquee at the bottom (CSS animation, duplicated list for seamless loop).
- Dark background lifts over the hero via `margin-top: -100vh` + `border-radius` so the transition feels like a card sliding up.

### Responsiveness
- **≤ 768 px**: hero runway shortened to 250 vh; bunny stays centred (no walk); feature cards stack full-width below the character; tagline hidden from navbar.
- **≤ 900 px (manifesto)**: two-column grid collapses to single column — horse model moves above the text.
- Mouse parallax is passive (`mousemove`) — effectively a no-op on touch devices where no cursor exists.

## Animation libraries — why these choices

**GSAP + ScrollTrigger** — industry-standard for scroll-driven animations. `scrub: true` on ScrollTrigger gives frame-perfect 1:1 mapping between scroll position and timeline progress with zero spring-simulation overhead. The `gsap.context()` pattern makes cleanup trivial in React (no stale-ref footguns).

**Lenis** — replaces the browser's native scroll inertia with a configurable spring (`lerp: 0.08`). Pairs cleanly with GSAP by forwarding each RAF tick: `lenis.on('scroll', ScrollTrigger.update)`. Choosing Lenis over ScrollSmoother (GSAP Club) keeps the bundle free of a paid dependency while achieving the same feel.

**React Three Fiber + Drei** — declarative Three.js inside React with automatic resize handling, shadow maps, and `useFrame` for per-frame procedural bone animation. Drei's `useGLTF` preloads the model and draco-decompresses it; `useAnimations` wires up any embedded clips automatically.

## Tradeoffs and known decisions


- **Horse as manifesto character**: the brief calls for an exercise-bike character. A horse GLB was used as a placeholder; the procedural gait animation (trot cycle, tail wave) demonstrates the same capability.
- **1000 vh hero runway**: generous scroll space makes the bunny animation feel deliberate but means the user has to scroll a long way on desktop. A shorter runway (≈ 500 vh) with a faster scrub would reduce fatigue with more time to tune.
- **`ScrollTrigger.normalizeScroll`** was intentionally removed — it conflicts with Lenis since both normalise the scroll event stream.

## What I'd improve with more time

1. **Tighter scroll runway** (~400–500 vh) with tuned easing so the hero animations feel snappier.
2. **Actual exercise-bike model** — a looping pedalling animation would match the brief exactly and could be driven by the manifesto `scrollProgress` ref.
3. **Entrance animation on page load** — bunny + mandala fade/scale in from centre on first paint.
4. **Cursor follow dot** — a custom trailing cursor that reacts to hover states.
5. **Deployment via Vercel with `vite build` caching** and `Cache-Control` headers on the GLB files (currently ~4 MB each).
