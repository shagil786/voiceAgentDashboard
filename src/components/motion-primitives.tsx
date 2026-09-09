import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, animate, motion, useMotionValue, useSpring } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * Premium motion primitives (hand-ported patterns from the reactbits /
 * motion-primitives / aceternity ecosystem, rebuilt for this console).
 */

/* ── AnimatedCounter: count-up when it enters the viewport ─────────────── */
export function AnimatedCounter({
  value, decimals = 0, prefix = "", suffix = "", duration = 1.6, className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [inView, setInView] = useState(false)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, value, duration])

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString("en-US")

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

/* ── SpotlightCard: cursor-tracked radial glow (reactbits pattern) ─────── */
export function SpotlightCard({
  children, className, spotlightColor = "255, 87, 1", hoverable = true,
}: {
  children: ReactNode
  className?: string
  spotlightColor?: string
  hoverable?: boolean
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(0)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = divRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setOpacity(1)
  }, [])

  const onMouseLeave = useCallback(() => setOpacity(0), [])

  return (
    <div
      ref={divRef}
      onMouseMove={hoverable ? onMouseMove : undefined}
      onMouseLeave={hoverable ? onMouseLeave : undefined}
      className={cn("card-3d relative overflow-hidden", hoverable && "card-3d-hover", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(340px circle at ${pos.x}px ${pos.y}px, rgba(${spotlightColor}, 0.12), transparent 62%)`,
        }}
      />
      {children}
    </div>
  )
}

/* ── Magnetic button: element eases toward cursor (reactbits pattern) ──── */
export function MagneticButton({
  children, strength = 0.35, className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 16 })
  const sy = useSpring(y, { stiffness: 200, damping: 16 })

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} onMouseMove={onMove} onMouseLeave={onLeave} className={cn("inline-block", className)}>
      {children}
    </motion.div>
  )
}

/* ── Stagger entrance: children fade+rise in sequence on mount ─────────── */
export function Stagger({ children, className, delay = 0 }: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 18, scale: 0.99 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}

/* ── Animated number swap for live updates (pairs with live streaming) ─── */
export function AnimatedSwap({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-grid overflow-hidden tabular-nums", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="[grid-area:1/1]"
        >
          {value.toLocaleString("en-US")}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
