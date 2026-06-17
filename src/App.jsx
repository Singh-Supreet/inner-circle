import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Hero from './components/Hero'
import Manifesto from './components/Manifesto'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true })

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
      gsap.ticker.remove(tick)
    }
  }, [])

  return (
    <main>
      <Hero />
      <Manifesto />
    </main>
  )
}
