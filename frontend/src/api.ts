import { withPageDefaults, type Content, type PageContent } from './types'

const TOKEN_KEY = 'pbk_admin_token'

/** Built as plain files (GitHub Pages). */
const FILES_BUILD = import.meta.env.VITE_STATIC === '1'
/** Optional address of the server, for a files build that should still use the live API and console. */
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
/** True when there is no server at all: content comes from content.json and there is no console. */
export const STATIC_SITE = FILES_BUILD && !API_URL

const apiUrl = (path: string) => `${API_URL}/api${path}`
export const AUTH_EXPIRED = 'pbk-auth-expired'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const auth = {
  get(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage blocked: token lives only for this page load */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

/** Turn FastAPI's error body into one readable sentence. */
function readError(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] as { msg?: string; loc?: unknown[] }
      const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : ''
      const msg = (first.msg ?? '').replace(/^Value error, /, '')
      return field && !msg.toLowerCase().includes(field) ? `${field.replace(/_/g, ' ')}: ${msg}` : msg
    }
  }
  return fallback
}

export async function api<T>(path: string, init: RequestInit & { admin?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (init.admin) {
    const token = auth.get()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  let res: Response
  try {
    res = await fetch(apiUrl(path), { ...init, headers })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    if (res.status === 401 && init.admin) {
      auth.clear()
      window.dispatchEvent(new Event(AUTH_EXPIRED))
    }
    throw new ApiError(res.status, readError(body, `Request failed (${res.status}).`))
  }
  return body as T
}

export const json = (data: unknown) => JSON.stringify(data)

/** Fetch something that is not JSON (a CSV export) with the admin token, and save it as a file. */
export async function download(path: string, filename: string) {
  let res: Response
  try {
    res = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${auth.get() ?? ''}` } })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }
  if (res.status === 401) {
    auth.clear()
    window.dispatchEvent(new Event(AUTH_EXPIRED))
  }
  if (!res.ok) throw new ApiError(res.status, 'Download failed. Try again.')
  saveBlob(await res.blob(), filename)
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Where the site is served from, without a trailing slash ("" at the domain root). */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** A link typed in the console, if it is a kind a visitor can safely follow; otherwise nothing. */
export function safeHref(url: string): string | undefined {
  const u = url.trim()
  return /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(u) ? u : undefined
}

/** Turn a stored image path into one the browser can load from this page. */
export function assetUrl(url: string): string {
  if (url.startsWith('/api/')) return API_URL + url
  if (url.startsWith('/') && !url.startsWith('//')) return BASE + url
  return url
}

type Raw = Omit<Content, 'page'> & { page?: Partial<PageContent> | null }
const normalise = (raw: Raw): Content => ({ ...raw, page: withPageDefaults(raw.page) })

/** Content the server wrote into the page itself, so the first paint already has the real text. */
export function embeddedContent(): Content | null {
  try {
    const el = document.getElementById('pbk-content')
    return el?.textContent ? normalise(JSON.parse(el.textContent) as Raw) : null
  } catch {
    return null
  }
}

async function bundledContent(): Promise<Content> {
  const res = await fetch(`${import.meta.env.BASE_URL}content.json`).catch(() => null)
  if (!res?.ok) throw new ApiError(res?.status ?? 0, 'Could not load the page details. Try refreshing.')
  return normalise((await res.json()) as Raw)
}

export async function loadContent(): Promise<Content> {
  if (STATIC_SITE) return bundledContent()
  try {
    return normalise(await api<Raw>('/content'))
  } catch (err) {
    // A files-only build that points at a server: if the server is asleep or down, show the bundled copy.
    if (FILES_BUILD) return bundledContent()
    throw err
  }
}
