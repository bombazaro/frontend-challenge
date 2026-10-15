import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Heart, Home, ScanSearch, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusCatalogSearch } from './header'

const item = 'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] text-foreground'

/** Barra inferior do layout mobile (Figma: Mobile / Início). */
export function MobileNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p))
  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="relative mx-auto flex max-w-md items-stretch rounded-t-3xl bg-surface px-2 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        <Link to="/" className={cn(item, active('/') && 'text-accent')} aria-current={active('/') ? 'page' : undefined}>
          <Home className="size-5" aria-hidden />
          Início
        </Link>
        <Link to="/perfil/favoritos" className={cn(item, active('/perfil/favoritos') && 'text-accent')}>
          <Heart className="size-5" aria-hidden />
          Favoritos
        </Link>
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label="Explorar coleções"
            onClick={() => (pathname === '/' ? focusCatalogSearch() : navigate({ to: '/' }).then(focusCatalogSearch))}
            className="-mt-6 flex size-16 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground"
          >
            <ScanSearch className="size-7" aria-hidden />
          </button>
        </div>
        <Link to="/carrinho" className={cn(item, active('/carrinho') && 'text-accent')}>
          <ShoppingCart className="size-5" aria-hidden />
          Carrinho
        </Link>
        <Link to="/perfil" className={cn(item, active('/perfil') && !active('/perfil/favoritos') && 'text-accent')}>
          <User className="size-5" aria-hidden />
          Perfil
        </Link>
      </div>
    </nav>
  )
}
