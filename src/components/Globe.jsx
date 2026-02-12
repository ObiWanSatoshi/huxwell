import { useRef, useMemo } from 'react'
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
    else pts.push(0, Math.cos(a) * radius, Math.sin(a) * radius)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return geo
}

const GLOBE_RADIUS = 1.6
const ORBITAL_RADIUS = GLOBE_RADIUS * 1.3
const SURFACE_COUNT = 200
const ORBITAL_COUNT = 40
const MAX_CONNECTIONS = 300

export default function Globe({ scrollTarget, scrollProgress }) {
  const groupRef = useRef()
  const { gl } = useThree()
  const pixelRatio = gl.getPixelRatio()

  // ── Surface nodes ──────────────────────────────────────────
  const surfacePoints = useMemo(() => fibonacciSphere(SURFACE_COUNT, GLOBE_RADIUS), [])

  const surfaceGeo = useMemo(() => {
    const positions = new Float32Array(SURFACE_COUNT * 3)
    const orders = new Float32Array(SURFACE_COUNT)
    surfacePoints.forEach((p, i) => {
      positions[i * 3] = p[0]
      positions[i * 3 + 1] = p[1]
      positions[i * 3 + 2] = p[2]
      orders[i] = i / SURFACE_COUNT
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))
    return geo
  }, [surfacePoints])

  const surfaceMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uScroll: { value: 0 },
          uPixelRatio: { value: pixelRatio },
        },
        vertexShader: /* glsl */ `
      attribute float aOrder;
      uniform float uScroll;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        float appear = smoothstep(aOrder * 0.5 - 0.02, aOrder * 0.5 + 0.02, uScroll);
        vAlpha = appear;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = 2.0 * uPixelRatio;
      }
    `,
        fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        if (length(c) > 0.5) discard;
        gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * 0.85);
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
    const limited = pairs.slice(0, MAX_CONNECTIONS)

    const positions = new Float32Array(limited.length * 6)
    const orders = new Float32Array(limited.length * 2)

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
      const maxOrder = Math.max(pair.i, pair.j) / SURFACE_COUNT
      orders[idx * 2] = maxOrder
      orders[idx * 2 + 1] = maxOrder
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: { uScroll: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aOrder;
        uniform float uScroll;
        varying float vAlpha;
        void main() {
          float appear = smoothstep(aOrder * 0.5 + 0.03, aOrder * 0.5 + 0.08, uScroll);
          vAlpha = appear;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * 0.12);
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    return { linesGeo: geo, linesMat: mat }
  }, [surfacePoints])

  // ── Orbital nodes ──────────────────────────────────────────
  const orbitalPoints = useMemo(() => fibonacciSphere(ORBITAL_COUNT, ORBITAL_RADIUS), [])

  const { orbitalGeo, orbitalMat } = useMemo(() => {
    const positions = new Float32Array(ORBITAL_COUNT * 3)
    const orders = new Float32Array(ORBITAL_COUNT)
    orbitalPoints.forEach((p, i) => {
      positions[i * 3] = p[0]
      positions[i * 3 + 1] = p[1]
      positions[i * 3 + 2] = p[2]
      orders[i] = i / ORBITAL_COUNT
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uScroll: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: /* glsl */ `
        attribute float aOrder;
        uniform float uScroll;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          float range = clamp((uScroll - 0.5) * 2.0, 0.0, 1.0);
          float appear = smoothstep(aOrder - 0.02, aOrder + 0.02, range);
          vAlpha = appear;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = 2.5 * uPixelRatio;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          if (length(c) > 0.5) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * 0.6);
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    return { orbitalGeo: geo, orbitalMat: mat }
  }, [orbitalPoints, pixelRatio])

  // ── Orbital connection lines (orbital → nearest surface) ──
  const { orbLinesGeo, orbLinesMat } = useMemo(() => {
    const positions = new Float32Array(ORBITAL_COUNT * 6)
    const orders = new Float32Array(ORBITAL_COUNT * 2)

    orbitalPoints.forEach((op, i) => {
      // Find nearest surface node
      let minDist = Infinity
      let nearest = 0
      surfacePoints.forEach((sp, si) => {
        const dx = op[0] - sp[0]
        const dy = op[1] - sp[1]
        const dz = op[2] - sp[2]
        const d = dx * dx + dy * dy + dz * dz
        if (d < minDist) {
          minDist = d
          nearest = si
        }
      })
      const sp = surfacePoints[nearest]
      positions[i * 6] = op[0]
      positions[i * 6 + 1] = op[1]
      positions[i * 6 + 2] = op[2]
      positions[i * 6 + 3] = sp[0]
      positions[i * 6 + 4] = sp[1]
      positions[i * 6 + 5] = sp[2]
      orders[i * 2] = i / ORBITAL_COUNT
      orders[i * 2 + 1] = i / ORBITAL_COUNT
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrder', new THREE.BufferAttribute(orders, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: { uScroll: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aOrder;
        uniform float uScroll;
        varying float vAlpha;
        void main() {
          float range = clamp((uScroll - 0.5) * 2.0, 0.0, 1.0);
          float appear = smoothstep(aOrder + 0.03, aOrder + 0.08, range);
          vAlpha = appear;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * 0.08);
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    return { orbLinesGeo: geo, orbLinesMat: mat }
  }, [orbitalPoints, surfacePoints])

  // ── Minimal base rings ─────────────────────────────────────
  const equatorGeo = useMemo(() => createRingGeometry(GLOBE_RADIUS, 128, 'xz'), [])
  const meridianGeo = useMemo(() => createRingGeometry(GLOBE_RADIUS, 128, 'yz'), [])
  const ringMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 }),
    [],
  )

  // ── Animation loop ─────────────────────────────────────────
  useFrame(() => {
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
      groupRef.current.rotation.y += 0.002

      // Shrink globe smoothly from 60→80% scroll so orbital nodes clear header/footer
      const s = scrollProgress?.current || 0
      const targetScale =
        s < 0.6 ? 1.0 : s > 0.8 ? 0.78 : 1.0 - ((s - 0.6) / 0.2) * 0.22
      groupRef.current.scale.setScalar(targetScale)
    }

    // Update all shader uniforms
    const s = scrollProgress?.current || 0
    surfaceMat.uniforms.uScroll.value = s
    linesMat.uniforms.uScroll.value = s
    orbitalMat.uniforms.uScroll.value = s
    orbLinesMat.uniforms.uScroll.value = s
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

        {/* Orbital connection lines — orbital→surface */}
        <lineSegments geometry={orbLinesGeo} material={orbLinesMat} />
      </group>
    </>
  )
}
