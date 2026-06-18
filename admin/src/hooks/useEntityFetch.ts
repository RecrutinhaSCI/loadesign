import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useEntityFetch — chama store.fetch() ao montar.
// Idempotente: store.fetch() guarda flag `loaded` para não buscar de novo.
// ─────────────────────────────────────────────────────────────────────────────

interface StoreWithFetch {
  fetch: () => Promise<void>
}

export function useEntityFetch(...stores: StoreWithFetch[]) {
  useEffect(() => {
    stores.forEach((s) => { void s.fetch() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
