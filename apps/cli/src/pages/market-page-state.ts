export interface PageLoadSuccess<T> {
  ok: true
  data: T
}

export interface PageLoadFailure {
  ok: false
  error: string
}

export type PageLoadResult<T> = PageLoadSuccess<T> | PageLoadFailure

export async function loadPageData<T>(loader: () => Promise<T>): Promise<PageLoadResult<T>> {
  try {
    const data = await loader()
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown error'
    }
  }
}

