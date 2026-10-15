import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notAvailable } from '@/components/common/not-available'
import { useCart } from '@/features/cart'
import { useSession } from '@/features/session'
import { cn } from '@/lib/utils'

const navItem = 'relative py-2 text-sm md:text-base transition-colors hover:text-accent'
const activeBar = 'text-accent font-bold after:absolute after:inset-x-0 after:-bottom-[14px] after:h-0.5 after:bg-primary'

export function focusCatalogSearch() {
  requestAnimationFrame(() => {
    const input = document.getElementById('busca-catalogo') as HTMLInputElement | null
    input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    input?.focus()
  })
}

export function UserAvatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" className={cn('size-8 rounded-full object-cover', className)} />
  ) : (
    <span aria-hidden className={cn('flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground', className)}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Header() {
  const { pathname, href } = useLocation()
  const navigate = useNavigate()
  const { user } = useSession()
  const cart = useCart()
  const count = cart.data?.itemCount ?? 0
  const isHome = pathname === '/'
  const isMarket = pathname.startsWith('/nft') || pathname.startsWith('/carrinho') || pathname.startsWith('/pagamento')

  return (
    <header className="page-container hidden md:block">
      <div className="flex h-16 items-center justify-between gap-4 border-b border-border md:h-[68px]">
        <Link to="/" className="text-sm font-bold tracking-[0.2em]" aria-label="Kurio — página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-10">
            <li>
              <Link to="/" className={cn(navItem, isHome && activeBar)} aria-current={isHome ? 'page' : undefined}>
                Início
              </Link>
            </li>
            <li>
              <Link to="/" hash="catalogo" className={cn(navItem, isMarket && activeBar)}>
                Mercado
              </Link>
            </li>
            <li>
              <button type="button" className={navItem} onClick={() => notAvailable('A página de criadores')}>
                Criadores
              </button>
            </li>
            <li>
              <button type="button" className={navItem} onClick={() => notAvailable('A área Aprenda')}>
                Aprenda
              </button>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-3 md:gap-5">
          <button
            type="button"
            aria-label="Buscar NFTs"
            className="rounded-sm p-1.5 hover:text-accent"
            onClick={() => {
              if (!isHome) navigate({ to: '/' }).then(focusCatalogSearch)
              else focusCatalogSearch()
            }}
          >
            <Search className="size-6" aria-hidden />
          </button>
          <Link to="/carrinho" className="relative rounded-sm p-1.5 hover:text-accent" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
            <ShoppingCart className="size-6" aria-hidden />
            {count > 0 && (
              <span aria-hidden className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <Link to="/perfil" className="hidden items-center gap-2 rounded-md px-2 py-1 hover:bg-surface md:flex" aria-label={`Perfil de ${user.displayName}`}>
              <UserAvatar name={user.displayName} url={user.avatarUrl} />
              <span className="max-w-32 truncate text-sm">{user.displayName}</span>
            </Link>
          ) : (
            <Button asChild size="sm" className="h-9 px-3 text-base font-medium">
              <Link to="/entrar" search={{ redirect: href }}>
                <LogIn className="size-5" aria-hidden />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
