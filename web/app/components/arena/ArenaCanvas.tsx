import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/* ── Constants ────────────────────────────────────────────────── */

const UNIT_SCALE = 10
const ARENA_UNITS = 20

/** Convert game position (tenths) to world coords */
function gameToWorld(pos: { x: number; y: number }): [number, number, number] {
  const wx = (pos.x / UNIT_SCALE - ARENA_UNITS / 2) * 2
  const wz = (pos.y / UNIT_SCALE - ARENA_UNITS / 2) * 2
  return [wx, 0, wz]
}

/* ── Crawler builder ─────────────────────────────────────────── */

function buildCrawler(color: string): THREE.Group {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.8,
    roughness: 0.2,
    emissive: color,
    emissiveIntensity: 0.2,
  })

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), mat)
  body.position.y = 0.8
  body.castShadow = true
  group.add(body)

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), mat)
  head.position.set(0.7, 1.0, 0)
  head.castShadow = true
  group.add(head)

  // Eye — bright glowing sphere
  const eyeMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: color,
    emissiveIntensity: 5,
  })
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12), eyeMat)
  eye.position.set(0.3, 0, 0.26)
  head.add(eye)

  // Second eye
  const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.12), eyeMat)
  eye2.position.set(0.3, 0, -0.26)
  head.add(eye2)

  // 4 legs
  const legMat = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.1 })
  const legPositions: [number, number, number][] = [
    [0.4, 0, 0.5], [-0.4, 0, 0.5], [0.4, 0, -0.5], [-0.4, 0, -0.5],
  ]
  for (const [lx, _ly, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2), legMat)
    leg.rotation.z = (Math.PI / 4) * (lx > 0 ? 1 : -1)
    leg.position.set(lx * 0.9, 0.3, lz)
    leg.castShadow = true
    group.add(leg)
  }

  // Weapon appendage
  const weapon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0), mat)
  weapon.rotation.z = Math.PI / 2
  weapon.position.set(0.5, 0.9, 0)
  weapon.castShadow = true
  group.add(weapon)

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
  count: number = 20,
): Particle {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x
    positions[i * 3 + 1] = position.y + 1
    positions[i * 3 + 2] = position.z
    velocities[i * 3] = (Math.random() - 0.5) * 8
    velocities[i * 3 + 1] = Math.random() * 6
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 8
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.15,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const points = new THREE.Points(geo, mat)
  scene.add(points)
  return { mesh: points, velocities, life: 0, maxLife: 0.5 }
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
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12), mat)
  mesh.position.copy(from)
  mesh.position.y = 1
  scene.add(mesh)
  return { mesh, from: from.clone(), to: to.clone(), life: 0, maxLife: 0.2 }
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

const ArenaCanvas = forwardRef<ArenaHandle, {}>((_props, ref) => {
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
    // Animation states
    hitFlashA: number
    hitFlashB: number
    attackLungeA: number
    attackLungeB: number
    deathA: boolean
    deathB: boolean
    guardPulseA: number
    guardPulseB: number
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
        // Face toward enemy
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
        const color = attacker === 'botA' ? '#EB4D4B' : '#00E5FF'
        s.projectiles.push(createProjectile(s.scene, from, to, color))
      }
    },
    triggerHit(target, _damage) {
      const s = internals.current
      if (!s) return
      if (target === 'botA') s.hitFlashA = 0.3
      else s.hitFlashB = 0.3
      const pos = target === 'botA' ? s.crawlerA.position : s.crawlerB.position
      const color = target === 'botA' ? '#EB4D4B' : '#00E5FF'
      s.particles.push(createParticleBurst(s.scene, pos, color))
    },
    triggerDeath(target) {
      const s = internals.current
      if (!s) return
      if (target === 'botA') s.deathA = true
      else s.deathB = true
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

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050510')
    scene.fog = new THREE.FogExp2('#050510', 0.025)

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      200,
    )
    camera.position.set(0, 12, 20)
    camera.lookAt(0, 2, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.8
    container.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2.2
    controls.minDistance = 8
    controls.maxDistance = 50
    controls.target.set(0, 2, 0)

    // Grid floor
    const gridHelper = new THREE.GridHelper(40, 20, '#00E5FF', '#0a0a20')
    ;(gridHelper.material as THREE.Material).opacity = 0.3
    ;(gridHelper.material as THREE.Material).transparent = true
    scene.add(gridHelper)

    // Ground plane (shadow receiver)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: '#050510', roughness: 1 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    // Emissive glow floor — subtle cyan wash
    const glowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#00E5FF',
        emissiveIntensity: 0.08,
        transparent: true,
        opacity: 0.6,
      }),
    )
    glowFloor.rotation.x = -Math.PI / 2
    glowFloor.position.y = -0.005
    scene.add(glowFloor)

    // Objective zone ring
    const ringGeo = new THREE.RingGeometry(4.5, 5.0, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#FFD600',
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.02
    scene.add(ring)

    // Lights — strong colored point lights for dramatic effect
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.25)
    scene.add(ambientLight)

    const whiteOverhead = new THREE.PointLight('#ffffff', 1, 60)
    whiteOverhead.position.set(0, 20, 0)
    whiteOverhead.castShadow = true
    scene.add(whiteOverhead)

    const redLight = new THREE.PointLight('#EB4D4B', 3, 50)
    redLight.position.set(-12, 6, 0)
    scene.add(redLight)

    const cyanLight = new THREE.PointLight('#00E5FF', 3, 50)
    cyanLight.position.set(12, 6, 0)
    scene.add(cyanLight)

    // Rim lights on arena edges
    const rimLight1 = new THREE.SpotLight('#EB4D4B', 3, 40, Math.PI / 6)
    rimLight1.position.set(-20, 15, 0)
    rimLight1.target.position.set(0, 0, 0)
    scene.add(rimLight1)
    scene.add(rimLight1.target)

    const rimLight2 = new THREE.SpotLight('#00E5FF', 3, 40, Math.PI / 6)
    rimLight2.position.set(20, 15, 0)
    rimLight2.target.position.set(0, 0, 0)
    scene.add(rimLight2)
    scene.add(rimLight2.target)

    // Crawlers — scaled 2.5x for visual impact
    const crawlerA = buildCrawler('#EB4D4B')
    crawlerA.scale.setScalar(2.5)
    crawlerA.position.set(-14, 0, 0)
    scene.add(crawlerA)

    const crawlerB = buildCrawler('#00E5FF')
    crawlerB.scale.setScalar(2.5)
    crawlerB.position.set(14, 0, 0)
    crawlerB.rotation.y = Math.PI
    scene.add(crawlerB)

    // Arena boundary posts
    const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 4)
    const postMat = new THREE.MeshStandardMaterial({
      color: '#333',
      metalness: 0.9,
      roughness: 0.2,
    })
    const corners = [[-20, -20], [-20, 20], [20, -20], [20, 20]]
    for (const [cx, cz] of corners) {
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(cx, 2, cz)
      scene.add(post)
      // Glow on top of post
      const glowMat = new THREE.MeshStandardMaterial({
        color: '#FFD600',
        emissive: '#FFD600',
        emissiveIntensity: 3,
      })
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2), glowMat)
      glow.position.set(cx, 4, cz)
      scene.add(glow)
    }

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
      attackLungeA: 0,
      attackLungeB: 0,
      deathA: false,
      deathB: false,
      guardPulseA: 0,
      guardPulseB: 0,
      shakeAmount: 0,
      cameraBase,
    }
    internals.current = state

    // Animation loop
    function animate() {
      state.animId = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.getElapsedTime()

      // Smooth crawler movement
      state.crawlerA.position.lerp(state.targetA, 0.08)
      state.crawlerB.position.lerp(state.targetB, 0.08)

      // Idle bob
      if (!state.deathA) {
        state.crawlerA.position.y = Math.sin(t * 2) * 0.08
      }
      if (!state.deathB) {
        state.crawlerB.position.y = Math.sin(t * 2 + 1) * 0.08
      }

      // Leg oscillation (rotate legs slightly)
      state.crawlerA.children.forEach((child, i) => {
        if (i >= 3 && i <= 6) {
          child.rotation.x = Math.sin(t * 4 + i) * 0.15
        }
      })
      state.crawlerB.children.forEach((child, i) => {
        if (i >= 3 && i <= 6) {
          child.rotation.x = Math.sin(t * 4 + i + 2) * 0.15
        }
      })

      // Attack lunge animation
      if (state.attackLungeA > 0) {
        state.attackLungeA -= dt
        const intensity = Math.sin((1 - state.attackLungeA / 0.3) * Math.PI) * 0.5
        const dir = new THREE.Vector3()
          .subVectors(state.crawlerB.position, state.crawlerA.position)
          .normalize()
        state.crawlerA.position.add(dir.multiplyScalar(intensity * dt * 10))
      }
      if (state.attackLungeB > 0) {
        state.attackLungeB -= dt
        const intensity = Math.sin((1 - state.attackLungeB / 0.3) * Math.PI) * 0.5
        const dir = new THREE.Vector3()
          .subVectors(state.crawlerA.position, state.crawlerB.position)
          .normalize()
        state.crawlerB.position.add(dir.multiplyScalar(intensity * dt * 10))
      }

      // Hit flash (emissive spike)
      if (state.hitFlashA > 0) {
        state.hitFlashA -= dt
        const intensity = (state.hitFlashA / 0.3) * 5
        state.crawlerA.traverse((child) => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = intensity
          }
        })
      } else {
        state.crawlerA.traverse((child) => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
            if (m.emissiveIntensity > 0.3) m.emissiveIntensity = 0.2
          }
        })
      }
      if (state.hitFlashB > 0) {
        state.hitFlashB -= dt
        const intensity = (state.hitFlashB / 0.3) * 5
        state.crawlerB.traverse((child) => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = intensity
          }
        })
      } else {
        state.crawlerB.traverse((child) => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
            if (m.emissiveIntensity > 0.3) m.emissiveIntensity = 0.2
          }
        })
      }

      // Guard pulse
      if (state.guardPulseA > 0) {
        state.guardPulseA -= dt
        state.crawlerA.traverse((child) => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity =
              0.2 + Math.sin(t * 8) * 0.8
          }
        })
      }
      if (state.guardPulseB > 0) {
        state.guardPulseB -= dt
        state.crawlerB.traverse((child) => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity =
              0.2 + Math.sin(t * 8) * 0.8
          }
        })
      }

      // Death animation
      if (state.deathA) {
        state.crawlerA.rotation.x = Math.min(
          state.crawlerA.rotation.x + dt * 2,
          Math.PI / 2,
        )
        state.crawlerA.position.y = Math.max(state.crawlerA.position.y - dt * 2, -0.3)
      }
      if (state.deathB) {
        state.crawlerB.rotation.x = Math.min(
          state.crawlerB.rotation.x + dt * 2,
          Math.PI / 2,
        )
        state.crawlerB.position.y = Math.max(state.crawlerB.position.y - dt * 2, -0.3)
      }

      // Camera shake
      if (state.shakeAmount > 0) {
        state.shakeAmount -= dt * 2
        const shake = state.shakeAmount * 0.5
        camera.position.x = state.cameraBase.x + (Math.random() - 0.5) * shake
        camera.position.y = state.cameraBase.y + (Math.random() - 0.5) * shake
      }

      // Update particles
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

      // Update projectiles
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
        p.mesh.position.y = 1 + Math.sin(t2 * Math.PI) * 2
        return true
      })

      // Animate objective ring
      ring.rotation.z = t * 0.2
      ringMat.opacity = 0.1 + Math.sin(t * 1.5) * 0.05

      // Animate post glows
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
          const m = child.material as THREE.MeshStandardMaterial
          if (m.emissive && m.emissive.getHex() === 0xffd600) {
            m.emissiveIntensity = 2 + Math.sin(t * 3) * 1
          }
        }
      })

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
