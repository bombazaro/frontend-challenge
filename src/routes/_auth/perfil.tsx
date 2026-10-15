import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Download, Heart, LifeBuoy, LogOut, MapPin, ShoppingCart, Tag, User } from 'lucide-react'
import { toast } from 'sonner'
import { notAvailable } from '@/components/common/not-available'
import { useLogout } from '@/features/session'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_auth/perfil')({
  component: ProfileLayout,
})

const linkCls = 'flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-sm text-accent hover:bg-surface-2'

function ProfileLayout() {
  const logout = useLogout()
  const navigate = useNavigate()
  const soon = [
    { label: 'Atividade', icon: ShoppingCart },
    { label: 'Ofertas', icon: Tag },
    { label: 'Arquivos baixados', icon: Download },
    { label: 'Suporte', icon: LifeBuoy },
  ]
  return (
    <div className="page-container grid gap-8 pt-8 lg:grid-cols-[310px_1fr]">
      <aside className="self-start bg-surface pb-1">
        <h1 className="px-3 pb-2 pt-4 text-lg font-bold">Meu perfil</h1>
        <nav aria-label="Menu do perfil">
          <ul>
            <li>
              <Link to="/perfil" activeOptions={{ exact: true }} className={linkCls} activeProps={{ className: cn(linkCls, '!border-primary font-bold'), 'aria-current': 'page' }}>
                <User className="size-4" aria-hidden /> Dados do perfil
              </Link>
            </li>
            <li>
              <Link to="/perfil/carteiras" className={linkCls} activeProps={{ className: cn(linkCls, '!border-primary font-bold'), 'aria-current': 'page' }}>
                <MapPin className="size-4" aria-hidden /> Carteiras
              </Link>
            </li>
            <li>
              <Link to="/perfil/favoritos" className={linkCls} activeProps={{ className: cn(linkCls, '!border-primary font-bold'), 'aria-current': 'page' }}>
                <Heart className="size-4" aria-hidden /> Lista de interesse
              </Link>
            </li>
            {soon.map(({ label, icon: Icon }) => (
              <li key={label}>
                <button type="button" className={cn(linkCls, 'w-full opacity-70')} onClick={() => notAvailable(label)}>
                  <Icon className="size-4" aria-hidden /> {label}
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">em breve</span>
                </button>
              </li>
            ))}
            <li className="border-t border-border">
              <button
                type="button"
                className={cn(linkCls, 'w-full font-bold')}
                disabled={logout.isPending}
                onClick={() =>
                  logout.mutate(undefined, {
                    onSettled: () => {
                      toast.success('Você saiu da sua conta.')
                      navigate({ to: '/' })
                    },
                  })
                }
              >
                <LogOut className="size-4" aria-hidden /> Sair
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  )
}
