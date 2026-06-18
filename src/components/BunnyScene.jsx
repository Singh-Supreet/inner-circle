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
  const wrapRef    = useRef()   // auto-fit wrapper (fixed scale)
  const baseRef    = useRef()   // scroll-driven: position, base rotation, scale
  const innerRef   = useRef()   // mouse-driven: parallax rotation
  const boneRef    = useRef({}) // bone map for procedural pointing
  const walkAction = useRef(null) // cached animation action
  const legRef     = useRef({}) // cached leg/arm bones for walk cycle

  const { scene, animations } = useGLTF('/bunny_character.glb')
  const { actions, names }    = useAnimations(animations, baseRef)

  useEffect(() => {
    if (!wrapRef.current) return

    // ── Auto-fit: scale model so it fills ~88% of viewport height ──
    const box    = new THREE.Box3().setFromObject(scene)
    const size   = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)

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

    // Log bone names once so you can verify which ones are found
    console.log('[BunnyScene] bones:', Object.keys(bones).join(', '))

    // ── Cache leg + arm bones for procedural walk cycle ──
    const findBone = (...terms) =>
      Object.values(bones).find(b =>
        terms.some(t => b.name.toLowerCase().includes(t.toLowerCase()))
      ) ?? null

    legRef.current = {
      rThigh: findBone('R Thigh', 'RightUpLeg', 'Thigh_R', 'thigh.r'),
      lThigh: findBone('L Thigh', 'LeftUpLeg',  'Thigh_L', 'thigh.l'),
      rCalf:  findBone('R Calf',  'R Shin', 'RightLeg', 'Calf_R', 'Shin_R', 'calf.r'),
      lCalf:  findBone('L Calf',  'L Shin', 'LeftLeg',  'Calf_L', 'Shin_L', 'calf.l'),
      rFoot:  findBone('R Foot',  'RightFoot', 'Foot_R', 'foot.r'),
      lFoot:  findBone('L Foot',  'LeftFoot',  'Foot_L', 'foot.l'),
      rArm:   findBone('R UpperArm', 'RightArm', 'UpperArm_R', 'upperarm.r'),
    }

    // ── Shadows ──
    scene.traverse(child => { if (child.isMesh) child.castShadow = true })

    // ── Try to play an embedded walk animation ──
    if (names.length > 0) {
      const walkName = names.find(n => /walk/i.test(n)) ?? names[0]
      const action   = actions[walkName]
      if (action) {
        action.reset()
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.clampWhenFinished = false
        action.play()
        action.paused = true   // driven by timeScale each frame
        walkAction.current = action
      }
    }
  }, [scene, actions, names])

  useFrame((state, delta) => {
    if (!baseRef.current || !innerRef.current) return

    const p  = scrollProgress.current
    const mx = mousePos.current.x
    const my = mousePos.current.y
    const t  = state.clock.elapsedTime

    /* ── WALKING WEIGHT (0 outside walk, 1 at peak) ── */
    const wEnter = smoothstep(0.2, 0.35, p) * (1 - smoothstep(0.7, 0.82, p))
    const isWalking = wEnter > 0.01

    /* ── DRIVE ANIMATION CLIP (if the GLB has one) ──
       timeScale 0 = paused, 1 = normal speed. Fade in/out with wEnter. */
    if (walkAction.current) {
      if (isWalking) {
        walkAction.current.paused    = false
        walkAction.current.timeScale = wEnter * 1.2
      } else {
        walkAction.current.paused = true
      }
    }

    /* ── SCROLL-DRIVEN POSITION ──
       On mobile the bunny stays centered (no walk).
       On desktop it walks right (x=2.0) then turns to face the cards. */
    const isMobile = window.innerWidth < 768
    const walkT   = isMobile ? 0 : smoothstep(0.2, 0.75, p)
    const targetX = walkT * 2.0
    baseRef.current.position.x = THREE.MathUtils.lerp(
      baseRef.current.position.x, targetX, delta * 6
    )

    /* ── SMOOTH VERTICAL BOB (procedural walk rhythm) ──
       Use Math.abs(sin) so the body only ever moves UP from rest —
       it rises twice per stride, which looks like a natural walk, not a jump.
       Frequency ~5 rad/s ≈ 0.8 Hz (comfortable walk pace).
       Amplitude 0.035 is subtle. Only active if no clip is playing. */
    const bobFreq = 5
    const bobAmp  = walkAction.current ? 0 : 0.035  // skip if clip handles it
    const bob     = isWalking ? Math.abs(Math.sin(t * bobFreq)) * bobAmp * wEnter : 0
    baseRef.current.position.y = THREE.MathUtils.lerp(
      baseRef.current.position.y, bob, delta * 7
    )

    /* ── SUBTLE LATERAL SWAY (half the bob freq) ──
       Body shifts left/right opposite to each foot strike. */
    const swayAmp = walkAction.current ? 0 : 0.012
    const sway    = isWalking ? Math.sin(t * bobFreq * 0.5) * swayAmp * wEnter : 0

    /* ── BASE ROTATION (facing direction) ──
       0      = facing camera (idle)
       +π/2   = facing right  (walking)
       +3π/2  = facing left, toward cards-col — continued spin
       On mobile: stays facing the camera (no walk, no turn). */
    let targetBaseY = 0
    if (!isMobile) {
      if (p >= 0.2 && p < 0.75) {
        targetBaseY = Math.PI * 0.5 * smoothstep(0.2, 0.36, p)
      } else if (p >= 0.75) {
        targetBaseY = Math.PI * 0.5 + Math.PI * smoothstep(0.75, 0.93, p)
      }
    }
    baseRef.current.rotation.y = THREE.MathUtils.lerp(
      baseRef.current.rotation.y, targetBaseY + sway, delta * 3
    )

    /* ── FORWARD LEAN while walking ── */
    const leanTarget = isWalking ? 0.04 * wEnter : 0
    baseRef.current.rotation.x = THREE.MathUtils.lerp(
      baseRef.current.rotation.x, leanTarget, delta * 6
    )

    // pointT needed by both the leg and gun-aim sections
    const pointT = smoothstep(0.75, 0.90, p)

    /* ── PROCEDURAL LEG WALK ──
       Right leg phase = t * freq.  Left leg = right + π  (exact opposite).
       One full stride cycle ≈ 1.26 s at walkFreq 5 rad/s.

       Thigh:  swings forward (+x) / back (-x) around hip
       Calf:   always slightly bent; bends more when foot is pushing off (back phase)
       Foot:   small counter-rotation to stay roughly level
       rArm:   swings opposite to right leg (standard bipedal counter-swing)       */
    const walkFreq = 5          // must match bobFreq above so bob + steps stay in sync
    const rPhase   = t * walkFreq           // right leg
    const lPhase   = t * walkFreq + Math.PI // left leg — 180° out of phase

    {
      const lb        = legRef.current
      const thighAmp  = 0.45   // degrees of forward/back swing (radians)
      const calfBase  = 0.15   // resting knee bend (always bent a little)
      const calfExtra = 0.30   // extra knee bend at push-off
      const footAmp   = 0.14   // foot pitch compensation
      const armAmp    = 0.28   // arm counter-swing

      if (isWalking) {
        // ── Thighs ──
        if (lb.rThigh) lb.rThigh.rotation.x = THREE.MathUtils.lerp(
          lb.rThigh.rotation.x, Math.sin(rPhase) * thighAmp * wEnter, delta * 12
        )
        if (lb.lThigh) lb.lThigh.rotation.x = THREE.MathUtils.lerp(
          lb.lThigh.rotation.x, Math.sin(lPhase) * thighAmp * wEnter, delta * 12
        )

        // ── Calves / knees ──
        // sin < 0 means leg is behind → push-off → bend more
        if (lb.rCalf) lb.rCalf.rotation.x = THREE.MathUtils.lerp(
          lb.rCalf.rotation.x,
          -(calfBase + Math.max(0, -Math.sin(rPhase)) * calfExtra) * wEnter,
          delta * 12
        )
        if (lb.lCalf) lb.lCalf.rotation.x = THREE.MathUtils.lerp(
          lb.lCalf.rotation.x,
          -(calfBase + Math.max(0, -Math.sin(lPhase)) * calfExtra) * wEnter,
          delta * 12
        )

        // ── Feet (keep them from pointing too far down) ──
        if (lb.rFoot) lb.rFoot.rotation.x = THREE.MathUtils.lerp(
          lb.rFoot.rotation.x, -Math.sin(rPhase) * footAmp * wEnter, delta * 12
        )
        if (lb.lFoot) lb.lFoot.rotation.x = THREE.MathUtils.lerp(
          lb.lFoot.rotation.x, -Math.sin(lPhase) * footAmp * wEnter, delta * 12
        )

        // ── Right arm counter-swing (suppress when gun-pointing) ──
        // Right arm goes back when right leg goes forward, forward when leg goes back
        const rArmW = (1 - Math.min(1, pointT * 12)) * wEnter
        if (lb.rArm) lb.rArm.rotation.x = THREE.MathUtils.lerp(
          lb.rArm.rotation.x, Math.sin(rPhase + Math.PI) * armAmp * rArmW, delta * 12
        )
      } else {
        // Smoothly return legs to rest pose
        const rbs = [lb.rThigh, lb.lThigh, lb.rCalf, lb.lCalf, lb.rFoot, lb.lFoot, lb.rArm]
        for (const bone of rbs) {
          if (bone) bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, 0, delta * 5)
        }
      }
    }

    /* ── PROCEDURAL GUN AIM via bones ──
       Model faces left (toward cards-col) at p≥0.75. L-side arm is
       camera-facing when turned left. Gun is in left arm.           */
    const bones  = boneRef.current

    const lClav = Object.values(bones).find(b => b.name.includes('L Clavicle'))
    const lUp   = Object.values(bones).find(b => b.name.includes('L UpperArm'))
    const lFore = Object.values(bones).find(b => b.name.includes('L Forearm'))
    const lHand = Object.values(bones).find(b => b.name.includes('L Hand'))
    const spine = bones['Bip001 Spine_02']

    if (lClav) {
      lClav.rotation.y = THREE.MathUtils.lerp(lClav.rotation.y, pointT * -0.5, delta * 5)
    }
    if (lUp) {
      // Blend walking counter-swing with gun-point aim.
      // When pointing (pointT→1) the arm extends forward; when walking it swings back/forth.
      const lArmWalk = Math.sin(lPhase + Math.PI) * 0.28 * wEnter * (1 - pointT)
      lUp.rotation.x = THREE.MathUtils.lerp(lUp.rotation.x, lArmWalk + pointT * -2.0, delta * 5)
      lUp.rotation.z = THREE.MathUtils.lerp(lUp.rotation.z, pointT * -0.5, delta * 5)
      lUp.rotation.y = THREE.MathUtils.lerp(lUp.rotation.y, pointT *  0.4, delta * 5)
    }
    if (lFore) {
      lFore.rotation.x = THREE.MathUtils.lerp(lFore.rotation.x, pointT * -0.8, delta * 5)
      lFore.rotation.y = THREE.MathUtils.lerp(lFore.rotation.y, pointT *  0.3, delta * 5)
    }
    if (lHand) {
      lHand.rotation.x = THREE.MathUtils.lerp(lHand.rotation.x, pointT * -0.3, delta * 5)
      lHand.rotation.z = THREE.MathUtils.lerp(lHand.rotation.z, pointT *  0.2, delta * 5)
    }
    if (spine) {
      spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, pointT * 0.2, delta * 3)
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
