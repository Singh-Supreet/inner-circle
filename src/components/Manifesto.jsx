import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import "./Manifesto.css";

gsap.registerPlugin(ScrollTrigger);

// ── 3D Horse ──────────────────────────────────────────────────────────────────

const BONE_NAMES = [
  "Bip001_Pelvis_03",
  "Bip001_Spine_04",
  "Bip001_Head_08",
  "Bip001_L_Clavicle_09",
  "Bip001_L_UpperArm_010",
  "Bip001_L_Forearm_011",
  "Bip001_R_Clavicle_013",
  "Bip001_R_UpperArm_014",
  "Bip001_R_Forearm_015",
  "Bip001_L_Thigh_022",
  "Bip001_L_Calf_023",
  "Bip001_L_HorseLink_024",
  "Bip001_R_Thigh_026",
  "Bip001_R_Calf_027",
  "Bip001_R_HorseLink_028",
  "Tail_Bone001_018",
  "Tail_Bone002_019",
  "Tail_Bone003_020",
];

function HorseModel({ scrollProgressRef }) {
  const groupRef = useRef();
  const fitRef = useRef();
  const bonesRef = useRef({});
  const initRotRef = useRef({});
  const { scene } = useGLTF("/horse.glb");

  useEffect(() => {
    if (!fitRef.current) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = 2.8 / size.y;
    fitRef.current.scale.setScalar(s);
    fitRef.current.position.set(-center.x * s, -center.y * s, -center.z * s);
    scene.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });

    const bones = {};
    const initRot = {};
    scene.traverse((node) => {
      if (BONE_NAMES.includes(node.name)) {
        bones[node.name] = node;
        initRot[node.name] = {
          x: node.rotation.x,
          y: node.rotation.y,
          z: node.rotation.z,
        };
      }
    });
    bonesRef.current = bones;
    initRotRef.current = initRot;
  }, [scene]);

  useFrame(() => {
    const bones = bonesRef.current;
    const initRot = initRotRef.current;
    if (!Object.keys(bones).length) return;

    const progress = scrollProgressRef.current;
    // 5 full stride cycles across the whole scroll section
    const phase = progress * 5 * Math.PI * 2;
    const PI = Math.PI;

    const ir = (name, axis) => initRot[name]?.[axis] ?? 0;
    const set = (name, axis, val) => {
      if (bones[name]) bones[name].rotation[axis] = ir(name, axis) + val;
    };

    // ── Pelvis vertical bob (2 bobs per stride) ───────────────────────────────
    set("Bip001_Pelvis_03", "x", Math.sin(phase * 2) * 0.028);

    // ── Spine lateral sway ────────────────────────────────────────────────────
    set("Bip001_Spine_04", "z", Math.sin(phase * 2) * 0.018);

    // ── Head nod ──────────────────────────────────────────────────────────────
    set("Bip001_Head_08", "x", Math.sin(phase) * 0.07);

    // ── Front Left (FL) — in phase with Rear Right (RR) ──────────────────────
    const fl = phase;
    set("Bip001_L_Clavicle_09", "z", Math.sin(fl) * 0.18);
    set("Bip001_L_UpperArm_010", "z", Math.sin(fl) * 0.42);
    // knee only bends on the forward swing
    set("Bip001_L_Forearm_011", "x", Math.max(0, Math.sin(fl + 0.9)) * 0.48);

    // ── Front Right (FR) — opposite phase ────────────────────────────────────
    const fr = phase + PI;
    set("Bip001_R_Clavicle_013", "z", Math.sin(fr) * 0.18);
    set("Bip001_R_UpperArm_014", "z", Math.sin(fr) * 0.42);
    set("Bip001_R_Forearm_015", "x", Math.max(0, Math.sin(fr + 0.9)) * 0.48);

    // ── Rear Left (RL) — opposite phase to FL ────────────────────────────────
    const rl = phase + PI;
    set("Bip001_L_Thigh_022", "z", Math.sin(rl) * 0.38);
    set("Bip001_L_Calf_023", "z", Math.max(0, Math.sin(rl + 0.9)) * 0.44);
    set("Bip001_L_HorseLink_024", "y", Math.max(0, Math.sin(rl + 1.2)) * 0.22);

    // ── Rear Right (RR) — in phase with FL ───────────────────────────────────
    const rr = phase;
    set("Bip001_R_Thigh_026", "z", Math.sin(rr) * 0.38);
    set("Bip001_R_Calf_027", "z", Math.max(0, Math.sin(rr + 0.9)) * 0.44);
    set("Bip001_R_HorseLink_028", "y", Math.max(0, Math.sin(rr + 1.2)) * 0.22);

    // ── Tail wave ─────────────────────────────────────────────────────────────
    set("Tail_Bone001_018", "z", Math.sin(phase * 1.4) * 0.14);
    set("Tail_Bone002_019", "z", Math.sin(phase * 1.4 + 0.5) * 0.11);
    set("Tail_Bone003_020", "z", Math.sin(phase * 1.4 + 1.0) * 0.08);
  });

  return (
    <group ref={groupRef} rotation={[0, Math.PI, 0]}>
      <group ref={fitRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function HorseScene({ scrollProgressRef }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      shadows
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.6}
        color="#fff5f8"
        castShadow
      />
      <pointLight position={[-3, 3, 2]} intensity={0.6} color="#E11D63" />
      <pointLight position={[3, -1, 3]} intensity={0.2} color="#ff99cc" />
      <Suspense fallback={null}>
        <HorseModel scrollProgressRef={scrollProgressRef} />
      </Suspense>
    </Canvas>
  );
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const PARAGRAPHS = [
  <>
    Welcome to the ultimate convergence of{" "}
    <strong>digital rebels, underground creators</strong>, and{" "}
    <strong>top-tier product builders</strong> who refuse to follow guidelines.
  </>,
  <>
    This is where <strong>high-end design principles</strong> meet{" "}
    <strong>pure technical execution</strong>, without the corporate bureaucracy
    and meaningless standard aesthetics.
  </>,
  <>
    We gather in the shadows to build{" "}
    <strong>the next generation of scalable interfaces</strong>,{" "}
    <strong>automated workflows</strong>, and{" "}
    <strong>decentralized assets</strong> that move the cultural needle forward.
  </>,
  <>
    Experience <strong>zero-bullshit networking</strong>,{" "}
    <strong>weekly alpha allocations</strong>, and{" "}
    <strong>unreleased toolkits</strong> to shape the internet's landscape.
  </>,
  <>
    This is not another social club for casual enthusiasts or template
    consumers. This is a <strong>highly selective environment</strong>{" "}
    engineered for <strong>hyper-productive creators</strong>,{" "}
    <strong>UI/UX visionaries</strong>, and{" "}
    <strong>AI prompt architects</strong> who operate at the absolute limits of
    digital product creation.
  </>,
  <>
    Our framework is simple: <strong>eliminate intermediate noise</strong>,{" "}
    <strong>automate the execution layer</strong>, and{" "}
    <strong>deploy elite digital products</strong> while others are still
    scheduling meetings. We loop through complex design systems, break
    conventional grids, and execute <strong>fluid interactions</strong> that
    redefine digital environments.
  </>,
];

const LOGOS = [
  "GitHub",
  "Voiceflow",
  "Zendesk",
  "Pendo",
  "Glide",
  "Canva",
  "Google",
  "Figma",
  "Notion",
  "Linear",
  "Vercel",
  "Stripe",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Manifesto() {
  const sectionRef = useRef();
  const lineRefs = useRef([]);
  const paragraphsRef = useRef();
  const windowRef = useRef();
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const lines = lineRefs.current.filter(Boolean);
      const inner = paragraphsRef.current;
      const win = windowRef.current;
      if (!inner || !win) return;

      gsap.set(lines, {
        opacity: 0.07,
        filter: "blur(6px)",
        transform: "perspective(700px) rotateX(-40deg)",
      });

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: `+=${lines.length * 520}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;

          const floatIdx = self.progress * (lines.length - 1);
          const loIdx = Math.floor(floatIdx);
          const hiIdx = Math.min(loIdx + 1, lines.length - 1);
          const frac = floatIdx - loIdx;
          const halfH = win.offsetHeight / 2;

          // Interpolate center Y of active paragraph so the scroll feels smooth
          const loCenter =
            lines[loIdx].offsetTop + lines[loIdx].offsetHeight / 2;
          const hiCenter =
            lines[hiIdx].offsetTop + lines[hiIdx].offsetHeight / 2;
          const targetY = loCenter + (hiCenter - loCenter) * frac;

          gsap.set(inner, { y: halfH - targetY });

          lines.forEach((el, i) => {
            const dist = Math.abs(i - floatIdx);
            const elMidY = el.offsetTop + el.offsetHeight / 2;
            const relPos = targetY - elMidY; // px from window center
            const angle = Math.max(-50, Math.min(50, (relPos / halfH) * 50));

            let opacity, blur;
            if (dist < 0.5) {
              opacity = 1;
              blur = 0;
            } else if (dist < 1.5) {
              const t = dist - 0.5;
              opacity = 1 - t * 0.75;
              blur = t * 4;
            } else {
              opacity = Math.max(0.05, 0.25 - (dist - 1.5) * 0.1);
              blur = Math.min(8, 4 + (dist - 1.5) * 2);
            }

            el.style.opacity = opacity;
            el.style.filter = `blur(${blur}px)`;
            el.style.transform = `perspective(700px) rotateX(${angle}deg)`;
          });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="manifesto" id="manifesto">
      <div className="manifesto-pill" />

      <div className="manifesto-inner">
        {/* Left: scroll-reveal text */}
        <div className="manifesto-text-col">
          <div className="manifesto-para-window" ref={windowRef}>
            <div className="manifesto-paragraphs" ref={paragraphsRef}>
              {PARAGRAPHS.map((para, i) => (
                <p
                  key={i}
                  ref={(el) => (lineRefs.current[i] = el)}
                  className="manifesto-para"
                >
                  {para}
                </p>
              ))}
            </div>
          </div>
          {/* Bottom: logo marquee */}
          <div className="manifesto-marquee-wrap">
            <div className="manifesto-marquee">
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <span key={i} className="manifesto-logo-item">
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 3D horse */}
        <div className="manifesto-model-col">
          <HorseScene scrollProgressRef={scrollProgressRef} />
        </div>
      </div>
       {/* Bottom: logo marquee */}
      {/* <div className="manifesto-marquee-wrap">
        <div className="manifesto-marquee">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <span key={i} className="manifesto-logo-item">{logo}</span>
          ))}
        </div>
      </div> */}
    </section>
  );
}

useGLTF.preload("/horse.glb");
