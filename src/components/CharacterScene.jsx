import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { HERO_TIMELINE as HT } from '../heroTimeline'

function smoothstep(lo, hi, t) {
  const x = Math.max(0, Math.min(1, (t - lo) / (hi - lo)))
  return x * x * (3 - 2 * x)
}

// Bones we drive procedurally. Names are exact — this rig has no spaces
// for GLTFLoader to mangle, so direct lookup works without normalizing.
const BONE_NAMES = [
  'pelvis', 'spine_0', 'spine_1', 'spine_2', 'neck_0', 'head_0',
  'clavicle_l', 'arm_upper_l', 'arm_lower_l', 'hand_l',
  'clavicle_r', 'arm_upper_r', 'arm_lower_r', 'hand_r',
  'leg_upper_l', 'leg_lower_l', 'ankle_l',
  'leg_upper_r', 'leg_lower_r', 'ankle_r',
  // right-hand finger joints for the point gesture — each is a clean
  // single-axis hinge (unlike the shoulder), so additive Euler is safe here
  'finger_index_0_r', 'finger_index_1_r', 'finger_index_2_r',
  'finger_middle_0_r', 'finger_middle_1_r', 'finger_middle_2_r',
  'finger_ring_0_r', 'finger_ring_1_r', 'finger_ring_2_r',
  'finger_pinky_0_r', 'finger_pinky_1_r', 'finger_pinky_2_r',
  'finger_thumb_1_r', 'finger_thumb_2_r',
]

// Reused every frame to avoid per-frame allocations in the point-gesture aim solve.
const _yAxis     = new THREE.Vector3(0, 1, 0)
const _pointDir  = new THREE.Vector3(-0.989, -0.106, 0.103).normalize() // mostly screen-left, slight down, slight toward camera

// World-space target orientation for the pointing arm, computed once: aim
// the bone's local +Y (bone-length) axis at _pointDir, using world "up" as
// the roll reference (a standard look-at basis — same idea as a camera's
// lookAt(eye, target, up)). Just aiming +Y via setFromUnitVectors leaves the
// roll (twist around the aim axis) arbitrary — verified via forward
// kinematics that it differed from the rest pose's roll by ~123°, which is
// exactly what made the forearm appear to twist and "face top" mid-raise.
const _qBoneWorldTarget = (() => {
  const newY = _pointDir.clone()
  const newX = _yAxis.clone().addScaledVector(newY, -_yAxis.dot(newY)).normalize()
  const newZ = new THREE.Vector3().crossVectors(newX, newY).normalize()
  const m = new THREE.Matrix4().makeBasis(newX, newY, newZ)
  return new THREE.Quaternion().setFromRotationMatrix(m)
})()

const _qParentWorld    = new THREE.Quaternion()
const _qArmTargetLocal = new THREE.Quaternion()
const _qArmPose        = new THREE.Quaternion()

/* ── 3D character model ── */
function CharacterModel({ scrollProgress, mousePos }) {
  const wrapRef    = useRef()   // auto-fit wrapper (fixed scale)
  const baseRef    = useRef()   // scroll-driven: position, base rotation, scale
  const innerRef   = useRef()   // mouse-driven: parallax rotation
  const bonesRef    = useRef({}) // cached bones for procedural walk cycle
  const initRotRef  = useRef({}) // rest-pose rotation per bone — this rig's bones aren't authored at identity rotation
  const restQuatRef = useRef({}) // full rest quaternion for bones whose rest pose isn't single-axis (see arm_upper_r below)

  const { scene } = useGLTF('/balkan_romanov.glb')

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

    // ── Map the bones we animate ──
    const bones = {}
    scene.traverse(obj => { if (obj.isBone && BONE_NAMES.includes(obj.name)) bones[obj.name] = obj })
    bonesRef.current = bones

    // Log bone names once so you can verify which ones are found
    console.log('[CharacterScene] bones:', Object.keys(bones).join(', '))

    // This rig's bones are authored with non-zero rest rotations (the
    // upper-leg bone alone sits ~165° off identity in its bind pose), so
    // every procedural rotation below must be layered ON TOP of the
    // captured rest pose — overwriting rotation.x/y/z directly snaps the
    // limb out of its bind pose (this is exactly what broke the old rig).
    const initRot = {}
    for (const [name, bone] of Object.entries(bones)) {
      initRot[name] = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z }
    }
    initRotRef.current = initRot

    // arm_upper_r's rest pose mixes rotation across all three axes (unlike
    // the legs, which are basically single-axis), so nudging rotation.x/z
    // independently makes it swing through an ugly backward/downward arc on
    // the way to the point pose. Keep its full rest quaternion so the point
    // gesture can be solved as a direct world-space aim instead (see useFrame).
    if (bones.arm_upper_r) restQuatRef.current.arm_upper_r = bones.arm_upper_r.quaternion.clone()

    // ── Shadows ──
    scene.traverse(child => { if (child.isMesh) child.castShadow = true })
  }, [scene])

  useFrame((_, delta) => {
    if (!baseRef.current || !innerRef.current) return

    const p  = scrollProgress.current
    const mx = mousePos.current.x
    const my = mousePos.current.y

    // On mobile the character is fully static — no walk, no turn, no point
    // gesture. Gating wEnter/pointT here (rather than just position/rotation
    // further down) is what actually matters: those two drive everything
    // else in this function (legs, bob, sway, arm raise, fingers), so
    // zeroing them is enough to collapse the whole rig back to rest pose.
    const isMobile = window.innerWidth < 768

    const bones = bonesRef.current
    const ir    = initRotRef.current
    const rest  = (name, axis) => ir[name]?.[axis] ?? 0
    const set   = (name, axis, val) => {
      if (bones[name]) bones[name].rotation[axis] = rest(name, axis) + val
    }

    /* ── WALKING WEIGHT (0 outside walk, 1 at peak) ── */
    const wEnter = isMobile ? 0 : smoothstep(HT.walkStart, HT.profileDone, p) * (1 - smoothstep(HT.walkFadeStart, HT.walkEnd, p))
    const isWalking = wEnter > 0.01

    /* ── STRIDE PHASE — driven by scroll position, not wall-clock time ──
       so the gait freezes the instant scrolling stops (matches the horse,
       which derives its phase from scrollProgressRef.current, not elapsedTime).
       4 full stride cycles across the walk window (was 6 — fewer, slower
       steps over the same distance reads as a calmer walk, not a flailing run). */
    const walkWindowT = THREE.MathUtils.clamp((p - HT.walkStart) / (HT.walkEnd - HT.walkStart), 0, 1)
    const stridePhase = walkWindowT * 4 * Math.PI * 2

    /* ── SCROLL-DRIVEN POSITION ──
       On mobile the character stays centered (no walk).
       On desktop it walks right (x=2.0) then turns to face the cards. */
    const walkT   = isMobile ? 0 : smoothstep(HT.walkStart, HT.walkEnd, p)
    const targetX = walkT * 2.0
    // delta*2 (was *6, then *3) — a fast scroll flick jumps the target a lot
    // at once; the slower catch-up keeps that from looking like a teleport.
    baseRef.current.position.x = THREE.MathUtils.lerp(
      baseRef.current.position.x, targetX, delta * 2
    )

    /* ── SMOOTH VERTICAL BOB (procedural walk rhythm) ──
       Use Math.abs(sin) so the body only ever moves UP from rest —
       it rises twice per stride, which looks like a natural walk, not a jump. */
    const bobAmp  = 0.035
    const bob     = isWalking ? Math.abs(Math.sin(stridePhase)) * bobAmp * wEnter : 0
    baseRef.current.position.y = THREE.MathUtils.lerp(
      baseRef.current.position.y, bob, delta * 7
    )

    /* ── SUBTLE LATERAL SWAY (half the bob freq) ── */
    const swayAmp = 0.012
    const sway    = isWalking ? Math.sin(stridePhase * 0.5) * swayAmp * wEnter : 0

    /* ── BASE ROTATION (facing direction) ──
       0      = facing camera (idle)
       +π/2   = facing right  (walking)
       +3π/2  = facing left, toward cards-col — continued spin
       Turn finishes at HT.turnEnd, BEFORE the point gesture
       (HT.turnEnd→HT.pointEnd) starts, so the sequence reads as
       turn, then point, then cards.
       On mobile: stays facing the camera (no walk, no turn). */
    let targetBaseY = 0
    if (!isMobile) {
      if (p >= HT.walkStart && p < HT.walkEnd) {
        targetBaseY = Math.PI * 0.5 * smoothstep(HT.walkStart, HT.profileDone, p)
      } else if (p >= HT.walkEnd) {
        targetBaseY = Math.PI * 0.5 + Math.PI * smoothstep(HT.walkEnd, HT.turnEnd, p)
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

    // pointT needed by both the leg and arm-raise sections — starts only
    // after the turn above has fully completed (and never on mobile)
    const pointT = isMobile ? 0 : smoothstep(HT.turnEnd, HT.pointEnd, p)

    /* ── PROCEDURAL LEG WALK ──
       Right leg uses stridePhase directly.  Left leg = right + π  (exact opposite). */
    const rPhase = stridePhase           // right leg
    const lPhase = stridePhase + Math.PI // left leg — 180° out of phase

    const thighAmp  = 0.45   // forward/back swing (radians)
    const calfBase  = 0.15   // resting knee bend (always bent a little)
    const calfExtra = 0.30   // extra knee bend at push-off
    const footAmp   = 0.14   // foot pitch compensation
    const armAmp    = 0.28   // arm counter-swing

    if (isWalking) {
      // ── Thighs ──
      set('leg_upper_r', 'x', Math.sin(rPhase) * thighAmp * wEnter)
      set('leg_upper_l', 'x', Math.sin(lPhase) * thighAmp * wEnter)

      // ── Calves / knees (sin < 0 means leg is behind → push-off → bend more) ──
      set('leg_lower_r', 'x', -(calfBase + Math.max(0, -Math.sin(rPhase)) * calfExtra) * wEnter)
      set('leg_lower_l', 'x', -(calfBase + Math.max(0, -Math.sin(lPhase)) * calfExtra) * wEnter)

      // ── Ankles (keep feet from pointing too far down) ──
      set('ankle_r', 'x', -Math.sin(rPhase) * footAmp * wEnter)
      set('ankle_l', 'x', -Math.sin(lPhase) * footAmp * wEnter)

      // ── Left arm counter-swing (right arm is reserved for the point gesture) ──
      const lArmW = (1 - Math.min(1, pointT * 12)) * wEnter
      set('arm_upper_l', 'x', Math.sin(rPhase + Math.PI) * armAmp * lArmW)
    } else {
      // Smoothly return walk bones to rest pose
      const names = ['leg_upper_r', 'leg_upper_l', 'leg_lower_r', 'leg_lower_l', 'ankle_r', 'ankle_l', 'arm_upper_l']
      for (const name of names) {
        if (bones[name]) bones[name].rotation.x = THREE.MathUtils.lerp(
          bones[name].rotation.x, rest(name, 'x'), delta * 5
        )
      }
    }

    /* ── RIGHT ARM RAISE, pointing toward the cards ──
       Model has finished its turn (targetBaseY above) by the time this
       engages (p≥HT.turnEnd), so the point reads as a distinct beat after
       the turn, not blended into it.
       arm_upper_r's rest pose mixes all three axes, so nudging rotation.x/z
       independently (like the old left-arm version did) swings the arm
       through an ugly backward arc en route — fixed by solving a target
       world-space orientation (`_qBoneWorldTarget`, defined above) and
       slerping rest → that target as pointT rises. */
    if (bones.arm_upper_r && restQuatRef.current.arm_upper_r) {
      bones.arm_upper_r.parent.getWorldQuaternion(_qParentWorld)
      _qArmTargetLocal.copy(_qParentWorld).invert().multiply(_qBoneWorldTarget)

      _qArmPose.copy(restQuatRef.current.arm_upper_r).slerp(_qArmTargetLocal, pointT)
      bones.arm_upper_r.quaternion.slerp(_qArmPose, delta * 8)
    }
    if (bones.arm_lower_r) {
      // Less elbow bend than before — straightening the arm extends the
      // hand further left along the same pointing direction (verified via
      // forward kinematics: -0.8 lands the hand at ~68% screen-width, -0.4 at ~67%).
      bones.arm_lower_r.rotation.x = THREE.MathUtils.lerp(
        bones.arm_lower_r.rotation.x, rest('arm_lower_r', 'x') + pointT * 0, delta * 5
      )
    }
    if (bones.spine_2) {
      bones.spine_2.rotation.y = THREE.MathUtils.lerp(
        bones.spine_2.rotation.y, rest('spine_2', 'y') + pointT * -0, delta * 3
      )
    }

    /* ── HAND SHAPE: curl into a fist, leave the index extended ──
       Without this the hand just sits in its open, relaxed bind-pose shape
       no matter how the arm aims — it never actually forms a "point."
       Each finger joint here is a clean single-axis hinge (confirmed via
       forward kinematics, unlike the shoulder), so a plain additive curl
       is safe. The index is straightened out of its mildly-curled rest
       pose instead of curled further, since it's the finger doing the
       pointing. */
    const curlAmp = 1.1
    for (const seg of ['0', '1', '2']) {
      set(`finger_middle_${seg}_r`, 'x', -curlAmp * pointT)
      set(`finger_ring_${seg}_r`,   'x', -curlAmp * pointT)
      set(`finger_pinky_${seg}_r`, 'x', -curlAmp * pointT)
    }
    set('finger_thumb_1_r', 'x', -curlAmp * pointT)
    set('finger_thumb_2_r', 'x', -curlAmp * pointT)
    for (const seg of ['0', '1', '2']) {
      const name = `finger_index_${seg}_r`
      set(name, 'x', -rest(name, 'x') * pointT)
    }

    /* ── MOUSE PARALLAX (inner group) ──
       Less parallax in the raise phase so the extended arm stays stable */
    const pxScale = p > HT.turnEnd ? 0.1 : 0.25
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

export default function CharacterScene({ scrollProgress, mousePos }) {
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
        <CharacterModel scrollProgress={scrollProgress} mousePos={mousePos} />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload('/balkan_romanov.glb')
