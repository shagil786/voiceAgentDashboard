import { useEffect, useRef } from "react"

/**
 * Interactive audio visualizer (canvas) — the console's ambient soul.
 *
 * - Bottom equalizer field: ~72 bars breathing with layered sine motion,
 *   warm orange, clearly visible but living BEHIND content (z-0, content z-10).
 * - Mouse-reactive: bars swell near the cursor and follow its X position.
 * - Click: an impulse ripples outward from the click point.
 * - Drifting particles gently pushed by the cursor; sonar rings stay.
 * - prefers-reduced-motion: bars render static (no rAF loop).
 * - Fixed to the viewport, right of the dark sidebar (md: left 248px).
 */

const BAR_COUNT = 72
const RING_COUNT = 3
const PARTICLE_COUNT = 22
const ACCENT = "255, 87, 1"

interface Ripple { x: number; born: number }
interface Particle { x: number; y: number; r: number; vx: number; vy: number }

function prefersReduced(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

export function Soundscape() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const reduced = prefersReduced()
    const mouse = { x: -9999, y: -9999, inside: false }
    let ripples: Ripple[] = []
    const particles: Particle[] = []

    const size = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(canvas)

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.inside = mouse.x >= 0 && mouse.x <= rect.width && mouse.y >= 0 && mouse.y <= rect.height
    }
    const onLeave = () => { mouse.inside = false; mouse.x = -9999 }
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      if (x >= 0 && x <= rect.width) ripples.push({ x, born: performance.now() })
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mouseleave", onLeave)
    window.addEventListener("click", onClick)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (i * 53) % 100,
        y: 18 + ((i * 31) % 70),
        r: 1.2 + (i % 3) * 0.7,
        vx: (i % 2 ? 1 : -1) * (0.02 + (i % 4) * 0.012),
        vy: -(0.03 + (i % 5) * 0.014),
      })
    }

    const bars: { x: number; w: number }[] = []
    const layoutBars = () => {
      bars.length = 0
      const gap = 6
      const bw = Math.max(2.5, (width - 40) / BAR_COUNT - gap)
      for (let i = 0; i < BAR_COUNT; i++) bars.push({ x: 20 + i * (bw + gap), w: bw })
    }
    layoutBars()
    const ro2 = new ResizeObserver(layoutBars)
    ro2.observe(canvas)

    const t0 = performance.now()

    function draw(t: number) {
      const elapsed = (t - t0) / 1000
      ctx.clearRect(0, 0, width, height)
      const fieldH = Math.min(160, height * 0.8)

      // equalizer bars
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i]
        const cx = b.x + b.w / 2
        const s1 = Math.sin(elapsed * 1.7 + i * 0.55)
        const s2 = Math.sin(elapsed * 3.1 + i * 0.23)
        const s3 = Math.sin(elapsed * 0.7 + i * 0.9)
        let amp = 0.3 + 0.32 * s1 + 0.2 * s2 + 0.18 * s3
        amp = Math.max(0.08, Math.min(1, amp))

        // cursor proximity surge
        let surge = 0
        if (mouse.inside) {
          const d = Math.abs(cx - mouse.x)
          surge = Math.max(0, 1 - d / 260) * 0.9
          // travelling wave follows cursor X
          const wave = Math.sin(cx * 0.03 - elapsed * 6)
          const fall = Math.max(0, 1 - Math.abs(cx - mouse.x) / 400)
          surge = Math.max(surge, wave * fall * 0.6)
        }
        // click ripples: lift decaying over time & distance
        let rippleBoost = 0
        for (const rp of ripples) {
          const age = (t - rp.born) / 1000
          if (age < 0.9) {
            const dist = Math.abs(cx - rp.x)
            rippleBoost = Math.max(rippleBoost, Math.max(0, 1 - dist / 520) * (1 - age / 0.9))
          }
        }

        const h = Math.min(fieldH, Math.max(3, (amp + surge * 0.35 + rippleBoost * 0.6) * fieldH))
        const alpha = mouse.inside && Math.abs(cx - mouse.x) < 260 ? 0.4 : 0.26
        const grad = ctx.createLinearGradient(0, 0, 0, fieldH)
        grad.addColorStop(0, `rgba(${ACCENT}, 0.03)`)
        grad.addColorStop(0.7, `rgba(${ACCENT}, ${alpha * 0.75})`)
        grad.addColorStop(1, `rgba(${ACCENT}, ${alpha})`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(b.x, height - 8 - h, b.w, h, b.w / 2)
        ctx.fill()
      }

      // particles (drift + cursor push)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -4) p.y = 98 + Math.random() * 4
        if (p.x > 102) p.x = -2
        if (p.x < -2) p.x = 102
        const px = (p.x / 100) * width
        const py = (p.y / 100) * height
        if (mouse.inside) {
          const dx = px - mouse.x
          const dy = py - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < 130 && dist > 0.01) {
            const push = (1 - dist / 130) * 0.05
            p.vx += (dx / dist) * push
            p.vy += (dy / dist) * push
          }
        }
        p.vx = Math.max(-0.12, Math.min(0.12, p.vx * 0.99))
        p.vy = Math.max(-0.14, Math.min(0.06, p.vy * 0.99))
        ctx.fillStyle = `rgba(${ACCENT}, 0.15)`
        ctx.beginPath()
        ctx.arc(px, py, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // sonar rings (bottom-left)
      for (let i = 0; i < RING_COUNT; i++) {
        const phase = (elapsed * 0.22 + i / RING_COUNT) % 1
        const sizePx = 40 + phase * 180
        ctx.strokeStyle = `rgba(${ACCENT}, ${(1 - phase) * 0.18})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(30, height - 24, sizePx, 0, Math.PI * 2)
        ctx.stroke()
      }

      ripples = ripples.filter((rp) => (t - rp.born) / 1000 < 0.9)
      raf = requestAnimationFrame(draw)
    }

    if (reduced) {
      // static visible bars, no loop
      for (const b of bars) {
        const h = 22 + ((b.x * 7) % 70)
        ctx.fillStyle = `rgba(${ACCENT}, 0.18)`
        ctx.beginPath()
        ctx.roundRect(b.x, height - 8 - h, b.w, h, b.w / 2)
        ctx.fill()
      }
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      ro2.disconnect()
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("click", onClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[190px] w-full md:left-[248px] md:w-[calc(100%-248px)]"
    />
  )
}
