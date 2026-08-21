/**
 * Host half of dock-images: the /dock-images JSON API (whole-file image
 * read with a size cap, returned as base64 + mime). Browser-trust fenced
 * like the /api gateway; conversation-scoped through the session cwd.
 * Wire / fence / fs helpers follow the same stripped pattern as dock-files
 * / dock-editor.
 *
 * Reads accept any absolute path — the conversation context can mention
 * images outside the session workspace (e.g. ~/.dsh/skills/...), and the
 * workbench viewers open them for viewing.
 */
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'

export const name = 'dock-images'

/** Services required before mounting. */
export const inject = ['webServer', 'sessions', 'webRuntime']

// ── Wire helpers (same envelope as the /desk-editor API) ─────────────────

type WbErrorCode = 'bad-request' | 'forbidden' | 'fs-error' | 'not-found' | 'internal' | 'too-large'

export class WbError extends Error {
  constructor(
    readonly code: WbErrorCode,
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

const MAX_BODY_BYTES = 1 << 20

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    total += buffer.length
    if (total > MAX_BODY_BYTES) throw new WbError('bad-request', 'request body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new WbError('bad-request', 'request body is not valid JSON')
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function writeOk(res: ServerResponse, value: unknown): void {
  writeJson(res, 200, { ok: true, value })
}

function writeError(res: ServerResponse, error: unknown): void {
  if (error instanceof WbError) {
    writeJson(res, error.status, { ok: false, error: { code: error.code, message: error.message } })
    return
  }
  const message = error instanceof Error ? error.message : String(error)
  writeJson(res, 500, { ok: false, error: { code: 'internal', message } })
}

function stringOrUndefined(payload: unknown, key: string): string | undefined {
  const value = (payload as Record<string, unknown> | null)?.[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function requireAbsolute(path: string): string {
  if (!path.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(path)) {
    throw new WbError('fs-error', `"${path}" is not an absolute path`, 400)
  }
  return path
}

/**
 * Resolve a caller-supplied absolute path for READING: no workspace
 * containment — viewers open images anywhere on the host, because the
 * conversation context can mention paths outside the session workspace.
 */
function resolveReadPath(raw: string): string {
  requireAbsolute(raw)
  return resolve(raw)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// ── Image read (whole file, base64, size-capped) ─────────────────────────

/** Cap for a single image read: 20 MiB keeps the data URL reasonable. */
const IMAGE_LIMIT_BYTES = 20 * 1024 * 1024

/** MIME type inferred from the file extension (lowercased, no dot). */
function mimeOfPath(path: string): string {
  const at = path.lastIndexOf('.')
  if (at === -1) return 'application/octet-stream'
  const ext = path.slice(at + 1).toLowerCase()
  switch (ext) {
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'bmp': return 'image/bmp'
    case 'svg': return 'image/svg+xml'
    case 'ico': return 'image/x-icon'
    case 'avif': return 'image/avif'
    default: return 'application/octet-stream'
  }
}

/** Whole-file read as base64; rejects files over the size cap up front. */
async function readImageBase64(path: string): Promise<{
  content: string
  mime: string
  size: number
}> {
  const info = await stat(path).catch((error) => {
    throw new WbError('fs-error', `cannot read "${path}": ${messageOf(error)}`, 400)
  })
  if (info.isDirectory()) {
    throw new WbError('fs-error', `"${path}" is a directory`, 400)
  }
  if (info.size > IMAGE_LIMIT_BYTES) {
    throw new WbError('too-large', `"${path}" is ${info.size} bytes, over the ${IMAGE_LIMIT_BYTES}-byte image limit`, 413)
  }
  const buffer = await readFile(path).catch((error) => {
    throw new WbError('fs-error', `cannot read "${path}": ${messageOf(error)}`, 400)
  })
  return { content: buffer.toString('base64'), mime: mimeOfPath(path), size: info.size }
}

// ── Trust fence (same as dock-files / dock-editor) ───────────────────────

function header(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}

function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function parseAuthority(authority: string): URL | undefined {
  try {
    return new URL(`http://${authority}`)
  } catch {
    return undefined
  }
}

function canonicalAuthority(entry: string, entryUrl: URL): string {
  const port = entryUrl.port !== '' ? entryUrl.port : new URL(`https://${entry}`).port
  return port === '' ? entryUrl.hostname : `${entryUrl.hostname}:${port}`
}

function isTrustedAuthority(hostUrl: URL, trustedHosts: readonly string[]): boolean {
  return trustedHosts.some((entry) => {
    const entryUrl = parseAuthority(entry)
    if (entryUrl === undefined) return false
    return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
      ? entryUrl.hostname === hostUrl.hostname
      : entryUrl.host === hostUrl.host
  })
}

function isTrustedRequest(request: IncomingMessage, trustedHosts: readonly string[]): boolean {
  const host = header(request.headers, 'host')
  if (host === undefined) return false
  const hostUrl = parseAuthority(host)
  if (hostUrl === undefined) return false
  if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false
  if (header(request.headers, 'sec-fetch-site') === 'cross-site') return false
  const origin = header(request.headers, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

// ── Plugin body ───────────────────────────────────────────────────────────

interface WbContext {
  webServer: {
    register(options: {
      kind: 'prefix'
      path: string
      handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
    }): () => void
  }
  sessions: {
    get(sessionId: string): { header: { cwd?: string } } | undefined
  }
  webRuntime: {
    trustedHosts: readonly string[]
  }
  effect(fn: () => void | (() => void), label?: string): void
}

function sessionCwdOf(ctx: WbContext, sessionId: string | undefined): string {
  if (sessionId !== undefined) {
    const cwd = ctx.sessions.get(sessionId)?.header.cwd
    if (cwd !== undefined && cwd !== '') return cwd
  }
  return process.cwd()
}

export function apply(ctx: WbContext): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/dock-images',
    handler: async (req, res) => {
      if (!isTrustedRequest(req, ctx.webRuntime.trustedHosts)) {
        writeJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'forbidden' } })
        return
      }
      if (req.method !== 'POST') {
        writeJson(res, 405, { ok: false, error: { code: 'bad-request', message: 'method not allowed' } })
        return
      }
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      const method = pathname.startsWith('/dock-images/') ? pathname.slice('/dock-images/'.length) : undefined
      if (method === undefined || method.includes('/')) {
        writeError(res, new WbError('not-found', `unknown /dock-images method "${method}"`, 404))
        return
      }
      try {
        const payload = await readJsonBody(req)
        if (method === 'read') {
          const sessionId = stringOrUndefined(payload, 'sessionId')
          const raw = stringOrUndefined(payload, 'path')
          if (raw === undefined) {
            writeError(res, new WbError('bad-request', 'read requires a "path"', 400))
            return
          }
          const cwd = sessionCwdOf(ctx, sessionId)
          const path = resolveReadPath(raw)
          const image = await readImageBase64(path)
          writeOk(res, { image, cwd })
          return
        }
        writeError(res, new WbError('not-found', `unknown /dock-images method "${method}"`, 404))
      } catch (error) {
        writeError(res, error)
      }
    },
  }), 'dock-images: /dock-images routes')
}
