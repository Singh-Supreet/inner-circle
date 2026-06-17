import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Manifesto.css'

const SEGMENTS = [
  { t: 'Welcome to the ultimate convergence of ', b: false },
  { t: 'digital rebels', b: true },
  { t: ', ', b: false },
  { t: 'underground creators', b: true },
  { t: ', and ', b: false },
  { t: 'top-tier product builders', b: true },
  { t: ' who refuse to follow guidelines.', b: false },

  { t: '\nThis is where ', b: false },
  { t: 'high-end design principles', b: true },
  { t: ' meet ', b: false },
  { t: 'pure technical execution', b: true },
  { t: ', without the ', b: false },
  { t: 'corporate bureaucracy', b: true },
  { t: ' and meaningless ', b: false },
  { t: 'standard aesthetics', b: true },
  { t: '.', b: false },

  { t: '\nWe gather in the shadows to build the ', b: false },
  { t: 'next generation', b: true },
  { t: ' of ', b: false },
  { t: 'scalable interfaces', b: true },
  { t: ', ', b: false },
  { t: 'automated workflows', b: true },
  { t: ', and ', b: false },
  { t: 'decentralized assets', b: true },
  { t: ' that move the cultural needle forward.', b: false },

  { t: '\nExperience ', b: false },
  { t: 'zero-bullshit networking', b: true },
  { t: ', ', b: false },
  { t: 'weekly alpha allocations', b: true },
  { t: ', and unreleased ', b: false },
  { t: 'toolkits', b: true },
  { t: ' to shape the internet’s landscape.', b: false },

  { t: '\nThis is ', b: false },
  { t: 'not another social club', b: true },
  { t: ' for casual enthusiasts or ', b: false },
  { t: 'template consumers', b: true },
  { t: '. This is a ', b: false },
  { t: 'highly selective environment', b: true },
  { t: ' engineered for ', b: false },
  { t: 'hyper-productive creators', b: true },
  { t: ', ', b: false },
  { t: 'UI/UX visionaries', b: true },
  { t: ', and ', b: false },
  { t: 'AI prompt architects', b: true },
  { t: ' who operate at the ', b: false },
  { t: 'absolute limits', b: true },
  { t: ' of ', b: false },
  { t: 'digital product creation', b: true },
  { t: '.', b: false },

  { t: '\nOur framework is simple:\n', b: false },
  { t: 'eliminate intermediate noise', b: true },
  { t: ',\n', b: false },
  { t: 'automate the execution layer', b: true },
  { t: ',\nand ', b: false },
  { t: 'deploy elite digital products', b: true },
  { t: ' while others are still ', b: false },
  { t: 'scheduling meetings', b: true },
  { t: '.\nWe loop through ', b: false },
  { t: 'complex design systems', b: true },
  { t: ', ', b: false },
  { t: 'break conventional grids', b: true },
  { t: ', and\nexecute ', b: false },
  { t: 'fluid interactions', b: true },
  { t: ' that\n', b: false },
  { t: 'redefine digital environments', b: true },
  { t: '.', b: false },
]

const LOGOS = ['GitHub', 'Voiceflow', 'Zendesk', 'Pendo', 'Glide', 'Canva', 'Google', 'Notion', 'Figma', 'Webflow']
const TOTAL_FRAMES = 60
const FRAME_CYCLES  = 4   // how many full pedal rotations across the full scroll

export default function Manifesto() {
  const sectionRef   = useRef(null)
  const canvasRef    = useRef(null)
  const spansRef     = useRef([])
  const framesRef    = useRef([])
  const loadedRef    = useRef(0)

  // Preload all 60 bike-frame WebPs
  useEffect(() => {
    const imgs = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
      const img = new Image()
      img.src = `/bike-frames/f${String(i).padStart(2, '0')}.webp`
      img.onload = () => { loadedRef.current++ }
      return img
    })
    framesRef.current = imgs
  }, [])

  useEffect(() => {
    const spans = spansRef.current.filter(Boolean)
    const total = spans.length
    let lastFrame = -1

    function drawFrame(idx) {
      const canvas = canvasRef.current
      const img    = framesRef.current[idx]
      if (!canvas || !img) return

      if (!img.complete || img.naturalWidth === 0) {
        // Not loaded yet — retry once it finishes, don't mark as drawn
        img.onload = () => drawFrame(idx)
        return
      }
      if (idx === lastFrame) return
      lastFrame = idx

      const ctx2d = canvas.getContext('2d')
      ctx2d.clearRect(0, 0, canvas.width, canvas.height)
      ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height)
    }

    drawFrame(0)

    const ctx = gsap.context(() => {
      gsap.set(spans, { opacity: 0.07 })

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=340%',
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        onUpdate: ({ progress }) => {
          // ── Pedaling frame ──
          const rawFrame = progress * TOTAL_FRAMES * FRAME_CYCLES
          const frame    = Math.floor(rawFrame) % TOTAL_FRAMES
          drawFrame(frame)

          // ── Text reveal ──
          const activePos = progress * total
          spans.forEach((span, i) => {
            const dist = i - activePos
            let opacity
            if (dist < -total * 0.04) {
              opacity = span.dataset.bold === 'true' ? 0.32 : 0.24
            } else if (dist <= total * 0.12) {
              const t = Math.max(0, Math.min(1, 1 - dist / (total * 0.12)))
              const base = span.dataset.bold === 'true' ? 0.45 : 0.28
              opacity = base + t * (1 - base)
            } else {
              opacity = 0.07
            }
            span.style.opacity = opacity
          })
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section className="manifesto" ref={sectionRef} id="manifesto">
      <div className="manifesto__pill" aria-hidden="true" />

      <div className="manifesto__body">
        {/* Scroll-reveal text */}
        <div className="manifesto__text">
          <p>
            {SEGMENTS.map((seg, i) =>
              seg.t.split('\n').map((part, j, arr) => (
                <span key={`${i}-${j}`}>
                  <span
                    ref={(el) => { if (j === 0) spansRef.current[i] = el }}
                    data-bold={seg.b}
                    className={seg.b ? 'bold' : ''}
                  >
                    {part}
                  </span>
                  {j < arr.length - 1 && <br />}
                </span>
              ))
            )}
          </p>
        </div>

        {/* Scroll-driven pedaling canvas */}
        <div className="manifesto__character">
          <canvas
            ref={canvasRef}
            className="bike-canvas"
            width={410}
            height={428}
            aria-label="Inner Circle mascot pedaling on spin bike"
          />
        </div>
      </div>

      <div className="manifesto__marquee" aria-label="Technology partners">
        <div className="marquee__track">
          {[...LOGOS, ...LOGOS].map((name, i) => (
            <span className="marquee__item" key={i}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
