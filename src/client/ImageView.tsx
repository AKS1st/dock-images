/**
 * Image view: renders the image file carried by the open seed as a data URL.
 * The whole file is fetched as base64 through the /dock-images/read host
 * route (size-capped at 20 MiB on the host), then shown centered with
 * contain-fit sizing inside the floating window. Errors surface with the
 * same inline styling as the editor view.
 */
import { createElement, useEffect, useState, type ReactNode } from 'react'
import type { ViewProps } from './contract.ts'

/** The seed shape the file domain dispatches (EditorOpenSeed). */
interface OpenSeed {
  path?: string
  title?: string
}

/** The /dock-images/read response envelope (same as the host wire). */
interface ReadResponse {
  ok: boolean
  value?: { image: { content: string; mime: string; size: number } }
  error?: { code: string; message: string }
}

const INLINE = {
  wrap: { padding: '12px 16px', height: '100%', boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column' as const },
  head: { display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--dsw-alias-border-l2, #d8dbe0)', marginBottom: 10, fontSize: 12, color: 'var(--dsw-alias-label-secondary, #656d76)' } as const,
  title: { fontWeight: 600, color: 'var(--dsw-alias-label-primary, #1f2328)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginLeft: 8, flex: 1 },
  meta: { fontSize: 11 },
  stage: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' as const },
  img: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const },
  err: { color: '#d1242f', fontSize: 13 },
  empty: { color: 'var(--dsw-alias-label-secondary, #656d76)', fontSize: 13 },
}

export function ImageView(props: ViewProps): ReactNode {
  const { sessionId, seed } = props
  const openSeed = (seed ?? {}) as OpenSeed
  const path = openSeed.path

  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [size, setSize] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Load the image when the seed path changes.
  useEffect(() => {
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
        if (json.ok !== true || json.value === undefined) {
          throw new Error(json.error?.message ?? 'read failed')
        }
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

  const title = openSeed.title ?? path?.split('/').pop() ?? 'No image'
  const sizeText = size > 0 ? `${(size / 1024).toFixed(1)} KiB` : ''

  return createElement('div', { style: INLINE.wrap },
    createElement('div', { style: INLINE.head },
      createElement('span', { style: INLINE.title, title: path }, title),
      sizeText !== ''
        ? createElement('span', { style: INLINE.meta }, sizeText)
        : null,
    ),
    error !== null
      ? createElement('div', { style: INLINE.err }, error)
      : dataUrl === null
        ? createElement('div', { style: INLINE.empty }, 'Reading…')
        : createElement('div', { style: INLINE.stage },
          createElement('img', { style: INLINE.img, src: dataUrl, alt: title, draggable: false }),
        ),
  )
}
