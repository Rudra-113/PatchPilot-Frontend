import { useScroll } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

type Dot = { x: number; y: number; speed: number; size: number; tone: 'accent' | 'complement'; phase: number }

function seed(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

const DOTS: Dot[] = Array.from({ length: 64 }, (_, index) => ({
  x: seed(index + 1),
  y: seed(index + 40),
  speed: 0.012 + seed(index + 80) * 0.028,
  size: seed(index + 120) > 0.72 ? 1.7 : 1.1,
  tone: seed(index + 160) > 0.46 ? 'complement' : 'accent',
  phase: seed(index + 200) * Math.PI * 2,
}))

function rgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '').trim()
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw
  const value = Number.parseInt(full, 16)
  if (Number.isNaN(value) || full.length !== 6) return `rgba(240,193,77,${alpha})`
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}

export function LandingField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    let running = true
    const started = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr))
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (now: number) => {
      if (!running) return
      const width = window.innerWidth
      const height = window.innerHeight
      const time = (now - started) / 1000
      const scroll = scrollYProgress.get()
      const style = getComputedStyle(document.documentElement)
      const accent = style.getPropertyValue('--accent').trim() || '#f0c14d'
      const complement = style.getPropertyValue('--complement').trim() || '#3d7eff'
      context.clearRect(0, 0, width, height)

      const gap = 72
      const drift = reducedRef.current ? 0 : (time * 18 + scroll * height * 0.35) % gap
      context.lineWidth = 1
      for (let x = -gap; x < width + gap; x += gap) {
        const fade = 0.045 + 0.03 * Math.sin(time * 0.4 + x * 0.01)
        context.strokeStyle = rgba(complement, fade)
        context.beginPath()
        context.moveTo(x + drift * 0.15, 0)
        context.lineTo(x + drift * 0.15, height)
        context.stroke()
      }
      for (let y = -gap; y < height + gap; y += gap) {
        context.strokeStyle = rgba(accent, 0.04)
        context.beginPath()
        context.moveTo(0, y + drift)
        context.lineTo(width, y + drift)
        context.stroke()
      }

      const points = DOTS.map((dot) => {
        const y = ((dot.y - (reducedRef.current ? 0 : time * dot.speed) - scroll * 0.18) % 1 + 1) % 1
        const x = (dot.x + Math.sin(time * 0.15 + dot.phase) * 0.012 + 1) % 1
        return { x: x * width, y: y * height, dot }
      })

      context.lineWidth = 1
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x
          const dy = points[i].y - points[j].y
          const dist = Math.hypot(dx, dy)
          if (dist > 140) continue
          context.strokeStyle = rgba(points[i].dot.tone === 'accent' ? accent : complement, (1 - dist / 140) * 0.16)
          context.beginPath()
          context.moveTo(points[i].x, points[i].y)
          context.lineTo(points[j].x, points[j].y)
          context.stroke()
        }
      }

      for (const point of points) {
        const twinkle = 0.35 + Math.sin(time * 1.4 + point.dot.phase) * 0.25
        context.fillStyle = rgba(point.dot.tone === 'accent' ? accent : complement, reducedRef.current ? 0.45 : twinkle)
        context.beginPath()
        context.arc(point.x, point.y, point.dot.size, 0, Math.PI * 2)
        context.fill()
      }

      if (!reducedRef.current) {
        const bar = ((time * 0.08) % 1) * (height + 120) - 60
        const wash = context.createLinearGradient(0, bar - 70, 0, bar + 70)
        wash.addColorStop(0, rgba(complement, 0))
        wash.addColorStop(0.5, rgba(complement, 0.07))
        wash.addColorStop(1, rgba(accent, 0))
        context.fillStyle = wash
        context.fillRect(0, bar - 70, width, 140)
      }

      if (!reducedRef.current) frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [scrollYProgress])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" aria-hidden />
}
