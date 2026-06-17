import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Navbar from './Navbar'
import BunnyScene from './BunnyScene'
import './Hero.css'

const CARDS = [
  {
    title: 'Private Discord & Networking',
    body: 'An invite-only community of builders, traders, and operators moving at the front of web3.',
  },
  {
    title: 'Weekly Market Alpha Drops',
    body: 'Curated on-chain signals, early-mover plays, and research delivered every week.',
  },
  {
    title: 'Exclusive Web3 Tooling Access',
    body: 'Premium dashboards, scripts, and resources not available to the general public.',
  },
]

/* ── SVG mandala background ── */
function Mandala({ svgRef }) {
  const cx = 400, cy = 400

  const petals = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    const aMid = a + Math.PI / 16
    const tip  = 290, base = 90, ctrl = 210

    const tx = cx + Math.cos(aMid) * tip
    const ty = cy + Math.sin(aMid) * tip
    const b1x = cx + Math.cos(a) * base
    const b1y = cy + Math.sin(a) * base
    const b2x = cx + Math.cos(a + Math.PI / 8) * base
    const b2y = cy + Math.sin(a + Math.PI / 8) * base
    const c1x = cx + Math.cos(a + 0.15) * ctrl
    const c1y = cy + Math.sin(a + 0.15) * ctrl
    const c2x = cx + Math.cos(aMid - 0.15) * ctrl
    const c2y = cy + Math.sin(aMid - 0.15) * ctrl

    return `M${b1x},${b1y} Q${c1x},${c1y} ${tx},${ty} Q${c2x},${c2y} ${b2x},${b2y}Z`
  })

  const spokes = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2
    const r1 = 90 + (i % 4) * 15, r2 = 295 + (i % 3) * 25
    return {
      x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
      x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2,
    }
  })

  const dots = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    return { cx: cx + Math.cos(a) * 320, cy: cy + Math.sin(a) * 320 }
  })

  return (
    <svg
      ref={svgRef}
      className="mandala-svg"
      viewBox="0 0 800 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g stroke="white">
        {/* concentric rings */}
        {[70, 130, 190, 240, 300, 340].map(r => (
          <circle key={r} cx={cx} cy={cy} r={r}
            strokeWidth={r === 340 ? 1.5 : 0.8} opacity={0.5} />
        ))}

        {/* spokes */}
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            strokeWidth={0.6} opacity={0.35} />
        ))}

        {/* petals */}
        {petals.map((d, i) => (
          <path key={i} d={d} strokeWidth={1.0} opacity={0.55} />
        ))}

        {/* outer dots */}
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={3}
            fill="white" stroke="none" opacity={0.45} />
        ))}

        {/* inner star */}
        {Array.from({ length: 8 }, (_, i) => {
          const a1 = (i / 8) * Math.PI * 2
          const a2 = ((i + 0.5) / 8) * Math.PI * 2
          const a3 = ((i + 1) / 8) * Math.PI * 2
          const r1 = 70, r2 = 48
          return (
            <path key={i}
              d={`M${cx + Math.cos(a1) * r1},${cy + Math.sin(a1) * r1}
                  L${cx + Math.cos(a2) * r2},${cy + Math.sin(a2) * r2}
                  L${cx + Math.cos(a3) * r1},${cy + Math.sin(a3) * r1}`}
              strokeWidth={0.9} opacity={0.55}
            />
          )
        })}
      </g>
    </svg>
  )
}

const HEADLINE = 'INNER CIRCLE'

export default function Hero() {
  const wrapperRef     = useRef()
  const mandalRef      = useRef()
  const cardsRef       = useRef([])
  const lettersRef     = useRef([])
  const scrollProgress = useRef(0)
  const mousePos       = useRef({ x: 0, y: 0 })

  /* ── scroll progress (0→1 across wrapper height) ── */
  useEffect(() => {
    const onScroll = () => {
      if (!wrapperRef.current) return
      const rect  = wrapperRef.current.getBoundingClientRect()
      const total = wrapperRef.current.offsetHeight - window.innerHeight
      scrollProgress.current = Math.max(0, Math.min(1, -rect.top / total))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── mouse parallax → mandala counter-rotation ── */
  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth  - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      mousePos.current = { x, y }

      if (mandalRef.current) {
        gsap.to(mandalRef.current, {
          rotation: -x * 22,
          scale:    1 + Math.abs(y) * 0.04,
          duration: 2.0,
          ease: 'power2.out',
          overwrite: 'auto',
          transformOrigin: 'center center',
        })
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  /* ── cards scroll reveal (staggered, reversible) ── */
  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean)
    gsap.set(cards, { x: -70, opacity: 0 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger:       wrapperRef.current,
        start:         '68% top',
        end:           '82% top',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(cards, {
      x:        0,
      opacity:  1,
      duration: 0.65,
      stagger:  0.18,
      ease:     'power3.out',
    })

    return () => ScrollTrigger.getAll().forEach(t => t.kill())
  }, [])

  /* ── headline letters drop & fade as the bunny walks ──
     Scoped to the same scroll window as the bunny's walk (20%→75%),
     so the last letter is gone right as it reaches the right side.
     Pixel-based start/end: GSAP's "20% top" means 20% of the trigger's
     own height, not 20% of the scrollable range — using the same math
     as the scrollProgress handler above keeps this in sync with it. */
  useEffect(() => {
    const letters = lettersRef.current.filter(Boolean)
    const scrollRange = () => wrapperRef.current.offsetHeight - window.innerHeight

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger:  wrapperRef.current,
        start:    () => wrapperRef.current.offsetTop + 0.2  * scrollRange(),
        end:      () => wrapperRef.current.offsetTop + 0.75 * scrollRange(),
        scrub:    true,
        invalidateOnRefresh: true,
      },
    })

    tl.to(letters, {
      y:        50,
      opacity:  0,
      stagger:  0.06,
      ease:     'power1.in',
    })

    return () => ScrollTrigger.getAll().forEach(t => t.kill())
  }, [])

  return (
    <section ref={wrapperRef} className="hero-wrapper" id="hero">
      <div className="hero-sticky">
        <Navbar />

        {/* Mandala background */}
        <div className="hero-bg">
          <Mandala svgRef={mandalRef} />
        </div>

        {/* 3D canvas – pointer-events:none set inside BunnyScene */}
        <BunnyScene scrollProgress={scrollProgress} mousePos={mousePos} />

        {/* Feature cards – slide in from left when bunny points */}
        <div className="cards-col">
          {CARDS.map((card, i) => (
            <div
              key={card.title}
              ref={el => { cardsRef.current[i] = el }}
              className="feature-card"
            >
              <h3 className="card-title">{card.title}</h3>
              <p className="card-body">{card.body}</p>
            </div>
          ))}
        </div>

        {/* Edge-to-edge headline */}
        <div className="headline-wrap" aria-label="Inner Circle">
          <p className="headline">
            {HEADLINE.split('').map((char, i) => (
              char === ' '
                ? <span key={i} className="headline-space">&nbsp;</span>
                : (
                  <span
                    key={i}
                    ref={el => { lettersRef.current[i] = el }}
                    className="headline-letter"
                  >
                    {char}
                  </span>
                )
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}
