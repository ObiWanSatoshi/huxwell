import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Even distribution of points on a sphere
function fibonacciSphere(count, radius) {
  const points = []
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < count; i++) {
    const theta = Math.acos(1 - 2 * (i + 0.5) / count)
    const phi = (2 * Math.PI * i) / goldenRatio
    points.push([
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(theta),
    ])
  }
  return points
}

// Create circular ring geometry in a given plane
function createRingGeometry(radius, segments = 128, plane = 'xz') {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    if (plane === 'xz') pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius)
    else if (plane === 'yz') pts.push(0, Math.cos(a) * radius, Math.sin(a) * radius)
    else pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return geo
}

const GLOBE_RADIUS = 1.6
const ORBITAL_RADIUS = GLOBE_RADIUS * 1.3
const MILESTONES = [0.25, 0.5, 0.75]

export default function Globe({
  scrollTarget,
  scrollProgress,
  isMobile = false,
  reducedMotion = false,
  ctaSweepSignal = 0,
  mouse = { current: { x: 0, y: 0 } },
}) {
  const groupRef = useRef()
  const milestoneGlowRef = useRef(0)
  const prevScrollRef = useRef(0)
  const sweepProgressRef = useRef(-1)
  const { gl } = useThree()
  const pixelRatio = gl.getPixelRatio()
  const surfaceCount = isMobile ? 140 : 220
  const orbitalCount = isMobile ? 36 : 72
  const orbitalLinkCount = isMobile ? 140 : 320
  const maxConnections = isMobile ? 170 : 300
  const ringSegments = isMobile ? 84 : 128

  // ── Surface nodes ──────────────────────────────────────────
  const surfacePoints = useMemo(
    () => fibonacciSphere(surfaceCount, GLOBE_RADIUS),
    [surfaceCount],
  )

  const surfaceGeo = useMemo(() => {
    const positions = new Float32Array(surfaceCount * 3)
    const orders = new Float32Array(surfaceCount)
    const twinkle = new Float32Array(surfaceCount)
    surfacePoints.forEach((p, i) => {
      positions[i * 3] = p[0]
      positions[i * 3 + 1] = p[1]
      positions[i * 3 + 2] = p[2]
      orders[i] = i / surfaceCount
      twinkle[i] = Math.random()
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))
    geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 1))
    return geo
  }, [surfacePoints, surfaceCount])

  const surfaceMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uScroll: { value: 0 },
          uPixelRatio: { value: pixelRatio },
          uTime: { value: 0 },
          uMilestone: { value: 0 },
          uSweepPos: { value: -1 },
          uSweepStrength: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: /* glsl */ `
      attribute float aOrder;
      attribute float aTwinkle;
      uniform float uScroll;
      uniform float uPixelRatio;
      uniform float uTime;
      uniform float uMilestone;
      uniform float uSweepPos;
      uniform float uSweepStrength;
      uniform vec2 uMouse;
      varying float vAlpha;
      varying float vSweep;
      varying float vHover;
      void main() {
        float appear = smoothstep(aOrder * 0.5 + 0.005, aOrder * 0.5 + 0.04, uScroll);
        float pulse = 0.82 + 0.18 * sin(uTime * 1.4 + aTwinkle * 10.0);
        vec3 pos = position;
        vec4 projected = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        vec2 screen = projected.xy / projected.w;
        float mouseDist = length(screen - uMouse);
        float mouseAttract = exp(-pow(mouseDist * 8.0, 2.0)) * 0.018;
        pos += normalize(pos) * mouseAttract;
        vHover = mouseAttract;
        float sweepCoord = normalize(pos).x * 0.5 + 0.5;
        float sweep = exp(-pow((sweepCoord - uSweepPos) * 12.0, 2.0)) * uSweepStrength;
        vSweep = sweep;
        vAlpha = appear * pulse + uMilestone * 0.24 + sweep * 0.3 + mouseAttract * 1.1;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = (2.0 + aTwinkle * 0.35) * uPixelRatio;
      }
    `,
        fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vSweep;
      varying float vHover;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        if (length(c) > 0.5) discard;
        vec3 base = vec3(1.0, 1.0, 1.0);
        vec3 sweepColor = vec3(0.68, 0.88, 1.0);
        vec3 hoverColor = vec3(0.76, 0.91, 1.0);
        vec3 color = mix(base, sweepColor, clamp(vSweep * 1.3, 0.0, 1.0));
        color = mix(color, hoverColor, clamp(vHover * 28.0, 0.0, 0.35));
        gl_FragColor = vec4(color, clamp(vAlpha * 0.85, 0.0, 1.0));
      }
    `,
        transparent: true,
        depthWrite: false,
      }),
    [pixelRatio],
  )

  // ── Connection lines between nearby surface dots ───────────
  const { linesGeo, linesMat } = useMemo(() => {
    // Find pairs sorted by distance, limited
    const pairs = []
    for (let i = 0; i < surfacePoints.length; i++) {
      for (let j = i + 1; j < surfacePoints.length; j++) {
        const dx = surfacePoints[i][0] - surfacePoints[j][0]
        const dy = surfacePoints[i][1] - surfacePoints[j][1]
        const dz = surfacePoints[i][2] - surfacePoints[j][2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < GLOBE_RADIUS * 0.55) {
          pairs.push({ i, j, dist })
        }
      }
    }
    pairs.sort((a, b) => a.dist - b.dist)
    const limited = pairs.slice(0, maxConnections)

    const positions = new Float32Array(limited.length * 6)
    const orders = new Float32Array(limited.length * 2)
    const lineT = new Float32Array(limited.length * 2)
    const pulseOffset = new Float32Array(limited.length * 2)

    limited.forEach((pair, idx) => {
      const p1 = surfacePoints[pair.i]
      const p2 = surfacePoints[pair.j]
      positions[idx * 6] = p1[0]
      positions[idx * 6 + 1] = p1[1]
      positions[idx * 6 + 2] = p1[2]
      positions[idx * 6 + 3] = p2[0]
      positions[idx * 6 + 4] = p2[1]
      positions[idx * 6 + 5] = p2[2]
      // Line appears after BOTH endpoint dots are visible + slight delay
      const maxOrder = Math.max(pair.i, pair.j) / surfaceCount
      orders[idx * 2] = maxOrder
      orders[idx * 2 + 1] = maxOrder
      lineT[idx * 2] = 0
      lineT[idx * 2 + 1] = 1
      const jitter = Math.random()
      pulseOffset[idx * 2] = jitter
      pulseOffset[idx * 2 + 1] = jitter
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))
    geo.setAttribute('aLineT', new THREE.BufferAttribute(lineT, 1))
    geo.setAttribute('aPulseOffset', new THREE.BufferAttribute(pulseOffset, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uScroll: { value: 0 },
        uPulseTime: { value: 0 },
        uMilestone: { value: 0 },
        uSweepPos: { value: -1 },
        uSweepStrength: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: /* glsl */ `
        attribute float aOrder;
        attribute float aLineT;
        attribute float aPulseOffset;
        uniform float uScroll;
        uniform float uPulseTime;
        uniform float uMilestone;
        uniform float uSweepPos;
        uniform float uSweepStrength;
        uniform vec2 uMouse;
        varying float vAlpha;
        varying float vPulse;
        varying float vSweep;
        varying float vHover;
        void main() {
          vec3 pos = position;
          vec4 projected = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          vec2 screen = projected.xy / projected.w;
          float mouseDist = length(screen - uMouse);
          float mouseAttract = exp(-pow(mouseDist * 8.0, 2.0)) * 0.016;
          pos += normalize(pos) * mouseAttract;
          vHover = mouseAttract;
          float appear = smoothstep(aOrder * 0.5 + 0.03, aOrder * 0.5 + 0.08, uScroll);
          float pulseHead = fract(uPulseTime * 0.28 + aPulseOffset);
          float pulse = exp(-pow((aLineT - pulseHead) * 10.0, 2.0));
          float sweepCoord = normalize(pos).x * 0.5 + 0.5;
          float sweep = exp(-pow((sweepCoord - uSweepPos) * 11.0, 2.0)) * uSweepStrength;
          vPulse = pulse;
          vSweep = sweep;
          vAlpha = appear * (1.0 + pulse * 2.1 + uMilestone * 1.35 + sweep * 1.3);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        varying float vPulse;
        varying float vSweep;
        varying float vHover;
        void main() {
          vec3 base = vec3(0.92, 0.96, 1.0);
          vec3 accent = vec3(0.62, 0.84, 1.0);
          vec3 color = mix(base, accent, clamp(max(vPulse, vSweep) * 1.35, 0.0, 1.0));
          color = mix(color, vec3(0.76, 0.9, 1.0), clamp(vHover * 26.0, 0.0, 0.28));
          gl_FragColor = vec4(color, clamp(vAlpha * 0.13, 0.0, 0.34));
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    return { linesGeo: geo, linesMat: mat }
  }, [surfacePoints, surfaceCount, maxConnections])

  // ── Orbital nodes ──────────────────────────────────────────
  const orbitalMeta = useMemo(() => {
    const points = fibonacciSphere(orbitalCount, ORBITAL_RADIUS)
    const clusters = new Float32Array(orbitalCount * 3)
    const phases = new Float32Array(orbitalCount)
    const clusterAnchors = [
      new THREE.Vector3(0.95, 0.22, 0.3).normalize(),
      new THREE.Vector3(-0.75, 0.6, -0.2).normalize(),
      new THREE.Vector3(0.15, -0.55, 0.82).normalize(),
    ]

    for (let i = 0; i < orbitalCount; i++) {
      const anchor = clusterAnchors[i % clusterAnchors.length]
      clusters[i * 3] = anchor.x
      clusters[i * 3 + 1] = anchor.y
      clusters[i * 3 + 2] = anchor.z
      phases[i] = Math.random() * Math.PI * 2
    }

    return { points, clusters, phases }
  }, [orbitalCount])

  const orbitalPoints = orbitalMeta.points

  const { orbitalGeo, orbitalMat } = useMemo(() => {
    const positions = new Float32Array(orbitalCount * 3)
    const orders = new Float32Array(orbitalCount)
    orbitalPoints.forEach((p, i) => {
      positions[i * 3] = p[0]
      positions[i * 3 + 1] = p[1]
      positions[i * 3 + 2] = p[2]
      orders[i] = i / orbitalCount
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))
    geo.setAttribute('aCluster', new THREE.BufferAttribute(orbitalMeta.clusters, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(orbitalMeta.phases, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uScroll: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uMilestone: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aOrder;
        attribute vec3 aCluster;
        attribute float aPhase;
        uniform float uScroll;
        uniform float uPixelRatio;
        uniform float uMilestone;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          float range = clamp((uScroll - 0.42) * 2.6, 0.0, 1.0);
          float constellationWave = 0.5 + 0.5 * sin(uTime * 0.55 + aPhase);
          float constellationMix = range * (0.12 + 0.25 * constellationWave);
          float radius = length(pos);
          vec3 orbitDir = normalize(mix(normalize(pos), normalize(aCluster), constellationMix));
          vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), orbitDir));
          if (length(tangent) < 0.001) tangent = normalize(cross(vec3(1.0, 0.0, 0.0), orbitDir));
          pos = orbitDir * radius + tangent * sin(uTime * 0.8 + aPhase) * 0.04 * range;
          pos = normalize(pos) * radius;
          float appear = smoothstep(aOrder * 0.85 + 0.06, aOrder * 0.85 + 0.14, range);
          vAlpha = appear + uMilestone * 0.2 + constellationMix * 0.24;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = 2.5 * uPixelRatio;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          if (length(c) > 0.5) discard;
          gl_FragColor = vec4(0.78, 0.88, 1.0, clamp(vAlpha * 0.72, 0.0, 0.92));
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    return { orbitalGeo: geo, orbitalMat: mat }
  }, [orbitalPoints, orbitalMeta, pixelRatio, orbitalCount])

  // ── Orbital inter-satellite links ──────────────────────────
  const { orbLinesGeo, orbLinesMat } = useMemo(() => {
    const pairs = []
    for (let i = 0; i < orbitalPoints.length; i++) {
      for (let j = i + 1; j < orbitalPoints.length; j++) {
        const dx = orbitalPoints[i][0] - orbitalPoints[j][0]
        const dy = orbitalPoints[i][1] - orbitalPoints[j][1]
        const dz = orbitalPoints[i][2] - orbitalPoints[j][2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < ORBITAL_RADIUS * 1.05) {
          pairs.push({ i, j, dist })
        }
      }
    }
    pairs.sort((a, b) => a.dist - b.dist)
    const limited = pairs.slice(0, orbitalLinkCount)

    const positions = new Float32Array(limited.length * 6)
    const orders = new Float32Array(limited.length * 2)
    const clusters = new Float32Array(limited.length * 6)
    const phases = new Float32Array(limited.length * 2)
    const blinkSeed = new Float32Array(limited.length * 2)

    limited.forEach((pair, idx) => {
      const p1 = orbitalPoints[pair.i]
      const p2 = orbitalPoints[pair.j]
      positions[idx * 6] = p1[0]
      positions[idx * 6 + 1] = p1[1]
      positions[idx * 6 + 2] = p1[2]
      positions[idx * 6 + 3] = p2[0]
      positions[idx * 6 + 4] = p2[1]
      positions[idx * 6 + 5] = p2[2]
      const maxOrder = Math.max(pair.i, pair.j) / orbitalCount
      orders[idx * 2] = maxOrder
      orders[idx * 2 + 1] = maxOrder
      clusters[idx * 6] = orbitalMeta.clusters[pair.i * 3]
      clusters[idx * 6 + 1] = orbitalMeta.clusters[pair.i * 3 + 1]
      clusters[idx * 6 + 2] = orbitalMeta.clusters[pair.i * 3 + 2]
      clusters[idx * 6 + 3] = orbitalMeta.clusters[pair.j * 3]
      clusters[idx * 6 + 4] = orbitalMeta.clusters[pair.j * 3 + 1]
      clusters[idx * 6 + 5] = orbitalMeta.clusters[pair.j * 3 + 2]
      phases[idx * 2] = orbitalMeta.phases[pair.i]
      phases[idx * 2 + 1] = orbitalMeta.phases[pair.j]
      const seed = Math.random() * Math.PI * 2 + idx * 0.11
      blinkSeed[idx * 2] = seed
      blinkSeed[idx * 2 + 1] = seed
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))
    geo.setAttribute('aCluster', new THREE.BufferAttribute(clusters, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aBlinkSeed', new THREE.BufferAttribute(blinkSeed, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uScroll: { value: 0 },
        uMilestone: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aOrder;
        attribute vec3 aCluster;
        attribute float aPhase;
        attribute float aBlinkSeed;
        uniform float uScroll;
        uniform float uMilestone;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          float range = clamp((uScroll - 0.42) * 2.6, 0.0, 1.0);
          float constellationWave = 0.5 + 0.5 * sin(uTime * 0.55 + aPhase);
          float constellationMix = range * (0.12 + 0.25 * constellationWave);
          float radius = length(pos);
          vec3 orbitDir = normalize(mix(normalize(pos), normalize(aCluster), constellationMix));
          vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), orbitDir));
          if (length(tangent) < 0.001) tangent = normalize(cross(vec3(1.0, 0.0, 0.0), orbitDir));
          pos = orbitDir * radius + tangent * sin(uTime * 0.8 + aPhase) * 0.04 * range;
          pos = normalize(pos) * radius;
          float appear = smoothstep(aOrder * 0.65 + 0.03, aOrder * 0.65 + 0.11, range);
          float blink = smoothstep(0.6, 0.98, 0.5 + 0.5 * sin(uTime * 4.6 + aBlinkSeed));
          float twinkle = 0.72 + 0.28 * sin(uTime * 2.1 + aBlinkSeed * 1.4);
          vAlpha = (appear + uMilestone * 0.25) * blink * twinkle;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(0.72, 0.86, 1.0, clamp(vAlpha * 0.15, 0.0, 0.35));
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    return { orbLinesGeo: geo, orbLinesMat: mat }
  }, [orbitalPoints, orbitalCount, orbitalLinkCount, orbitalMeta])

  // ── Minimal base rings ─────────────────────────────────────
  const equatorGeo = useMemo(() => createRingGeometry(GLOBE_RADIUS, ringSegments, 'xz'), [ringSegments])
  const meridianGeo = useMemo(() => createRingGeometry(GLOBE_RADIUS, ringSegments, 'yz'), [ringSegments])
  const ringMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    [],
  )

  useEffect(() => {
    if (reducedMotion || !ctaSweepSignal) return
    sweepProgressRef.current = -0.2
  }, [ctaSweepSignal, reducedMotion])

  // ── Animation loop ─────────────────────────────────────────
  useFrame((state, delta) => {
    const mx = mouse?.current?.x || 0
    const my = mouse?.current?.y || 0

    if (reducedMotion) {
      const staticProgress = 0.22
      const staticScale = isMobile ? 0.9 : 1
      scrollProgress.current = staticProgress
      scrollTarget.current = staticProgress
      if (groupRef.current) {
        groupRef.current.scale.setScalar(staticScale)
      }
      surfaceMat.uniforms.uScroll.value = staticProgress
      surfaceMat.uniforms.uTime.value = state.clock.elapsedTime
      surfaceMat.uniforms.uMilestone.value = 0
      surfaceMat.uniforms.uSweepPos.value = -1
      surfaceMat.uniforms.uSweepStrength.value = 0
      surfaceMat.uniforms.uMouse.value.set(0, 0)
      linesMat.uniforms.uScroll.value = staticProgress
      linesMat.uniforms.uPulseTime.value = 0
      linesMat.uniforms.uMilestone.value = 0
      linesMat.uniforms.uSweepPos.value = -1
      linesMat.uniforms.uSweepStrength.value = 0
      linesMat.uniforms.uMouse.value.set(0, 0)
      orbitalMat.uniforms.uScroll.value = staticProgress
      orbitalMat.uniforms.uMilestone.value = 0
      orbitalMat.uniforms.uTime.value = 0
      orbLinesMat.uniforms.uScroll.value = staticProgress
      orbLinesMat.uniforms.uMilestone.value = 0
      orbLinesMat.uniforms.uTime.value = 0
      ringMaterial.opacity = 0
      return
    }

    // Smooth scroll lerp
    if (scrollProgress && scrollTarget) {
      scrollProgress.current = THREE.MathUtils.lerp(
        scrollProgress.current,
        scrollTarget.current,
        0.05,
      )
    }

    // Auto-rotation + smooth scale-down when orbital nodes appear
    if (groupRef.current) {
      groupRef.current.rotation.y += isMobile ? 0.0014 : 0.002

      // Shrink globe smoothly from 60→80% scroll so orbital nodes clear header/footer
      const s = scrollProgress?.current || 0
      const baseScale = isMobile ? 0.9 : 1.0
      const endScale = isMobile ? 0.72 : 0.78
      const scaleT = THREE.MathUtils.clamp((s - 0.6) / 0.2, 0, 1)
      const targetScale = THREE.MathUtils.lerp(baseScale, endScale, scaleT)
      groupRef.current.scale.setScalar(targetScale)
    }

    // Update all shader uniforms
    const s = scrollProgress?.current || 0
    const prev = prevScrollRef.current
    for (const milestone of MILESTONES) {
      if ((prev < milestone && s >= milestone) || (prev > milestone && s <= milestone)) {
        milestoneGlowRef.current = 1
      }
    }
    prevScrollRef.current = s
    milestoneGlowRef.current = Math.max(0, milestoneGlowRef.current - delta * 1.5)

    const sweepActive = sweepProgressRef.current >= -0.2
    if (sweepActive) {
      sweepProgressRef.current += delta * 0.8
      if (sweepProgressRef.current > 1.2) sweepProgressRef.current = -1
    }
    const sweepPhase = sweepProgressRef.current
    const sweepStrength =
      sweepPhase >= -0.2
        ? Math.sin(THREE.MathUtils.clamp((sweepPhase + 0.2) / 1.4, 0, 1) * Math.PI)
        : 0

    surfaceMat.uniforms.uTime.value = state.clock.elapsedTime
    surfaceMat.uniforms.uScroll.value = s
    surfaceMat.uniforms.uMilestone.value = milestoneGlowRef.current
    surfaceMat.uniforms.uSweepPos.value = sweepPhase
    surfaceMat.uniforms.uSweepStrength.value = sweepStrength
    surfaceMat.uniforms.uMouse.value.set(mx, my)
    linesMat.uniforms.uScroll.value = s
    linesMat.uniforms.uPulseTime.value = state.clock.elapsedTime
    linesMat.uniforms.uMilestone.value = milestoneGlowRef.current
    linesMat.uniforms.uSweepPos.value = sweepPhase
    linesMat.uniforms.uSweepStrength.value = sweepStrength
    linesMat.uniforms.uMouse.value.set(mx, my)
    orbitalMat.uniforms.uScroll.value = s
    orbitalMat.uniforms.uMilestone.value = milestoneGlowRef.current
    orbitalMat.uniforms.uTime.value = state.clock.elapsedTime
    orbLinesMat.uniforms.uScroll.value = s
    orbLinesMat.uniforms.uMilestone.value = milestoneGlowRef.current
    orbLinesMat.uniforms.uTime.value = state.clock.elapsedTime

    // Delay base ring reveal until after nodes are already visible
    const ringReveal = THREE.MathUtils.smoothstep(s, 0.18, 0.36)
    ringMaterial.opacity = 0.028 * ringReveal

  })

  return (
    <>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />

      <group ref={groupRef}>
        {/* Minimal base — equator + meridian rings */}
        <lineLoop geometry={equatorGeo} material={ringMaterial} />
        <lineLoop geometry={meridianGeo} material={ringMaterial} />

        {/* Surface dots — appear one by one 0→50% scroll */}
        <points geometry={surfaceGeo} material={surfaceMat} />

        {/* Surface connection lines — appear after dots */}
        <lineSegments geometry={linesGeo} material={linesMat} />

        {/* Orbital dots — appear 50→100% scroll */}
        <points geometry={orbitalGeo} material={orbitalMat} />

        {/* Orbital connection lines — satellite network */}
        <lineSegments geometry={orbLinesGeo} material={orbLinesMat} />
      </group>
    </>
  )
}
