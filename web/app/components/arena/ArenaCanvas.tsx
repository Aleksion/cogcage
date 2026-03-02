import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

/* ── Constants ────────────────────────────────────────────────── */

const UNIT_SCALE = 10
const ARENA_UNITS = 20

function gameToWorld(pos: { x: number; y: number }): [number, number, number] {
  const wx = (pos.x / UNIT_SCALE - ARENA_UNITS / 2) * 2
  const wz = (pos.y / UNIT_SCALE - ARENA_UNITS / 2) * 2
  return [wx, 0, wz]
}

/* ── Bot Configs ─────────────────────────────────────────────── */

const BERSERKER_MECHA = {
  shellColor: '#CC2200',
  primaryColor: '#EB4D4B',
  eyeColor: '#FF6B00',
}

const TACTICIAN_MECHA = {
  shellColor: '#004466',
  primaryColor: '#00E5FF',
  eyeColor: '#00FFCC',
}

/* ── Lobster Mecha Builder ───────────────────────────────────── */

interface MechaOptions {
  primaryColor: string
  shellColor: string
  eyeColor: string
}

interface MechaRefs {
  rightClaw: THREE.Group
  leftClaw: THREE.Group
  antennaeRight: THREE.Mesh
  antennaeLeft: THREE.Mesh
  eyeRight: THREE.Mesh
  eyeLeft: THREE.Mesh
  tailFan: THREE.Group
  legs: THREE.Group[]
}

function buildLobsterMecha(options: MechaOptions): THREE.Group {
  const { shellColor, eyeColor } = options
  const group = new THREE.Group()

  // ── Materials ──────────────────────────────────────────
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: shellColor,
    metalness: 0.9,
    roughness: 0.08,
    emissive: shellColor,
    emissiveIntensity: 0.15,
    envMapIntensity: 1.5,
  })

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#1a0a05',
    metalness: 0.2,
    roughness: 0.8,
    emissive: shellColor,
    emissiveIntensity: 0.05,
  })

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 6,
    roughness: 0,
    metalness: 0,
  })

  const fanMaterial = new THREE.MeshStandardMaterial({
    color: shellColor,
    metalness: 0.7,
    roughness: 0.3,
    emissive: eyeColor,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.85,
  })

  const antennaMaterial = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 0.4,
    metalness: 0.3,
    roughness: 0.5,
  })

  // ── CARAPACE (main body) ───────────────────────────────
  const carapace = new THREE.Group()
  carapace.name = 'carapace'

  const seg1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.0), shellMaterial)
  seg1.position.set(0.3, 0.8, 0)
  seg1.scale.y = 0.85
  seg1.castShadow = true
  carapace.add(seg1)

  const seg2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 1.1), shellMaterial)
  seg2.position.set(-0.1, 0.9, 0)
  seg2.scale.y = 0.85
  seg2.castShadow = true
  carapace.add(seg2)

  const seg3 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.9), shellMaterial)
  seg3.position.set(-0.5, 0.8, 0)
  seg3.scale.y = 0.85
  seg3.castShadow = true
  carapace.add(seg3)

  group.add(carapace)

  // ── ROSTRUM (forward spike) ────────────────────────────
  const rostrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.18, 0.9, 6),
    shellMaterial,
  )
  rostrum.rotation.z = -Math.PI / 2
  rostrum.position.set(1.2, 1.1, 0)
  rostrum.castShadow = true
  group.add(rostrum)

  // ── ABDOMEN/TAIL — 5 segments ──────────────────────────
  const tailSegments = [
    { size: [0.9, 0.45, 0.85], pos: [-0.8, 0.7, 0], rot: 0 },
    { size: [0.8, 0.4, 0.8], pos: [-1.3, 0.6, 0], rot: 0.1 },
    { size: [0.7, 0.35, 0.75], pos: [-1.75, 0.5, 0], rot: 0.2 },
    { size: [0.6, 0.3, 0.7], pos: [-2.15, 0.4, 0], rot: 0.3 },
    { size: [0.5, 0.28, 0.65], pos: [-2.5, 0.3, 0], rot: 0.4 },
  ] as const

  for (const seg of tailSegments) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(seg.size[0], seg.size[1], seg.size[2]),
      shellMaterial,
    )
    mesh.position.set(seg.pos[0], seg.pos[1], seg.pos[2])
    mesh.rotation.z = seg.rot
    mesh.castShadow = true
    group.add(mesh)
  }

  // ── TAIL FAN (uropods) ─────────────────────────────────
  const tailFanGroup = new THREE.Group()
  tailFanGroup.name = 'tailFan'
  tailFanGroup.position.set(-3.2, 0.25, 0)

  const fanAngles = [0, 0.6, -0.6, 1.1, -1.1]
  for (const angle of fanAngles) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.55), fanMaterial)
    blade.rotation.z = angle
    blade.castShadow = true
    tailFanGroup.add(blade)
  }
  tailFanGroup.scale.setScalar(1.4)
  group.add(tailFanGroup)

  // ── CHELIPEDS (BIG CLAWS) ─────────────────────────────
  function buildClaw(): THREE.Group {
    const claw = new THREE.Group()
    claw.name = 'claw'

    // Upper arm (merus)
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 1.0, 8),
      shellMaterial,
    )
    upperArm.rotation.z = Math.PI / 4
    upperArm.position.set(0.3, 0, 0)
    upperArm.castShadow = true
    claw.add(upperArm)

    // Lower arm (carpus)
    const lowerArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.7, 8),
      shellMaterial,
    )
    lowerArm.rotation.z = Math.PI / 6
    lowerArm.position.set(0.7, 0.3, 0)
    lowerArm.castShadow = true
    claw.add(lowerArm)

    // Claw body (propodus)
    const propodus = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.7, 0.25),
      shellMaterial,
    )
    propodus.position.set(1.1, 0.5, 0)
    propodus.castShadow = true
    claw.add(propodus)

    // Fixed dactylus (upper pincer)
    const dactylus = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.1, 0.2),
      shellMaterial,
    )
    dactylus.rotation.z = 0.3
    dactylus.position.set(1.4, 0.85, 0)
    dactylus.castShadow = true
    claw.add(dactylus)

    // Pollex (lower pincer)
    const pollex = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.1, 0.2),
      shellMaterial,
    )
    pollex.rotation.z = -0.2
    pollex.position.set(1.4, 0.2, 0)
    pollex.castShadow = true
    claw.add(pollex)

    claw.scale.setScalar(1.3)
    return claw
  }

  const rightClaw = buildClaw()
  rightClaw.name = 'rightClaw'
  rightClaw.position.set(0.6, 0.9, 0.8)
  group.add(rightClaw)

  const leftClaw = buildClaw()
  leftClaw.name = 'leftClaw'
  leftClaw.position.set(0.6, 0.9, -0.8)
  leftClaw.scale.z = -1.3
  leftClaw.scale.x = 1.3
  leftClaw.scale.y = 1.3
  group.add(leftClaw)

  // ── WALKING LEGS (pereiopods) ──────────────────────────
  const legPositions = [
    { x: 0.2, z: 0.6, angle: 0.4 },
    { x: -0.2, z: 0.65, angle: 0.2 },
    { x: -0.6, z: 0.6, angle: 0 },
  ]

  const legGroups: THREE.Group[] = []

  for (const side of [1, -1]) {
    for (const lp of legPositions) {
      const legGroup = new THREE.Group()
      legGroup.name = 'leg'

      const femur = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.7, 6),
        bodyMaterial,
      )
      femur.rotation.z = (Math.PI / 3) * side
      femur.rotation.y = lp.angle * side
      femur.position.set(0, 0, 0)
      femur.castShadow = true
      legGroup.add(femur)

      const tibia = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 0.6, 6),
        bodyMaterial,
      )
      tibia.rotation.z = (Math.PI / 2.5) * side
      tibia.position.set(0, -0.5, 0.3 * side)
      tibia.castShadow = true
      legGroup.add(tibia)

      legGroup.position.set(lp.x, 0.5, lp.z * side)
      group.add(legGroup)
      legGroups.push(legGroup)
    }
  }

  // ── ANTENNAE ───────────────────────────────────────────
  function buildAntenna(zSign: number): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.0, 1.2, 0.3 * zSign),
      new THREE.Vector3(1.8, 2.0, 0.5 * zSign),
      new THREE.Vector3(2.8, 2.5, 0.7 * zSign),
      new THREE.Vector3(3.5, 2.8, 0.6 * zSign),
    ])
    const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.025, 6, false)
    const antenna = new THREE.Mesh(tubeGeo, antennaMaterial)
    antenna.name = zSign > 0 ? 'antennaRight' : 'antennaLeft'
    return antenna
  }

  const antennaRight = buildAntenna(1)
  group.add(antennaRight)
  const antennaLeft = buildAntenna(-1)
  group.add(antennaLeft)

  // ── COMPOUND EYES (stalked) ────────────────────────────
  function buildEye(zPos: number): THREE.Group {
    const eyeGroup = new THREE.Group()
    eyeGroup.name = zPos > 0 ? 'eyeRight' : 'eyeLeft'

    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6),
      bodyMaterial,
    )
    stalk.position.set(0, 0, 0)
    eyeGroup.add(stalk)

    const eyeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      eyeMaterial,
    )
    eyeSphere.position.set(0, 0.18, 0)
    eyeGroup.add(eyeSphere)

    eyeGroup.position.set(0.85, 1.25, zPos)
    eyeGroup.rotation.z = 0.2
    eyeGroup.rotation.x = zPos > 0 ? 0.15 : -0.15
    return eyeGroup
  }

  const eyeRightGroup = buildEye(0.35)
  group.add(eyeRightGroup)
  const eyeLeftGroup = buildEye(-0.35)
  group.add(eyeLeftGroup)

  // ── ANTENNULES (short feelers) ─────────────────────────
  for (const zSign of [1, -1]) {
    const antennule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6),
      bodyMaterial,
    )
    antennule.position.set(1.05, 1.2, 0.15 * zSign)
    antennule.rotation.z = -0.4
    antennule.rotation.x = 0.3 * zSign
    group.add(antennule)
  }

  // Store refs for animation
  group.userData.refs = {
    rightClaw,
    leftClaw,
    antennaeRight: antennaRight,
    antennaeLeft: antennaLeft,
    eyeRight: eyeRightGroup.children[1] as THREE.Mesh,
    eyeLeft: eyeLeftGroup.children[1] as THREE.Mesh,
    tailFan: tailFanGroup,
    legs: legGroups,
  } as MechaRefs

  return group
}

/* ── Particle system ─────────────────────────────────────────── */

interface Particle {
  mesh: THREE.Points
  velocities: Float32Array
  life: number
  maxLife: number
}

function createParticleBurst(
  scene: THREE.Scene,
  position: THREE.Vector3,
  color: string,
  count: number = 30,
): Particle {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x
    positions[i * 3 + 1] = position.y + 1
    positions[i * 3 + 2] = position.z
    velocities[i * 3] = (Math.random() - 0.5) * 10
    velocities[i * 3 + 1] = Math.random() * 8
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 10
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.18,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const points = new THREE.Points(geo, mat)
  scene.add(points)
  return { mesh: points, velocities, life: 0, maxLife: 0.6 }
}

/* ── Projectile ──────────────────────────────────────────────── */

interface Projectile {
  mesh: THREE.Mesh
  from: THREE.Vector3
  to: THREE.Vector3
  life: number
  maxLife: number
}

function createProjectile(
  scene: THREE.Scene,
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: string,
): Projectile {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 5,
    transparent: true,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15), mat)
  mesh.position.copy(from)
  mesh.position.y = 1.5
  scene.add(mesh)
  return { mesh, from: from.clone(), to: to.clone(), life: 0, maxLife: 0.25 }
}

/* ── Arena handle ────────────────────────────────────────────── */

export interface ArenaHandle {
  updatePositions: (
    posA: { x: number; y: number } | null,
    posB: { x: number; y: number } | null,
  ) => void
  triggerAttack: (attacker: 'botA' | 'botB', type: 'melee' | 'ranged') => void
  triggerHit: (target: 'botA' | 'botB', damage: number) => void
  triggerDeath: (target: 'botA' | 'botB') => void
  triggerGuard: (target: 'botA' | 'botB') => void
  shakeCamera: () => void
}

/* ── Component ───────────────────────────────────────────────── */

const ArenaCanvas = forwardRef<ArenaHandle, object>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const internals = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    crawlerA: THREE.Group
    crawlerB: THREE.Group
    targetA: THREE.Vector3
    targetB: THREE.Vector3
    particles: Particle[]
    projectiles: Projectile[]
    clock: THREE.Clock
    animId: number
    hitFlashA: number
    hitFlashB: number
    hitRecoilA: number
    hitRecoilB: number
    attackLungeA: number
    attackLungeB: number
    deathA: boolean
    deathB: boolean
    deathProgressA: number
    deathProgressB: number
    guardPulseA: number
    guardPulseB: number
    dashA: number
    dashB: number
    shakeAmount: number
    cameraBase: THREE.Vector3
  } | null>(null)

  useImperativeHandle(ref, () => ({
    updatePositions(posA, posB) {
      const s = internals.current
      if (!s) return
      if (posA) {
        const [wx, , wz] = gameToWorld(posA)
        s.targetA.set(wx, 0, wz)
        const dir = new THREE.Vector3().subVectors(s.targetB, s.targetA)
        if (dir.length() > 0.1) {
          s.crawlerA.lookAt(s.targetB.x, 0, s.targetB.z)
        }
      }
      if (posB) {
        const [wx, , wz] = gameToWorld(posB)
        s.targetB.set(wx, 0, wz)
        const dir = new THREE.Vector3().subVectors(s.targetA, s.targetB)
        if (dir.length() > 0.1) {
          s.crawlerB.lookAt(s.targetA.x, 0, s.targetA.z)
        }
      }
    },
    triggerAttack(attacker, type) {
      const s = internals.current
      if (!s) return
      if (attacker === 'botA') s.attackLungeA = 0.3
      else s.attackLungeB = 0.3

      if (type === 'ranged') {
        const from = attacker === 'botA' ? s.crawlerA.position : s.crawlerB.position
        const to = attacker === 'botA' ? s.crawlerB.position : s.crawlerA.position
        const color = attacker === 'botA' ? BERSERKER_MECHA.primaryColor : TACTICIAN_MECHA.primaryColor
        s.projectiles.push(createProjectile(s.scene, from, to, color))
      }
    },
    triggerHit(target, _damage) {
      const s = internals.current
      if (!s) return
      if (target === 'botA') {
        s.hitFlashA = 0.3
        s.hitRecoilA = 0.3
      } else {
        s.hitFlashB = 0.3
        s.hitRecoilB = 0.3
      }
      const pos = target === 'botA' ? s.crawlerA.position : s.crawlerB.position
      const color = target === 'botA' ? BERSERKER_MECHA.primaryColor : TACTICIAN_MECHA.primaryColor
      s.particles.push(createParticleBurst(s.scene, pos, color))
    },
    triggerDeath(target) {
      const s = internals.current
      if (!s) return
      if (target === 'botA') s.deathA = true
      else s.deathB = true
      // Final burst
      const pos = target === 'botA' ? s.crawlerA.position : s.crawlerB.position
      const color = target === 'botA' ? BERSERKER_MECHA.primaryColor : TACTICIAN_MECHA.primaryColor
      s.particles.push(createParticleBurst(s.scene, pos, color, 50))
    },
    triggerGuard(target) {
      const s = internals.current
      if (!s) return
      if (target === 'botA') s.guardPulseA = 1.0
      else s.guardPulseB = 1.0
    },
    shakeCamera() {
      const s = internals.current
      if (!s) return
      s.shakeAmount = 0.5
    },
  }))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ── Scene ────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#010810')
    scene.fog = new THREE.FogExp2('#010810', 0.018)

    // ── Camera ───────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      200,
    )
    camera.position.set(0, 12, 38)
    camera.lookAt(0, 1, 0)

    // ── Renderer ─────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.8
    container.appendChild(renderer.domElement)

    // ── Controls ─────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minPolarAngle = Math.PI / 6
    controls.maxPolarAngle = Math.PI / 2.4
    controls.minDistance = 10
    controls.maxDistance = 40
    controls.target.set(0, 1, 0)

    // ── Arena Floor ──────────────────────────────────────
    // Dark wet stone ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: '#080c12',
        roughness: 0.4,
        metalness: 0.6,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    // Bioluminescent grid lines
    const gridHelper = new THREE.GridHelper(60, 30, '#00E5FF', '#00E5FF')
    const gridMats = gridHelper.material
    if (Array.isArray(gridMats)) {
      gridMats.forEach((m) => {
        m.opacity = 0.12
        m.transparent = true
      })
    } else {
      ;(gridMats as THREE.Material).opacity = 0.12
      ;(gridMats as THREE.Material).transparent = true
    }
    scene.add(gridHelper)

    // Subtle emissive glow floor
    const glowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#00E5FF',
        emissiveIntensity: 0.05,
        transparent: true,
        opacity: 0.4,
      }),
    )
    glowFloor.rotation.x = -Math.PI / 2
    glowFloor.position.y = -0.005
    scene.add(glowFloor)

    // Pit boundary ring
    const ringGeo = new THREE.RingGeometry(18, 18.5, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#00E5FF',
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.02
    scene.add(ring)

    // ── Lights ───────────────────────────────────────────
    RectAreaLightUniformsLib.init()

    const ambient = new THREE.AmbientLight('#0a1520', 0.4)
    scene.add(ambient)

    const overhead = new THREE.DirectionalLight('#d0e8ff', 0.8)
    overhead.position.set(0, 20, 5)
    overhead.castShadow = true
    overhead.shadow.mapSize.set(1024, 1024)
    scene.add(overhead)

    // BERSERKER side light: deep red
    const redLight = new THREE.PointLight('#FF2200', 4, 25)
    redLight.position.set(-14, 4, 0)
    scene.add(redLight)

    // TACTICIAN side light: electric cyan
    const cyanLight = new THREE.PointLight('#00CCFF', 4, 25)
    cyanLight.position.set(14, 4, 0)
    scene.add(cyanLight)

    // Center spotlight
    const spotlight = new THREE.SpotLight('#ffffff', 3, 40, Math.PI / 8, 0.5)
    spotlight.position.set(0, 20, 0)
    spotlight.target.position.set(0, 0, 0)
    spotlight.castShadow = true
    scene.add(spotlight)
    scene.add(spotlight.target)

    // Rim lights on arena edges
    const rimLight1 = new THREE.SpotLight('#EB4D4B', 2, 40, Math.PI / 6)
    rimLight1.position.set(-20, 12, 0)
    rimLight1.target.position.set(0, 0, 0)
    scene.add(rimLight1)
    scene.add(rimLight1.target)

    const rimLight2 = new THREE.SpotLight('#00E5FF', 2, 40, Math.PI / 6)
    rimLight2.position.set(20, 12, 0)
    rimLight2.target.position.set(0, 0, 0)
    scene.add(rimLight2)
    scene.add(rimLight2.target)

    // ── Arena Boundary Posts ─────────────────────────────
    const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 5)
    const postMat = new THREE.MeshStandardMaterial({
      color: '#1a1a2e',
      metalness: 0.9,
      roughness: 0.2,
    })
    const corners = [
      [-20, -20],
      [-20, 20],
      [20, -20],
      [20, 20],
    ]
    for (const [cx, cz] of corners) {
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(cx, 2.5, cz)
      scene.add(post)
      const glowMat = new THREE.MeshStandardMaterial({
        color: '#00E5FF',
        emissive: '#00E5FF',
        emissiveIntensity: 3,
      })
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2), glowMat)
      glow.position.set(cx, 5, cz)
      scene.add(glow)
    }

    // ── Lobster Mechas ───────────────────────────────────
    const crawlerA = buildLobsterMecha(BERSERKER_MECHA)
    crawlerA.scale.set(1.8, 1.8, 1.8)
    crawlerA.position.set(-14, 0, 0)
    scene.add(crawlerA)

    const crawlerB = buildLobsterMecha(TACTICIAN_MECHA)
    crawlerB.scale.set(-1.8, 1.8, 1.8)
    crawlerB.position.set(14, 0, 0)
    // Negative scale.x flips face normals — fix with DoubleSide
    crawlerB.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.material) {
        const m = mesh.material as THREE.MeshStandardMaterial
        if (m.side !== undefined) m.side = THREE.DoubleSide
      }
    })
    scene.add(crawlerB)

    // ── RectAreaLights above each crawler for 3D shell depth ──
    const rectLightA = new THREE.RectAreaLight('#FF8866', 8, 8, 8)
    rectLightA.position.set(-14, 10, 0)
    rectLightA.rotation.x = -Math.PI / 2
    scene.add(rectLightA)

    const rectLightB = new THREE.RectAreaLight('#66DDFF', 8, 8, 8)
    rectLightB.position.set(14, 10, 0)
    rectLightB.rotation.x = -Math.PI / 2
    scene.add(rectLightB)

    // ── State ────────────────────────────────────────────
    const clock = new THREE.Clock()
    const cameraBase = camera.position.clone()

    const state = {
      scene,
      camera,
      renderer,
      controls,
      crawlerA,
      crawlerB,
      targetA: new THREE.Vector3(-14, 0, 0),
      targetB: new THREE.Vector3(14, 0, 0),
      particles: [] as Particle[],
      projectiles: [] as Projectile[],
      clock,
      animId: 0,
      hitFlashA: 0,
      hitFlashB: 0,
      hitRecoilA: 0,
      hitRecoilB: 0,
      attackLungeA: 0,
      attackLungeB: 0,
      deathA: false,
      deathB: false,
      deathProgressA: 0,
      deathProgressB: 0,
      guardPulseA: 0,
      guardPulseB: 0,
      dashA: 0,
      dashB: 0,
      shakeAmount: 0,
      cameraBase,
    }
    internals.current = state

    // ── Animation Loop ───────────────────────────────────
    function animate() {
      state.animId = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.getElapsedTime()

      // Smooth movement
      state.crawlerA.position.lerp(state.targetA, 0.08)
      state.crawlerB.position.lerp(state.targetB, 0.08)

      // ── IDLE ANIMATIONS ──────────────────────────────
      const refsA = state.crawlerA.userData.refs as MechaRefs
      const refsB = state.crawlerB.userData.refs as MechaRefs

      if (!state.deathA) {
        // Body bob
        state.crawlerA.position.y = Math.sin(t * 2) * 0.06

        // Antennae wave
        if (refsA) {
          refsA.antennaeRight.rotation.z = Math.sin(t * 0.8) * 0.15
          refsA.antennaeLeft.rotation.z = Math.sin(t * 0.8 + 0.5) * 0.15
          refsA.antennaeRight.rotation.y = Math.sin(t * 0.6) * 0.1
          refsA.antennaeLeft.rotation.y = Math.sin(t * 0.6 + 0.3) * 0.1

          // Eye stalk slight rotation
          refsA.eyeRight.parent!.rotation.y = Math.sin(t * 0.5) * 0.1
          refsA.eyeLeft.parent!.rotation.y = Math.sin(t * 0.5 + 1) * 0.1

          // Eye pulse
          const eyeIntensity = 5 + Math.sin(t * 3) * 1.5
          ;(refsA.eyeRight.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeIntensity
          ;(refsA.eyeLeft.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeIntensity

          // Walking leg oscillation (pairs alternate)
          refsA.legs.forEach((leg, i) => {
            const phase = i % 2 === 0 ? 0 : Math.PI
            leg.rotation.x = Math.sin(t * 4 + phase) * 0.12
          })

          // Tail fan subtle wave
          refsA.tailFan.rotation.x = Math.sin(t * 1.5) * 0.05
        }
      }

      if (!state.deathB) {
        state.crawlerB.position.y = Math.sin(t * 2 + 1) * 0.06

        if (refsB) {
          refsB.antennaeRight.rotation.z = Math.sin(t * 0.8 + 2) * 0.15
          refsB.antennaeLeft.rotation.z = Math.sin(t * 0.8 + 2.5) * 0.15
          refsB.antennaeRight.rotation.y = Math.sin(t * 0.6 + 2) * 0.1
          refsB.antennaeLeft.rotation.y = Math.sin(t * 0.6 + 2.3) * 0.1

          refsB.eyeRight.parent!.rotation.y = Math.sin(t * 0.5 + 2) * 0.1
          refsB.eyeLeft.parent!.rotation.y = Math.sin(t * 0.5 + 3) * 0.1

          const eyeIntensity = 5 + Math.sin(t * 3 + 1) * 1.5
          ;(refsB.eyeRight.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeIntensity
          ;(refsB.eyeLeft.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeIntensity

          refsB.legs.forEach((leg, i) => {
            const phase = i % 2 === 0 ? 0 : Math.PI
            leg.rotation.x = Math.sin(t * 4 + phase + 2) * 0.12
          })

          refsB.tailFan.rotation.x = Math.sin(t * 1.5 + 1) * 0.05
        }
      }

      // ── ATTACK: Claw lunge ───────────────────────────
      if (state.attackLungeA > 0) {
        state.attackLungeA -= dt
        const progress = Math.sin((1 - state.attackLungeA / 0.3) * Math.PI)
        if (refsA) {
          refsA.rightClaw.position.x = 0.6 + progress * 0.8
        }
        const dir = new THREE.Vector3()
          .subVectors(state.crawlerB.position, state.crawlerA.position)
          .normalize()
        state.crawlerA.position.add(dir.multiplyScalar(progress * dt * 8))
      } else if (refsA) {
        refsA.rightClaw.position.x = 0.6
      }

      if (state.attackLungeB > 0) {
        state.attackLungeB -= dt
        const progress = Math.sin((1 - state.attackLungeB / 0.3) * Math.PI)
        if (refsB) {
          refsB.rightClaw.position.x = 0.6 + progress * 0.8
        }
        const dir = new THREE.Vector3()
          .subVectors(state.crawlerA.position, state.crawlerB.position)
          .normalize()
        state.crawlerB.position.add(dir.multiplyScalar(progress * dt * 8))
      } else if (refsB) {
        refsB.rightClaw.position.x = 0.6
      }

      // ── HIT: Flash + recoil ──────────────────────────
      function handleHitFlash(crawler: THREE.Group, flash: number): number {
        if (flash > 0) {
          flash -= dt
          const intensity = (flash / 0.3) * 4
          crawler.traverse((child) => {
            const mesh = child as THREE.Mesh
            if (mesh.material && 'emissiveIntensity' in (mesh.material as THREE.MeshStandardMaterial)) {
              const m = mesh.material as THREE.MeshStandardMaterial
              if (m !== (refsA?.eyeRight?.material) && m !== (refsA?.eyeLeft?.material) &&
                  m !== (refsB?.eyeRight?.material) && m !== (refsB?.eyeLeft?.material)) {
                m.emissiveIntensity = Math.max(m.emissiveIntensity, intensity)
              }
            }
          })
        } else {
          crawler.traverse((child) => {
            const mesh = child as THREE.Mesh
            if (mesh.material && 'emissiveIntensity' in (mesh.material as THREE.MeshStandardMaterial)) {
              const m = mesh.material as THREE.MeshStandardMaterial
              if (m !== (refsA?.eyeRight?.material) && m !== (refsA?.eyeLeft?.material) &&
                  m !== (refsB?.eyeRight?.material) && m !== (refsB?.eyeLeft?.material)) {
                if (m.emissiveIntensity > 0.5) m.emissiveIntensity = 0.15
              }
            }
          })
        }
        return flash
      }

      state.hitFlashA = handleHitFlash(state.crawlerA, state.hitFlashA)
      state.hitFlashB = handleHitFlash(state.crawlerB, state.hitFlashB)

      // Hit recoil
      if (state.hitRecoilA > 0) {
        state.hitRecoilA -= dt
        const recoilDir = new THREE.Vector3()
          .subVectors(state.crawlerA.position, state.crawlerB.position)
          .normalize()
        state.crawlerA.position.add(recoilDir.multiplyScalar(state.hitRecoilA * dt * 5))
      }
      if (state.hitRecoilB > 0) {
        state.hitRecoilB -= dt
        const recoilDir = new THREE.Vector3()
          .subVectors(state.crawlerB.position, state.crawlerA.position)
          .normalize()
        state.crawlerB.position.add(recoilDir.multiplyScalar(state.hitRecoilB * dt * 5))
      }

      // ── GUARD: Claws cross defensively ───────────────
      if (state.guardPulseA > 0) {
        state.guardPulseA -= dt
        if (refsA) {
          refsA.leftClaw.rotation.y = -Math.PI / 6
          refsA.rightClaw.rotation.y = Math.PI / 6
        }
        state.crawlerA.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (mesh.material && 'emissiveIntensity' in (mesh.material as THREE.MeshStandardMaterial)) {
            ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
              0.2 + Math.sin(t * 8) * 0.8
          }
        })
      } else if (refsA) {
        refsA.leftClaw.rotation.y = 0
        refsA.rightClaw.rotation.y = 0
      }

      if (state.guardPulseB > 0) {
        state.guardPulseB -= dt
        if (refsB) {
          refsB.leftClaw.rotation.y = -Math.PI / 6
          refsB.rightClaw.rotation.y = Math.PI / 6
        }
        state.crawlerB.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (mesh.material && 'emissiveIntensity' in (mesh.material as THREE.MeshStandardMaterial)) {
            ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
              0.2 + Math.sin(t * 8) * 0.8
          }
        })
      } else if (refsB) {
        refsB.leftClaw.rotation.y = 0
        refsB.rightClaw.rotation.y = 0
      }

      // ── DEATH: Flip belly-up + legs curl ─────────────
      if (state.deathA) {
        state.deathProgressA = Math.min(state.deathProgressA + dt * 0.7, 1)
        state.crawlerA.rotation.x = state.deathProgressA * Math.PI
        state.crawlerA.position.y = Math.max(-0.3, -state.deathProgressA * 0.5)
        // Curl legs inward
        if (refsA) {
          refsA.legs.forEach((leg) => {
            leg.rotation.z = THREE.MathUtils.lerp(
              leg.rotation.z,
              Math.PI / 4,
              state.deathProgressA,
            )
          })
        }
      }
      if (state.deathB) {
        state.deathProgressB = Math.min(state.deathProgressB + dt * 0.7, 1)
        state.crawlerB.rotation.x = state.deathProgressB * Math.PI
        state.crawlerB.position.y = Math.max(-0.3, -state.deathProgressB * 0.5)
        if (refsB) {
          refsB.legs.forEach((leg) => {
            leg.rotation.z = THREE.MathUtils.lerp(
              leg.rotation.z,
              Math.PI / 4,
              state.deathProgressB,
            )
          })
        }
      }

      // ── Camera shake ─────────────────────────────────
      if (state.shakeAmount > 0) {
        state.shakeAmount -= dt * 2
        const shake = state.shakeAmount * 0.5
        camera.position.x = state.cameraBase.x + (Math.random() - 0.5) * shake
        camera.position.y = state.cameraBase.y + (Math.random() - 0.5) * shake
      }

      // ── Particles ────────────────────────────────────
      state.particles = state.particles.filter((p) => {
        p.life += dt
        if (p.life >= p.maxLife) {
          scene.remove(p.mesh)
          p.mesh.geometry.dispose()
          ;(p.mesh.material as THREE.Material).dispose()
          return false
        }
        const positions = p.mesh.geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < positions.count; i++) {
          positions.setX(i, positions.getX(i) + p.velocities[i * 3] * dt)
          positions.setY(i, positions.getY(i) + p.velocities[i * 3 + 1] * dt - 9.8 * dt * dt)
          positions.setZ(i, positions.getZ(i) + p.velocities[i * 3 + 2] * dt)
        }
        positions.needsUpdate = true
        ;(p.mesh.material as THREE.PointsMaterial).opacity = 1 - p.life / p.maxLife
        return true
      })

      // ── Projectiles ──────────────────────────────────
      state.projectiles = state.projectiles.filter((p) => {
        p.life += dt
        if (p.life >= p.maxLife) {
          scene.remove(p.mesh)
          p.mesh.geometry.dispose()
          ;(p.mesh.material as THREE.Material).dispose()
          return false
        }
        const t2 = p.life / p.maxLife
        p.mesh.position.lerpVectors(p.from, p.to, t2)
        p.mesh.position.y = 1.5 + Math.sin(t2 * Math.PI) * 2
        return true
      })

      // ── Animate ring ─────────────────────────────────
      ring.rotation.z = t * 0.1
      ringMat.opacity = 0.06 + Math.sin(t * 1.5) * 0.02

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(state.animId)
      controls.dispose()
      renderer.dispose()
      scene.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose()
        if ((child as THREE.Mesh).material) {
          const m = (child as THREE.Mesh).material
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
          else (m as THREE.Material).dispose()
        }
      })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      internals.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
      }}
    />
  )
})

ArenaCanvas.displayName = 'ArenaCanvas'
export default ArenaCanvas
