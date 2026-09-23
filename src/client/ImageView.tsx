import { createElement, useEffect, useState, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import type { ViewProps } from './contract.ts'

interface OpenSeed {
  path?: string
  title?: string
}

interface ReadResponse {
  ok: boolean
  value?: { image: { content: string; mime: string; size: number } }
  error?: { code: string; message: string }
}

interface Transform {
  scale: number
  rotation: number
  x: number
  y: number
}

const INITIAL_TRANSFORM: Transform = { scale: 1, rotation: 0, x: 0, y: 0 }
const MIN_SCALE = 0.1
const MAX_SCALE = 8

const INLINE = {
  wrap: { padding: '12px 16px', height: '100%', boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column' as const },
  head: { display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--dsw-alias-border-l2, #d8dbe0)', marginBottom: 10, fontSize: 12, color: 'var(--dsw-alias-label-secondary, #656d76)' } as const,
  title: { fontWeight: 600, color: 'var(--dsw-alias-label-primary, #1f2328)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginLeft: 8, flex: 1 },
  meta: { fontSize: 11, marginRight: 6 },
  toolbar: { display: 'flex', alignItems: 'center', gap: 4 },
  button: { border: '1px solid var(--dsw-alias-border-l2, #d8dbe0)', borderRadius: 4, background: 'var(--dsw-alias-fill-control, transparent)', color: 'var(--dsw-alias-label-primary, #1f2328)', cursor: 'pointer', fontSize: 14, lineHeight: '20px', minWidth: 26, height: 24, padding: '0 5px' } as const,
  stage: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' as const, touchAction: 'none' as const, userSelect: 'none' as const },
  img: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const, willChange: 'transform' as const, pointerEvents: 'none' as const },
  err: { color: '#d1242f', fontSize: 13 },
  empty: { color: 'var(--dsw-alias-label-secondary, #656d76)', fontSize: 13 },
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export function ImageView(props: ViewProps): ReactNode {
  const { sessionId, seed } = props
  const openSeed = (seed ?? {}) as OpenSeed
  const path = openSeed.path
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [size, setSize] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [transform, setTransform] = useState<Transform>(INITIAL_TRANSFORM)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setTransform(INITIAL_TRANSFORM)
    setDragging(false)
    if (path === undefined) return
    let cancelled = false
    setDataUrl(null)
    setSize(0)
    setError(null)
    void (async () => {
      try {
        const response = await fetch('/dock-images/read', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, path }),
        })
        const json = (await response.json()) as ReadResponse
        if (json.ok !== true || json.value === undefined) throw new Error(json.error?.message ?? 'read failed')
        if (cancelled) return
        const image = json.value.image
        setDataUrl(`data:${image.mime};base64,${image.content}`)
        setSize(image.size)
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
    return () => { cancelled = true }
  }, [path, sessionId])

  const zoom = (factor: number) => setTransform((current) => ({ ...current, scale: clampScale(current.scale * factor) }))
  const rotate = (degrees: number) => setTransform((current) => ({ ...current, rotation: current.rotation + degrees }))
  const reset = () => setTransform(INITIAL_TRANSFORM)

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setTransform((current) => ({ ...current, x: current.x + event.movementX, y: current.y + event.movementY }))
  }

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
  }

  const title = openSeed.title ?? path?.split('/').pop() ?? 'No image'
  const sizeText = size > 0 ? `${(size / 1024).toFixed(1)} KiB` : ''
  const imageStyle = {
    ...INLINE.img,
    cursor: dragging ? 'grabbing' : 'grab',
    transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
  }

  return createElement('div', { style: INLINE.wrap },
    createElement('div', { style: INLINE.head },
      createElement('span', { style: INLINE.title, title: path }, title),
      sizeText !== '' ? createElement('span', { style: INLINE.meta }, sizeText) : null,
      createElement('div', { style: INLINE.toolbar, 'aria-label': 'Image controls' },
        createElement('button', { type: 'button', style: INLINE.button, onClick: () => rotate(-90), title: 'Rotate counterclockwise', 'aria-label': 'Rotate counterclockwise' }, '↶'),
        createElement('button', { type: 'button', style: INLINE.button, onClick: () => rotate(90), title: 'Rotate clockwise', 'aria-label': 'Rotate clockwise' }, '↷'),
        createElement('button', { type: 'button', style: INLINE.button, onClick: reset, title: 'Reset image', 'aria-label': 'Reset image' }, '↺'),
      ),
    ),
    error !== null
      ? createElement('div', { style: INLINE.err }, error)
      : dataUrl === null
        ? createElement('div', { style: INLINE.empty }, 'Reading…')
        : createElement('div', {
          style: INLINE.stage,
          onWheel,
          onPointerDown,
          onPointerMove,
          onPointerUp: stopDragging,
          onPointerCancel: stopDragging,
        },
        createElement('img', { style: imageStyle, src: dataUrl, alt: title, draggable: false }),
      ),
  )
}
