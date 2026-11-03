import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { APP_VERSION } from '@/lib/version'

export const QUERY_CACHE_KEY = 'rn-query-cache'

/**
 * Cache dos dados no celular: ao abrir o app as telas aparecem na hora com o
 * que já foi carregado e são atualizadas em segundo plano.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
      networkMode: 'offlineFirst',
    },
  },
})

function storage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

export const queryPersister = createSyncStoragePersister({
  storage: storage(),
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
})

export const persistOptions = {
  persister: queryPersister,
  maxAge: 24 * 60 * 60 * 1000,
  // versão nova do app descarta o cache antigo
  buster: APP_VERSION,
}

/** Apaga os dados guardados (ao sair da conta). */
export function clearPersistedCache() {
  try {
    window.localStorage.removeItem(QUERY_CACHE_KEY)
  } catch {
    /* sem armazenamento disponível */
  }
}
