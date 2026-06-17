import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

function smoothstep(lo, hi, t) {
  const x = Math.max(0, Math.min(1, (t - lo) / (hi - lo)))
  return x * x * (3 - 2 * x)
}

/* ── 3D bunny model ── */
function BunnyModel({ scrollProgress, mousePos }) {
  const wrapRef  = useRef()   // auto-fit wrapper (fixed scale)
  const baseRef  = useRef()   // scroll-driven: position, base rotation, scale
  const innerRef = useRef()   // mouse-driven: parallax rotation
  const boneRef  = useRef({}) // bone map for procedural pointing

  const { scene, animations } = useGLTF('/bunny_character.glb')
  const { actions, names }    = useAnimations(animations, baseRef)

  useEffect(() => {
    if (!wrapRef.current) return

    // ── Auto-fit: scale model so it fills ~70% of viewport height ──
    const box    = new THREE.Box3().setFromObject(scene)
    const size   = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)
    console.log('[Inner Circle] Model size:', size)
    console.log('[Inner Circle] Model center:', center)

    // Camera fov=46, z=4.5 → view height ≈ 3.6 units. Target: 88% fill.
    const targetH  = 3.6 * 0.88
    const fitScale = targetH / size.y
    wrapRef.current.scale.setScalar(fitScale)

    // Centre the model on world origin (camera looks at y=0)
    wrapRef.current.position.set(
      -center.x * fitScale,
      -center.y * fitScale,
      -center.z * fitScale
    )

    // ── Map all bones ──
    const bones = {}
    scene.traverse(obj => { if (obj.isBone) bones[obj.name] = obj })
    boneRef.current = bones
    console.log('[Inner Circle] All bones:', Object.keys(bones))

    // ── Shadows ──
    scene.traverse(child => { if (child.isMesh) child.castShadow = true })
  }, [scene])

  useFrame((state, delta) => {
    if (!baseRef.current || !innerRef.current) return

    const p  = scrollProgress.current
    const mx = mousePos.current.x
    const my = mousePos.current.y
    const t  = state.clock.elapsedTime

    /* ── SCROLL-DRIVEN POSITION ──
       Bunny walks from center-screen (x=0) toward right (x=3.5).
       Start at 20% scroll progress, arrive at 75%.               */
    const walkT   = smoothstep(0.2, 0.75, p)
    const targetX = walkT * 2.0     // keep bunny on-screen (right half)
    baseRef.current.position.x = THREE.MathUtils.lerp(
      baseRef.current.position.x, targetX, delta * 6
    )

    /* ── VERTICAL BOB (simulated walk) ── */
    const wEnter = smoothstep(0.2, 0.35, p) * (1 - smoothstep(0.7, 0.82, p))
    const bob = wEnter > 0.01 ? Math.sin(t * 10) * 0.06 * wEnter : 0
    baseRef.current.position.y = THREE.MathUtils.lerp(
      baseRef.current.position.y, bob, delta * 14
    )

    /* ── BASE ROTATION (facing direction) ──
       0      = facing camera (idle)
       +π/2   = facing right  (walking)
       +3π/2  = facing left, toward cards-col — continued spin */
    let targetBaseY = 0
    if (p >= 0.2 && p < 0.75) {
      targetBaseY = Math.PI * 0.5 * smoothstep(0.2, 0.36, p)
    } else if (p >= 0.75) {
      targetBaseY = Math.PI * 0.5 + Math.PI * smoothstep(0.75, 0.93, p)
    }
    baseRef.current.rotation.y = THREE.MathUtils.lerp(
      baseRef.current.rotation.y, targetBaseY, delta * 3
    )

    /* ── PROCEDURAL POINTING via bones ──
       Model faces left (toward cards-col) at p≥0.75. Once turned, the
       L-side limb lands on the camera-facing side (verified from
       bind-pose bone offsets), so it's the one that reads as pointing
       at the cards instead of being hidden behind the torso.
       Bone names use spaces, not underscores: "Bip001 L UpperArm_013" */
    const bones   = boneRef.current
    const pointT  = smoothstep(0.78, 0.96, p)

    const lUp   = Object.values(bones).find(b => b.name.includes('L UpperArm'))
    const lFore = Object.values(bones).find(b => b.name.includes('L Forearm'))
    const lHand = Object.values(bones).find(b => b.name.includes('L Hand'))
    // Also get spine for a slight lean-back pose while pointing
    const spine = bones['Bip001 Spine_02']

    if (lUp) {
      lUp.rotation.z = THREE.MathUtils.lerp(lUp.rotation.z, pointT * -1.1,  delta * 4)
      lUp.rotation.y = THREE.MathUtils.lerp(lUp.rotation.y, pointT * -0.3,  delta * 4)
    }
    if (lFore) {
      lFore.rotation.y = THREE.MathUtils.lerp(lFore.rotation.y, pointT * -0.3, delta * 4)
    }
    if (lHand) {
      lHand.rotation.z = THREE.MathUtils.lerp(lHand.rotation.z, pointT * 0.15, delta * 4)
    }
    if (spine) {
      // Slight chest lean toward the pointing direction
      spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, pointT * 0.1, delta * 3)
    }

    /* ── MOUSE PARALLAX (inner group) ──
       Less parallax in pointing phase so the extended arm stays stable */
    const pxScale = p > 0.75 ? 0.1 : 0.25
    innerRef.current.rotation.y = THREE.MathUtils.lerp(
      innerRef.current.rotation.y, mx * pxScale, delta * 5
    )
    innerRef.current.rotation.x = THREE.MathUtils.lerp(
      innerRef.current.rotation.x, my * -0.1, delta * 5
    )
  })

  return (
    /* baseRef: scroll-driven position/scale/rotation */
    <group ref={baseRef}>
      {/* innerRef: subtle mouse-parallax tilt */}
      <group ref={innerRef}>
        {/* wrapRef: auto-fit scale + vertical centering */}
        <group ref={wrapRef}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  )
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.8}
        color="#fff5f8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 4, 3]}  intensity={0.6} color="#ff99cc" />
      <pointLight position={[ 4, -1, 3]} intensity={0.25} color="#ff4499" />
    </>
  )
}

export default function BunnyScene({ scrollProgress, mousePos }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 46 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      shadows
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <SceneLights />
      <Suspense fallback={null}>
        <BunnyModel scrollProgress={scrollProgress} mousePos={mousePos} />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload('/bunny_character.glb')
