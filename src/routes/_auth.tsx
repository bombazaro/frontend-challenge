import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/api/session'

/** Layout sem path que protege checkout, pedidos, perfil, carteiras e favoritos. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: '/entrar', search: { redirect: location.href } })
    }
    return { user: session.user }
  },
  component: () => <Outlet />,
})
