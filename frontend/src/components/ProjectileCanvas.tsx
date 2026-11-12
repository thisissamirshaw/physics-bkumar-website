import { useEffect, useRef } from 'react'

// Projectile launched from the origin: u = 20 m/s at 50° to the horizontal.
const U = 20
const THETA = (50 * Math.PI) / 180
const G = 9.8
const UX = U * Math.cos(THETA)
const UY = U * Math.sin(THETA)
const T = (2 * UY) / G // time of flight
const R = UX * T // range
const H = (UY * UY) / (2 * G) // max height

const pos = (t: number) => ({ x: UX * t, y: UY * t - 0.5 * G * t * t })

export default function ProjectileCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const readout = {
    t: useRef<HTMLElement>(null),
    x: useRef<HTMLElement>(null),
    y: useRef<HTMLElement>(null),
    v: useRef<HTMLElement>(null),
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.documentElement
    let W = 0
    let Hh = 0
    let raf = 0
    let colors = readColors()

    function readColors() {
      const cs = getComputedStyle(root)
      const v = (n: string) => cs.getPropertyValue(n).trim()
      return {
        grid: v('--grid'), line: v('--line'), ink: v('--ink'), muted: v('--muted'),
        accent: v('--accent'), surface: v('--surface'), mono: v('--f-mono'),
      }
    }

    function size() {
      const b = canvas!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = b.width
      Hh = b.height
      canvas!.width = Math.round(W * dpr)
      canvas!.height = Math.round(Hh * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function arrow(x1: number, y1: number, x2: number, y2: number, col: string, w: number) {
      const a = Math.atan2(y2 - y1, x2 - x1)
      if (Math.hypot(x2 - x1, y2 - y1) < 4) return
      ctx!.strokeStyle = col
      ctx!.fillStyle = col
      ctx!.lineWidth = w
      ctx!.beginPath()
      ctx!.moveTo(x1, y1)
      ctx!.lineTo(x2, y2)
      ctx!.stroke()
      ctx!.beginPath()
      ctx!.moveTo(x2, y2)
      ctx!.lineTo(x2 - 7 * Math.cos(a - 0.4), y2 - 7 * Math.sin(a - 0.4))
      ctx!.lineTo(x2 - 7 * Math.cos(a + 0.4), y2 - 7 * Math.sin(a + 0.4))
      ctx!.closePath()
      ctx!.fill()
    }

    function draw(t: number) {
      const c = colors
      const padL = 36, padR = 28, padT = 54, padB = 58
      const s = Math.min((W - padL - padR) / R, (Hh - padT - padB) / (H * 1.15))
      const ox = padL
      const oy = Hh - padB
      const X = (x: number) => ox + x * s
      const Y = (y: number) => oy - y * s

      ctx!.clearRect(0, 0, W, Hh)

      // Graph paper: 1 m minor lines, 5 m major lines.
      ctx!.lineWidth = 1
      for (let m = 0; X(m) < W; m++) {
        ctx!.strokeStyle = m % 5 === 0 ? c.line : c.grid
        ctx!.beginPath(); ctx!.moveTo(Math.round(X(m)) + 0.5, 0); ctx!.lineTo(Math.round(X(m)) + 0.5, Hh); ctx!.stroke()
      }
      for (let m = 0; Y(m) > 0; m++) {
        ctx!.strokeStyle = m % 5 === 0 ? c.line : c.grid
        ctx!.beginPath(); ctx!.moveTo(0, Math.round(Y(m)) + 0.5); ctx!.lineTo(W, Math.round(Y(m)) + 0.5); ctx!.stroke()
      }
      ctx!.strokeStyle = c.ink
      ctx!.lineWidth = 1.25
      ctx!.beginPath(); ctx!.moveTo(0, oy + 0.5); ctx!.lineTo(W, oy + 0.5); ctx!.stroke()

      // Full trajectory, dashed.
      ctx!.setLineDash([3, 5]); ctx!.strokeStyle = c.muted; ctx!.lineWidth = 1
      ctx!.beginPath()
      for (let i = 0; i <= 80; i++) {
        const p = pos((T * i) / 80)
        if (i) ctx!.lineTo(X(p.x), Y(p.y)); else ctx!.moveTo(X(p.x), Y(p.y))
      }
      ctx!.stroke(); ctx!.setLineDash([])

      // Path travelled so far.
      ctx!.strokeStyle = c.accent; ctx!.lineWidth = 2
      ctx!.beginPath()
      const steps = Math.max(2, Math.ceil((80 * t) / T))
      for (let i = 0; i <= steps; i++) {
        const p = pos((t * i) / steps)
        if (i) ctx!.lineTo(X(p.x), Y(p.y)); else ctx!.moveTo(X(p.x), Y(p.y))
      }
      ctx!.stroke()

      // Stroboscope marks every 0.25 s.
      ctx!.fillStyle = c.accent
      for (let tt = 0; tt <= t + 1e-6; tt += 0.25) {
        const p = pos(tt)
        ctx!.beginPath(); ctx!.arc(X(p.x), Y(p.y), 2.2, 0, Math.PI * 2); ctx!.fill()
      }

      // H and R labels.
      ctx!.font = `11px ${c.mono}`
      ctx!.fillStyle = c.muted; ctx!.strokeStyle = c.muted; ctx!.lineWidth = 1
      ctx!.setLineDash([2, 3])
      ctx!.beginPath(); ctx!.moveTo(X(R / 2) + 0.5, oy); ctx!.lineTo(X(R / 2) + 0.5, Y(H)); ctx!.stroke()
      ctx!.setLineDash([])
      ctx!.textAlign = 'left'; ctx!.fillText(`H = ${H.toFixed(1)} m`, X(R / 2) + 6, Y(H / 2))
      ctx!.textAlign = 'right'; ctx!.fillText(`R = ${R.toFixed(1)} m`, X(R), oy + 16)
      ctx!.textAlign = 'left'; ctx!.fillText('O', ox - 14, oy + 16)

      // Body with velocity components.
      const p = pos(t)
      const vy = UY - G * t
      const px = X(p.x), py = Y(p.y), k = 2.2
      arrow(px, py, px + UX * k, py, c.muted, 1.25)
      arrow(px, py, px, py - vy * k, c.muted, 1.25)
      arrow(px, py, px + UX * k, py - vy * k, c.ink, 1.75)
      ctx!.fillStyle = c.surface; ctx!.strokeStyle = c.ink; ctx!.lineWidth = 2
      ctx!.beginPath(); ctx!.arc(px, py, 6, 0, Math.PI * 2); ctx!.fill(); ctx!.stroke()

      const set = (r: React.RefObject<HTMLElement | null>, v: string) => {
        if (r.current) r.current.textContent = v
      }
      set(readout.t, t.toFixed(2))
      set(readout.x, p.x.toFixed(1))
      set(readout.y, Math.max(0, p.y).toFixed(1))
      set(readout.v, Math.hypot(UX, vy).toFixed(1))
    }

    const still = T * 0.62
    size()
    draw(still)

    if (!reduce) {
      const slow = 0.55
      const hold = 1.4
      let start: number | null = null
      const loop = (now: number) => {
        if (start === null) start = now
        const elapsed = ((now - start) / 1000) * slow
        draw(Math.min(elapsed % (T + hold * slow), T))
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => {
      size()
      if (reduce) draw(still)
    })
    ro.observe(canvas)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onTheme = () => {
      colors = readColors()
      if (reduce) draw(still)
    }
    mq.addEventListener('change', onTheme)
    // The accent colour chosen in the console is applied to <html> after this first draw.
    const accentWatch = new MutationObserver(onTheme)
    accentWatch.observe(root, { attributes: true, attributeFilter: ['data-accent'] })
    document.fonts?.ready.then(onTheme)

    return () => {
      accentWatch.disconnect()
      cancelAnimationFrame(raf)
      ro.disconnect()
      mq.removeEventListener('change', onTheme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <figure className="lab" aria-label="Animated diagram of projectile motion">
      <canvas ref={canvasRef} />
      <div className="lab-head">
        <span>Fig. 1 — Projectile, u = 20 m/s, θ = 50°</span>
        <span>g = 9.8 m/s²</span>
      </div>
      <div className="lab-foot" aria-hidden="true">
        <span>t <b ref={readout.t}>0.00</b> s</span>
        <span>x <b ref={readout.x}>0.0</b> m</span>
        <span>y <b ref={readout.y}>0.0</b> m</span>
        <span>|v| <b ref={readout.v}>20.0</b> m/s</span>
      </div>
    </figure>
  )
}
