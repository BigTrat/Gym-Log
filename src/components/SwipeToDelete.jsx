import { useEffect, useRef, useState } from 'react'

const REVEAL = 72   // px width of the red delete button
const THRESHOLD = 40 // px past which the card snaps open

export function SwipeToDelete({ children, onDelete, as: Tag = 'div', className = '' }) {
  const [offset, setOffset] = useState(0)
  const [springing, setSpringing] = useState(false)
  // Keep mutable state in a ref so event handlers never go stale
  const s = useRef({ offset: 0, touch: null })
  const contentRef = useRef(null)

  function snapTo(x) {
    s.current.offset = x
    setSpringing(true)
    setOffset(x)
  }

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    function onStart(e) {
      s.current.touch = {
        x0: e.touches[0].clientX,
        y0: e.touches[0].clientY,
        startOffset: s.current.offset,
        axis: null,
        moved: false,
      }
      setSpringing(false)
    }

    function onMove(e) {
      const t = s.current.touch
      if (!t) return
      const dx = e.touches[0].clientX - t.x0
      const dy = e.touches[0].clientY - t.y0
      // Determine gesture axis on first significant movement
      if (t.axis === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        t.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }
      if (t.axis !== 'x') return
      e.preventDefault() // requires passive:false — stops page scroll during horizontal swipe
      t.moved = true
      const next = Math.max(-REVEAL, Math.min(0, t.startOffset + dx))
      s.current.offset = next
      setOffset(next)
    }

    function onEnd() {
      const t = s.current.touch
      if (t?.axis === 'x' && t.moved) {
        snapTo(s.current.offset < -THRESHOLD ? -REVEAL : 0)
      }
      s.current.touch = null
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [])

  return (
    <Tag className={`relative overflow-hidden ${className}`}>
      {/* Delete button sitting behind the card */}
      <button
        tabIndex={-1}
        aria-label="Delete"
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-red-500 text-white"
        style={{ width: REVEAL }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
        </svg>
        <span className="text-[10px] font-semibold">Delete</span>
      </button>

      {/* Transparent overlay over the visible content while open.
          Intercepts taps so they close the swipe instead of activating content. */}
      {offset < 0 && (
        <div
          className="absolute inset-y-0 left-0 z-10"
          style={{ right: `${-offset}px` }}
          onClick={(e) => { e.stopPropagation(); snapTo(0) }}
        />
      )}

      {/* Swipeable foreground layer */}
      <div
        ref={contentRef}
        style={{
          transform: `translateX(${offset}px)`,
          transition: springing ? 'transform 0.22s ease' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </Tag>
  )
}
