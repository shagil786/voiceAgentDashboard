import { useEffect, useRef } from "react"

/**
 * "Signal network" — ambient constellation for the console canvas.
 *
 * Concept: the platform as a living mesh of conversations. Dots (agents /
 * calls) drift slowly; nearby dots link with hairlines; every few seconds a
 * pulse ignites at one node and travels along a link to a neighbour — like a
 * governed decision moving through the system. The mouse gently warms the
 * network near the cursor.
 *
 * Deliberately NOT an equalizer/waveform (that motif belongs to the voice
 * moments). Warm ink-toned hairlines + faint orange nodes stay under the
 * content (z-0; content z-10), fixed right of the dark sidebar.
 *
 * prefers-reduced-motion: renders a single static frame.
 */

const NODE_COUNT = 34
const LINK_DIST = 170
const PULSE_INTERVAL_MS = 1400
const ACCENT = "255, 87, 1"

interface Node { x: number; y: number; vx: number; vy: number; r: number; hue: number }
interface Pulse { ax: number; ay: number; bx: number; by: number; born: number; dur: number }

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
    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mouseleave", onLeave)

    // nodes spread over the full canvas (not just bottom)
    const nodes: Node[] = []
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: 3 + Math.random() * 94,
        y: 5 + Math.random() * 90,
        vx: (Math.random() - 0.5) * 0.012,
        vy: (Math.random() - 0.5) * 0.012,
        r: 1.1 + Math.random() * 1.4,
        hue: Math.random(),
      })
    }

    let lastPulse = 0
    const pulses: Pulse[] = []

    const t0 = performance.now()

    function draw(t: number) {
      ctx.clearRect(0, 0, width, height)

      // update node drift (bounded wander)
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 2 || n.x > 98) n.vx *= -1
        if (n.y < 2 || n.y > 96) n.vy *= -1
        n.x = Math.max(1, Math.min(99, n.x))
        n.y = Math.max(1, Math.min(97, n.y))
      }

      // spawn pulses
      if (!reduced && t - lastPulse > PULSE_INTERVAL_MS) {
        lastPulse = t
        const a = nodes[Math.floor(Math.random() * nodes.length)]
        // pick a neighbour within link range, else random
        let b = nodes[Math.floor(Math.random() * nodes.length)]
        const candidates = nodes.filter((o) => {
          const d = Math.hypot(o.x - a.x, o.y - a.y)
          return d > 4 && d < (LINK_DIST / 100) * 3
        })
        if (candidates.length) b = candidates[Math.floor(Math.random() * candidates.length)]
        const dur = 1100 + Math.random() * 700
        pulses.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, born: t, dur })
      }
      pulses.splice(0, pulses.length)
      for (let i = pulses.length - 1; i >= 0; i--) {
        if (t - pulses[i].born > pulses[i].dur) pulses.splice(i, 1)
      }

      const px = (v: number) => (v / 100) * width
      const py = (v: number) => (v / 100) * height

      // links between close nodes
      ctx.lineWidth = 0.7
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y) * 100
          if (d < LINK_DIST) {
            const strength = (1 - d / LINK_DIST) * 0.55
            ctx.strokeStyle = `rgba(20, 20, 22, ${strength * 0.1})`
            ctx.beginPath()
            ctx.moveTo(px(a.x), py(a.y))
            ctx.lineTo(px(b.x), py(b.y))
            ctx.stroke()
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const nx = px(n.x)
        const ny = py(n.y)
        let glow = 0
        if (mouse.inside) {
          const d = Math.hypot(nx - mouse.x, ny - mouse.y)
          if (d < 160) glow = (1 - d / 160) * 0.7
        }
        // nodes near the active path warm toward orange
        ctx.fillStyle = `rgba(${ACCENT}, ${0.1 + glow * 0.3})`
        ctx.beginPath()
        ctx.arc(nx, ny, n.r + glow * 1.6, 0, Math.PI * 2)
        ctx.fill()
      }

      // travelling pulses
      for (const p of pulses) {
        const prog = Math.min(1, (t - p.born) / p.dur)
        const eased = 1 - Math.pow(1 - prog, 2)
        const x = px(p.ax + (p.bx - p.ax) * eased)
        const y = py(p.ay + (p.by - p.ay) * eased)
        const halo = 0.5 - Math.abs(prog - 0.5)
        ctx.fillStyle = `rgba(${ACCENT}, ${0.12 + halo * 0.5})`
        ctx.beginPath()
        ctx.arc(x, y, 2.6 + halo * 2.4, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduced) raf = requestAnimationFrame(draw)
    }

    if (reduced) {
      // one static frame of the network
      draw(t0)
      cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-full w-full md:left-[248px] md:w-[calc(100%-248px)]"
    />
  )
}
