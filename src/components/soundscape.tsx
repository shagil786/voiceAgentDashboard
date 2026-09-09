/**
 * Ambient soundscape — decorative, behind everything, pointer-events-none.
 * Three subtle layers of "audio" so the canvas has life without fighting
 * content:
 *   1. Drifting particles (faint warm dots, slow vertical float)
 *   2. Expanding sound rings (voice-pulse from the lower area)
 *   3. A low equalizer strip along the bottom edge
 * All values are CSS-only (no JS, no canvas) for perf; each layer stays
 * well under the visual-noise threshold of the content above it.
 */

const PARTICLE_COUNT = 14
const EQ_COUNT = 36

function particles() {
  return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    // deterministic pseudo-random spread
    const x = (i * 71) % 100
    const y = 12 + ((i * 37) % 70)
    const size = 2 + (i % 3)
    const dur = 7 + (i % 5) * 1.6
    const delay = (i % 7) * 0.9
    return (
      <span
        key={i}
        className="drift-dot"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          background: `rgba(255, 87, 1, ${0.05 + (i % 4) * 0.03})`,
          animationDelay: `${delay}s`,
          ["--drift-dur" as string]: `${dur}s`,
        }}
      />
    )
  })
}

function rings() {
  return [0, 1, 2].map((i) => (
    <span
      key={`ring-${i}`}
      className="snd-ring"
      style={{
        left: "12%",
        bottom: "6%",
        width: 90 + i * 60,
        height: 90 + i * 60,
        animationDelay: `${i * 1.7}s`,
        ["--ring-dur" as string]: `${5 + i * 1.2}s`,
      }}
    />
  ))
}

function equalizer() {
  return Array.from({ length: EQ_COUNT }).map((_, i) => {
    const h = 8 + ((i * 13) % 30)
    const dur = 0.9 + ((i * 7) % 10) / 10
    return (
      <span
        key={`eq-${i}`}
        className="eq-bar"
        style={{
          height: `${h}px`,
          background: `rgba(255, 87, 1, ${0.05 + ((i * 11) % 6) * 0.014})`,
          animationDuration: `${dur}s`,
          animationDelay: `${(i % 9) * 0.18}s`,
        }}
      />
    )
  })
}

export function Soundscape() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: 1 }}>
      {/* drifting warm particles */}
      <div className="absolute inset-0">{particles()}</div>
      {/* expanding voice rings, anchored bottom-left */}
      {rings()}
      {/* bottom equalizer strip */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[7px] px-24 pb-2"
        style={{ height: 46 }}>
        {equalizer()}
      </div>
    </div>
  )
}
