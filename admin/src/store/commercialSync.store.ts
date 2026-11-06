import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
// Sincronização entre módulos do fluxo comercial.
// Toda mutação confirmada pela API chama `bumpCommercial()`; todas as telas
// que usam `useApiData` recarregam do backend (fonte única de verdade), sem
// precisar recarregar a página e sem estado duplicado no navegador.
// ─────────────────────────────────────────────────────────────────────────────

interface SyncState { version: number; bump: () => void }

export const useCommercialSync = create<SyncState>()((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}))

export const bumpCommercial = () => useCommercialSync.getState().bump()

export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const version = useCommercialSync((s) => s.version)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const load = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    try {
      const result = await fetcher()
      if (id === seq.current) { setData(result); setError(null) }
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      if (id === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { void load() }, [load, version])

  return { data, loading, error, reload: load }
}

/**
 * Executa uma mutação uma única vez por vez (bloqueia cliques repetidos),
 * mostra sucesso só após a confirmação da API e sincroniza as telas.
 */
export function useMutation() {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const run = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    if (lock.current) return undefined
    lock.current = true
    setBusy(true)
    try {
      const r = await fn()
      bumpCommercial()
      return r
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  return { busy, run }
}
