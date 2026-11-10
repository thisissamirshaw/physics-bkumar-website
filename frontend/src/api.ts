const TOKEN_KEY = 'pbk_admin_token'
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
    res = await fetch(`/api${path}`, { ...init, headers })
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
