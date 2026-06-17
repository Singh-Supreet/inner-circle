import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import './Manifesto.css'

const LINES = [
  { label: 'I.',   text: 'We don\'t wait for the market.' },
  { label: 'II.',  text: 'We move the market.' },
  { label: 'III.', text: 'Built for operators. Builders.' },
  { label: 'IV.',  text: 'Those who see alpha where others see noise.' },
  { label: 'V.',   text: 'Private. Precise. Relentless.' },
  { label: 'VI.',  text: 'This is not for everyone.' },
  { label: 'VII.', text: 'This is for you.' },
]

export default function Manifesto() {
  const sectionRef = useRef()
  const linesRef   = useRef([])
  const badgeRef   = useRef()

  useEffect(() => {
    const lines = linesRef.current.filter(Boolean)

    // Each line slides up + fades in with stagger
    gsap.set(lines, { y: 48, opacity: 0 })
    gsap.set(badgeRef.current, { scale: 0.8, opacity: 0 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start:   'top 75%',
        end:     'center 30%',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(badgeRef.current, {
      scale:    1,
      opacity:  1,
      duration: 0.7,
      ease:     'back.out(1.5)',
    })
    .to(
      lines,
      {
        y:        0,
        opacity:  1,
        duration: 0.7,
        stagger:  0.1,
        ease:     'power3.out',
      },
      '-=0.4'
    )

    return () => ScrollTrigger.getAll().forEach(t => t.kill())
  }, [])

  return (
    <section ref={sectionRef} className="manifesto" id="manifesto">
      <div className="manifesto-inner">
        <div ref={badgeRef} className="manifesto-badge">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="white" strokeWidth="1.5" />
            <circle cx="22" cy="22" r="11" stroke="white" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="22" cy="22" r="4" fill="white" />
          </svg>
          <span className="manifesto-label">MANIFESTO</span>
        </div>

        <ol className="manifesto-lines" aria-label="Inner Circle Manifesto">
          {LINES.map((line, i) => (
            <li
              key={i}
              ref={el => { linesRef.current[i] = el }}
              className="manifesto-line"
            >
              <span className="line-num">{line.label}</span>
              <span className="line-text">{line.text}</span>
            </li>
          ))}
        </ol>

        <p className="manifesto-cta">
          Ready to enter the circle?{' '}
          <a href="#join" className="cta-link">Apply for access →</a>
        </p>
      </div>
    </section>
  )
}
