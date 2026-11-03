import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

type Dot = { x: number; y: number; speed: number; tone: 'accent' | 'complement'; phase: number }

function unit(index: number) {
  const value = Math.sin(index * 91.7 + 19.2) * 43758.5453
  return value - Math.floor(value)
}

const DOTS: Dot[] = Array.from({ length: 36 }, (_, index) => ({
  x: unit(index + 3),
  y: unit(index + 19),
  speed: 0.01 + unit(index + 41) * 0.02,
  tone: unit(index + 63) > 0.5 ? 'complement' : 'accent',
  phase: unit(index + 80) * Math.PI * 2,
}))

function rgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '').trim()
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw
  const value = Number.parseInt(full, 16)
  if (Number.isNaN(value) || full.length !== 6) return `rgba(240,193,77,${alpha})`
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}

export function ScanBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    let running = true
    const started = performance.now()

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    resize()

    const draw = (now: number) => {
      if (!running) return
      const rect = parent.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const time = (now - started) / 1000
      const style = getComputedStyle(document.documentElement)
      const accent = style.getPropertyValue('--accent').trim() || '#f0c14d'
      const complement = style.getPropertyValue('--complement').trim() || '#3d7eff'
      context.clearRect(0, 0, width, height)

      const gap = 64
      const drift = reducedRef.current ? 12 : (time * 16) % gap
      for (let x = -gap; x < width + gap; x += gap) {
        context.strokeStyle = rgba(complement, 0.08)
        context.beginPath()
        context.moveTo(x + drift * 0.2, 0)
        context.lineTo(x + drift * 0.2, height)
        context.stroke()
      }
      for (let y = -gap; y < height + gap; y += gap) {
        context.strokeStyle = rgba(accent, 0.055)
        context.beginPath()
        context.moveTo(0, y + drift)
        context.lineTo(width, y + drift)
        context.stroke()
      }

      const points = DOTS.map((dot) => {
        const y = ((dot.y - (reducedRef.current ? 0 : time * dot.speed)) % 1 + 1) % 1
        const x = (dot.x + Math.sin(time * 0.2 + dot.phase) * 0.015 + 1) % 1
        return { x: x * width, y: y * height, dot }
      })
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)
          if (dist > 150) continue
          context.strokeStyle = rgba(points[i].dot.tone === 'accent' ? accent : complement, (1 - dist / 150) * 0.2)
          context.beginPath()
          context.moveTo(points[i].x, points[i].y)
          context.lineTo(points[j].x, points[j].y)
          context.stroke()
        }
      }
      for (const point of points) {
        const twinkle = 0.35 + Math.sin(time * 1.3 + point.dot.phase) * 0.25
        context.fillStyle = rgba(point.dot.tone === 'accent' ? accent : complement, reducedRef.current ? 0.4 : twinkle)
        context.beginPath()
        context.arc(point.x, point.y, 1.4, 0, Math.PI * 2)
        context.fill()
      }

      if (!reducedRef.current) {
        const bar = ((time * 0.07) % 1) * (height + 140) - 70
        const wash = context.createLinearGradient(0, bar - 80, 0, bar + 80)
        wash.addColorStop(0, rgba(complement, 0))
        wash.addColorStop(0.5, rgba(complement, 0.09))
        wash.addColorStop(1, rgba(accent, 0))
        context.fillStyle = wash
        context.fillRect(0, bar - 80, width, 160)
        frame = window.requestAnimationFrame(draw)
      }
    }

    frame = window.requestAnimationFrame(draw)
    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
}
