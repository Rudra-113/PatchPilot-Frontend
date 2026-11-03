import { useScroll } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

type Vec = { x: number; y: number; z: number }
type Tone = 'accent' | 'complement' | 'muted' | 'critical'

type Edge = { a: number; b: number; tone: Tone }

const FILES = [
  { name: 'users.py', phi: 0.62, theta: 0.4, critical: true },
  { name: 'fetch.py', phi: 1.15, theta: 2.4, critical: true },
  { name: 'export.py', phi: 1.85, theta: 4.2, critical: true },
  { name: 'refunds.py', phi: 2.25, theta: 1.2, critical: false },
  { name: 'pyproject.toml', phi: 1.45, theta: 5.3, critical: false },
  { name: 'uv.lock', phi: 0.95, theta: 3.5, critical: false },
]

function rotX(p: Vec, angle: number): Vec {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }
}

function rotY(p: Vec, angle: number): Vec {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c }
}

function buildSphere() {
  const latCount = 7
  const lonCount = 18
  const verts: Vec[] = [{ x: 0, y: 1, z: 0 }]
  for (let lat = 1; lat <= latCount; lat += 1) {
    const phi = (lat / (latCount + 1)) * Math.PI
    const y = Math.cos(phi)
    const radius = Math.sin(phi)
    for (let lon = 0; lon < lonCount; lon += 1) {
      const theta = (lon / lonCount) * Math.PI * 2
      verts.push({ x: radius * Math.cos(theta), y, z: radius * Math.sin(theta) })
    }
  }
  verts.push({ x: 0, y: -1, z: 0 })
  const edges: Edge[] = []
  const south = verts.length - 1
  for (let lat = 0; lat < latCount; lat += 1) {
    for (let lon = 0; lon < lonCount; lon += 1) {
      const index = 1 + lat * lonCount + lon
      const next = 1 + lat * lonCount + ((lon + 1) % lonCount)
      edges.push({ a: index, b: next, tone: 'accent' })
      const meridian: Tone = lon % 3 === 0 ? 'complement' : 'accent'
      if (lat === 0) edges.push({ a: 0, b: index, tone: meridian })
      if (lat < latCount - 1) edges.push({ a: index, b: index + lonCount, tone: meridian })
      else edges.push({ a: index, b: south, tone: meridian })
    }
  }
  return { verts, edges }
}

const SPHERE = buildSphere()

const ORBITS = [
  { tilt: 0.28, twist: 0.15, radius: 1.08, tone: 'accent' as const, speed: 0.28 },
  { tilt: 1.18, twist: 0.55, radius: 1.12, tone: 'complement' as const, speed: -0.2 },
  { tilt: -0.62, twist: 1.15, radius: 1.02, tone: 'muted' as const, speed: 0.12 },
]

function filePoint(phi: number, theta: number): Vec {
  const y = Math.cos(phi)
  const radius = Math.sin(phi)
  return { x: radius * Math.cos(theta), y, z: radius * Math.sin(theta) }
}

function rgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '').trim()
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw
  const value = Number.parseInt(full, 16)
  if (Number.isNaN(value) || full.length !== 6) return `rgba(240,193,77,${alpha})`
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}

function readColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    accent: style.getPropertyValue('--accent').trim() || '#f0c14d',
    complement: style.getPropertyValue('--complement').trim() || '#3d7eff',
    critical: style.getPropertyValue('--critical').trim() || '#e85d4c',
    muted: style.getPropertyValue('--muted').trim() || '#8d8578',
    fg: style.getPropertyValue('--fg').trim() || '#f7f2e8',
  }
}

export function RepoSphere({
  variant = 'hero',
  progress,
  className,
}: {
  variant?: 'hero' | 'process'
  progress?: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll()
  const progressRef = useRef(progress)
  const reducedRef = useRef(reduced)
  progressRef.current = progress
  reducedRef.current = reduced

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let frame = 0
    let running = true
    const started = performance.now()

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    }
    const onLeave = () => {
      pointer.tx = 0
      pointer.ty = 0
    }
    canvas.addEventListener('pointermove', onPointer)
    canvas.addEventListener('pointerleave', onLeave)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const project = (point: Vec, yaw: number, pitch: number, cx: number, cy: number, radius: number) => {
      const spun = rotX(rotY(point, yaw), pitch)
      const depth = 2.55
      const scale = (radius * depth) / (depth - spun.z)
      return { x: cx + spun.x * scale, y: cy - spun.y * scale, z: spun.z }
    }

    const draw = (now: number) => {
      if (!running) return
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      if (width < 2 || height < 2) {
        frame = window.requestAnimationFrame(draw)
        return
      }
      const time = (now - started) / 1000
      const colors = readColors()
      const scroll = scrollYProgress.get()
      pointer.x += (pointer.tx - pointer.x) * 0.08
      pointer.y += (pointer.ty - pointer.y) * 0.08
      const yaw = (reducedRef.current ? 0.7 : time * 0.22) + scroll * 1.6 + pointer.x * 0.4
      const pitch = 0.32 + (reducedRef.current ? 0 : Math.sin(time * 0.2) * 0.08) + pointer.y * 0.22
      const given = progressRef.current
      const sweep = given == null
        ? (reducedRef.current ? 0.15 : ((time * 0.16) % 1) * 2 - 1)
        : 1 - given * 2

      context.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height * 0.46
      const radius = Math.min(width, height) * (variant === 'process' ? 0.28 : width < 480 ? 0.22 : 0.33)

      const glow = context.createRadialGradient(cx, cy, radius * 0.02, cx, cy, radius * 1.55)
      glow.addColorStop(0, rgba(colors.accent, 0.42))
      glow.addColorStop(0.28, rgba(colors.complement, 0.16))
      glow.addColorStop(1, rgba(colors.complement, 0))
      context.fillStyle = glow
      context.beginPath()
      context.arc(cx, cy, radius * 1.55, 0, Math.PI * 2)
      context.fill()

      const toneColor = (tone: Tone, alpha: number) => rgba(tone === 'accent' ? colors.accent : tone === 'complement' ? colors.complement : tone === 'critical' ? colors.critical : colors.muted, alpha)

      const strokeRing = (points: Array<{ x: number; y: number }>, color: string, width: number) => {
        context.beginPath()
        points.forEach((point, step) => {
          if (step === 0) context.moveTo(point.x, point.y)
          else context.lineTo(point.x, point.y)
        })
        context.closePath()
        context.strokeStyle = color
        context.lineWidth = width
        context.stroke()
      }

      const shell = (scale: number, spin: number, tilt: number, alpha: number) => {
        for (const edge of SPHERE.edges) {
          const a = project(SPHERE.verts[edge.a], yaw * spin, pitch * tilt, cx, cy, radius * scale)
          const b = project(SPHERE.verts[edge.b], yaw * spin, pitch * tilt, cx, cy, radius * scale)
          const depth = (a.z + b.z) / 2
          context.beginPath()
          context.moveTo(a.x, a.y)
          context.lineTo(b.x, b.y)
          context.strokeStyle = toneColor(edge.tone, alpha * (0.15 + ((depth + 1) / 2) * 0.85))
          context.lineWidth = scale > 0.7 ? 1.15 : 0.8
          context.stroke()
        }
      }
      shell(0.42, -1.35, 0.65, 0.55)
      shell(1, 1, 1, 0.9)

      const north = project({ x: 0, y: 1.16, z: 0 }, yaw, pitch, cx, cy, radius)
      const south = project({ x: 0, y: -1.16, z: 0 }, yaw, pitch, cx, cy, radius)
      context.beginPath()
      context.moveTo(north.x, north.y)
      context.lineTo(south.x, south.y)
      context.strokeStyle = rgba(colors.accent, 0.45)
      context.lineWidth = 1
      context.stroke()

      for (let tick = 0; tick < 48; tick += 1) {
        const angle = (tick / 48) * Math.PI * 2
        const inner = 0.96
        const outer = tick % 4 === 0 ? 1.14 : 1.06
        const a = project({ x: Math.cos(angle) * inner, y: 0, z: Math.sin(angle) * inner }, yaw, pitch, cx, cy, radius)
        const b = project({ x: Math.cos(angle) * outer, y: 0, z: Math.sin(angle) * outer }, yaw, pitch, cx, cy, radius)
        context.beginPath()
        context.moveTo(a.x, a.y)
        context.lineTo(b.x, b.y)
        context.strokeStyle = rgba(tick % 2 === 0 ? colors.accent : colors.complement, 0.2 + ((a.z + 1) / 2) * 0.65)
        context.lineWidth = tick % 4 === 0 ? 1.4 : 0.8
        context.stroke()
      }

      for (const orbit of ORBITS) {
        const spin = reducedRef.current ? 0.4 : time * orbit.speed
        const ring: Array<{ x: number; y: number; z: number }> = []
        for (let step = 0; step <= 96; step += 1) {
          const angle = (step / 96) * Math.PI * 2 + spin
          let point = { x: Math.cos(angle) * orbit.radius, y: 0, z: Math.sin(angle) * orbit.radius }
          point = rotY(rotX(point, orbit.tilt), orbit.twist)
          ring.push(project(point, yaw, pitch, cx, cy, radius))
        }
        strokeRing(ring, toneColor(orbit.tone, orbit.tone === 'complement' ? 0.9 : 0.62), orbit.tone === 'complement' ? 1.5 : 1)
        for (let trail = 0; trail < 7; trail += 1) {
          const angle = spin - trail * 0.09
          let point = { x: Math.cos(angle) * orbit.radius, y: 0, z: Math.sin(angle) * orbit.radius }
          point = rotY(rotX(point, orbit.tilt), orbit.twist)
          const projected = project(point, yaw, pitch, cx, cy, radius)
          if (projected.z < -0.25) continue
          context.fillStyle = toneColor(orbit.tone, 0.95 - trail * 0.12)
          context.beginPath()
          context.arc(projected.x, projected.y, trail === 0 ? 3.1 : 1.7, 0, Math.PI * 2)
          context.fill()
        }
      }

      const ringRadius = Math.sqrt(Math.max(0, 1 - sweep * sweep))
      if (ringRadius > 0.04) {
        const band: Array<{ x: number; y: number }> = []
        for (let step = 0; step <= 80; step += 1) {
          const angle = (step / 80) * Math.PI * 2
          band.push(project({ x: Math.cos(angle) * ringRadius, y: sweep, z: Math.sin(angle) * ringRadius }, yaw, pitch, cx, cy, radius))
        }
        context.beginPath()
        band.forEach((point, step) => {
          if (step === 0) context.moveTo(point.x, point.y)
          else context.lineTo(point.x, point.y)
        })
        context.closePath()
        context.fillStyle = rgba(colors.complement, 0.08)
        context.fill()
        strokeRing(band, rgba(colors.complement, 0.95), 1.8)
        for (let satellite = 0; satellite < 3; satellite += 1) {
          const angle = time * (1.2 + satellite * 0.35) + satellite * 2.1
          for (let trail = 0; trail < 6; trail += 1) {
            const projected = project(
              { x: Math.cos(angle - trail * 0.12) * ringRadius, y: sweep, z: Math.sin(angle - trail * 0.12) * ringRadius },
              yaw,
              pitch,
              cx,
              cy,
              radius,
            )
            context.fillStyle = rgba(trail === 0 ? colors.fg : colors.complement, 0.95 - trail * 0.14)
            context.beginPath()
            context.arc(projected.x, projected.y, trail === 0 ? 3.4 : 1.8, 0, Math.PI * 2)
            context.fill()
          }
        }
      }

      context.save()
      context.shadowBlur = 14
      for (let pulse = 0; pulse < 14; pulse += 1) {
        const theta = (pulse / 14) * Math.PI * 2
        const phi = ((time * 0.42 + pulse * 0.19) % 1) * Math.PI
        const projected = project(
          { x: Math.sin(phi) * Math.cos(theta), y: Math.cos(phi), z: Math.sin(phi) * Math.sin(theta) },
          yaw,
          pitch,
          cx,
          cy,
          radius,
        )
        if (projected.z < -0.2) continue
        const color = pulse % 2 === 0 ? colors.accent : colors.complement
        context.shadowColor = color
        context.fillStyle = rgba(color, 0.95)
        context.beginPath()
        context.arc(projected.x, projected.y, pulse % 3 === 0 ? 3.3 : 2.1, 0, Math.PI * 2)
        context.fill()
      }
      context.restore()

      const core = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.2)
      core.addColorStop(0, rgba(colors.fg, 0.95))
      core.addColorStop(0.4, rgba(colors.accent, 0.8))
      core.addColorStop(1, rgba(colors.complement, 0))
      context.fillStyle = core
      context.beginPath()
      context.arc(cx, cy, radius * 0.2, 0, Math.PI * 2)
      context.fill()

      if (variant === 'process') {
        context.font = '11px "JetBrains Mono Variable", ui-monospace, monospace'
        context.textBaseline = 'middle'
        for (const file of FILES) {
          const point = filePoint(file.phi, file.theta)
          const projected = project(point, yaw, pitch, cx, cy, radius)
          if (projected.z < -0.05) continue
          const read = point.y > sweep + 0.06
          const active = Math.abs(point.y - sweep) <= 0.12
          const color = active ? colors.complement : read && file.critical ? colors.critical : read ? colors.accent : colors.muted
          const alpha = projected.z > 0 ? 1 : 0.35
          context.fillStyle = rgba(color, alpha)
          context.beginPath()
          context.arc(projected.x, projected.y, active ? 4 : 2.6, 0, Math.PI * 2)
          context.fill()
          if (projected.z > 0.02 && (read || active) && projected.x > 12 && projected.x < width - 92) {
            context.fillStyle = rgba(color, 0.95)
            context.fillText(file.name, projected.x + 8, projected.y)
          }
        }
      } else {
        for (let index = 0; index < SPHERE.verts.length; index += 4) {
          const projected = project(SPHERE.verts[index], yaw, pitch, cx, cy, radius)
          const near = Math.abs(SPHERE.verts[index].y - sweep) < 0.16
          context.fillStyle = rgba(near ? colors.complement : colors.accent, 0.25 + ((projected.z + 1) / 2) * 0.75)
          context.beginPath()
          context.arc(projected.x, projected.y, near ? 2.8 : 1.6, 0, Math.PI * 2)
          context.fill()
        }
      }

      if (!reducedRef.current) frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [scrollYProgress, variant])

  return <canvas ref={canvasRef} className={className ?? 'h-full w-full'} aria-hidden />
}
