import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Hero.css'

const CARDS = [
  'Private Discord & Networking',
  'Weekly Market Alpha Drops',
  'Exclusive Web3 Tooling Access',
]

export default function Hero() {
  const sectionRef = useRef(null)
  const characterRef = useRef(null)
  const standingRef = useRef(null)
  const pointingRef = useRef(null)
  const cardsRef = useRef(null)

  // Cursor parallax — subtle float, desktop only
  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    if (isTouch) return

    const onMove = (e) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 2
      const dy = (e.clientY / window.innerHeight - 0.5) * 2

      gsap.to(characterRef.current, {
        x: dx * 18,
        y: dy * 10,
        duration: 0.9,
        ease: 'power2.out',
      })
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Scroll animation — pose crossfade, then cards stagger in
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
        },
      })

      tl.to(standingRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.3)
      tl.to(pointingRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.4)

      tl.fromTo(
        cardsRef.current.querySelectorAll('.hero__card'),
        { opacity: 0, x: -55, y: 6 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          stagger: 0.14,
          duration: 0.38,
          ease: 'power2.out',
        },
        0.52
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section className="hero" ref={sectionRef} id="hero">
      {/* Rotating calligraphic mandala backdrop */}
      <div className="hero__mandala" aria-hidden="true" />

      {/* 3D character — two poses, transparent PNGs on matching pink background */}
      <div className="hero__character" ref={characterRef}>
        <div className="hero__pose" ref={standingRef}>
          <img src="/stand_char.png" alt="Inner Circle mascot — standing" />
        </div>
        <div className="hero__pose hero__pose--pointing" ref={pointingRef}>
          <img src="/point_char.png" alt="Inner Circle mascot — pointing" />
        </div>
      </div>

      {/* Feature cards */}
      <div className="hero__cards" ref={cardsRef}>
        {CARDS.map((label) => (
          <div className="hero__card" key={label}>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Large edge-to-edge headline */}
      <div className="hero__headline" aria-label="Inner Circle">
        <h1>INNER&nbsp;CIRCLE</h1>
      </div>
    </section>
  )
}
