# Inner Circle — Landing Page

Animated, scroll-driven single-page experience. Two full-viewport sections: a magenta hero with cursor parallax and a near-black manifesto with line-by-line scroll reveal.

## Stack

| Tool | Role |
|---|---|
| **React + Vite** | Component model, fast HMR |
| **GSAP + ScrollTrigger** | All scroll animations (pinning, scrubbing, staggered timeline) |
| **Lenis** | Smooth-scroll momentum so GSAP scrub feels fluid |
| **CSS Animations** | SVG pedal crank loop, logo marquee ticker |
| **Google Fonts — Barlow** | Navigation, body, and the large `INNER CIRCLE` headline |

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Building for production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, or GitHub Pages.

## Character assets

Three SVG placeholder characters live in `public/`:

| File | Used in |
|---|---|
| `bunny-stand.svg` | Hero — initial centered pose |
| `bunny-point.svg` | Hero — post-scroll, right-docked pointing pose |
| `bunny-bike.svg` | Manifesto — spin-bike looping character |

To swap in real 3D renders, drop PNG/WebP files with these exact filenames into `public/` — the `<img>` `src` attributes already reference these paths.

## Animation notes

### Hero cursor parallax
`mousemove` drives `gsap.to` on the character container (`rotationY`, `rotationX`, `x/y`) with `transformPerspective: 900` for a 3D feel. The mandala counter-rotates slightly in the opposite direction for depth. Skipped on touch devices (`pointer: coarse`).

### Hero scroll transition
ScrollTrigger pins the hero for `+=130%` of viewport height. A single GSAP timeline scrubs through:
1. Character slides right `30vw` and scales to `1.22×`
2. Standing pose fades out → pointing pose fades in (at 38% progress)
3. Three feature cards stagger in from the left (at 52% progress)

### Manifesto scroll reveal
ScrollTrigger pins the manifesto section for `+=340%`. An `onUpdate` callback maps `progress (0→1)` to an active band position across ~70 text segments. Each segment's opacity updates every frame:
- Upcoming: `0.07`
- Active band: lerped from base to `1.0`
- Passed: `0.24–0.32` (bold phrases stay slightly brighter)

### Bike pedal animation
Pure SVG `<animateTransform>` on the crank group — zero JS, infinite loop, no layout impact.

### Logo marquee
CSS `@keyframes` translating `-50%` on a doubled list. Edge-fade via `mask-image`. Logos brighten on hover.

## Mobile decisions

- Cursor parallax skipped on `pointer: coarse` devices
- Hero character shrinks to `48vh`; cards stack centred below the character
- Manifesto stacks character above text on narrow screens
- Scroll-reveal works on touch natively via ScrollTrigger
- Nav links hide below 600 px to avoid overflow

## What I'd improve with more time

1. **Real 3D assets** — swap SVG placeholders with actual renders; use Three.js for the cursor-parallax for a true 3D look
2. **Manifesto pin tuning** — calibrate `+=340%` per device so the pin duration matches reading pace
3. **Page-entry animation** — hero elements fade/rise in on first load
4. **`prefers-reduced-motion`** — disable parallax and reduce scrub distances for users who opt out of motion
