import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { routeTree } from './routeTree.gen'
import { createQueryClient } from './lib/query-client'
import { sessionEvents, tokenStore } from './lib/http'
import { env } from './lib/env'
import { expireSession } from './features/session'
import { rememberLocation } from './lib/navigation-memory'
import { NotFound } from './components/common/not-found'
import './index.css'

const MockPanel = lazy(() => import('./mocks/panel'))

export const queryClient = createQueryClient()

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: () => <NotFound />,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

router.subscribe('onResolved', ({ toLocation }) => rememberLocation(toLocation.pathname, toLocation.href))

/** Sessão expirada (401 da API): limpa dados privados e leva ao login preservando o contexto. */
let handlingExpiry = false
sessionEvents.onExpired(() => {
  if (handlingExpiry || !tokenStore.get()) return
  handlingExpiry = true
  expireSession(queryClient)
  toast.error('Sua sessão expirou. Entre novamente para continuar de onde parou.')
  const { pathname, href } = router.state.location
  if (!pathname.startsWith('/entrar')) {
    router.navigate({ to: '/entrar', search: { redirect: href, motivo: 'expirada' } })
  }
  setTimeout(() => (handlingExpiry = false), 1_000)
})

export function bootstrap() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {env.enableMocks && (
          <Suspense fallback={null}>
            <MockPanel />
          </Suspense>
        )}
      </QueryClientProvider>
    </StrictMode>,
  )
}
