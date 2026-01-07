const API_BASE = import.meta.env.VITE_API_BASE || ''

interface RequestOptions extends RequestInit {
  mockResponse?: unknown
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`
  const { mockResponse, headers, ...rest } = options

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      ...rest,
    })

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }

    return (await res.json()) as T
  } catch (err) {
    if (mockResponse) {
      console.warn(`Using mock for ${path} after failure`, err)
      return mockResponse as T
    }
    throw err
  }
}

export function postJson<T>(path: string, body: unknown, options?: RequestOptions) {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  })
}


