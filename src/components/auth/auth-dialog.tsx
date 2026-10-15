import type { ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { notAvailable } from '@/components/common/not-available'
import { Hero } from '@/components/catalog/hero'
import { cn } from '@/lib/utils'
import { getLastPublicHref, isPrivatePath } from '@/lib/navigation-memory'

/** Aceita apenas caminhos internos para evitar open redirect. */
export function safeRedirect(redirect?: string) {
  return redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
}

/** Destino ao fechar sem autenticar: páginas privadas reabririam o login, então volta à última página pública. */
function closeTarget(redirect?: string) {
  const target = safeRedirect(redirect)
  return isPrivatePath(target) ? getLastPublicHref() : target
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export function SocialButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs" aria-hidden>
        <span className="h-px flex-1 bg-border" /> Ou continue com <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="subtle" className="bg-transparent text-xs font-medium" onClick={() => notAvailable('O login com Google')}>
        <GoogleIcon /> Continuar com Google
      </Button>
      <Button type="button" variant="subtle" className="bg-transparent text-xs font-medium" onClick={() => notAvailable('O login com Facebook')}>
        <span className="text-lg font-bold text-[#4f7bd9]" aria-hidden>
          f
        </span>
        Continuar com Facebook
      </Button>
    </div>
  )
}

export function AuthDialog({
  mode,
  redirect,
  description,
  children,
}: {
  mode: 'login' | 'register'
  redirect?: string
  description: string
  children: ReactNode
}) {
  const router = useRouter()
  const tab = 'text-lg md:text-xl'
  return (
    <>
      {/* Fundo decorativo (home), inerte enquanto o diálogo estiver aberto */}
      <div inert aria-hidden className="hidden md:block">
        <Hero />
      </div>
      <Dialog open onOpenChange={(open) => !open && router.history.push(closeTarget(redirect))}>
        <DialogContent
          className={cn(
            'max-w-[500px] gap-6 px-6 py-10 md:px-20',
            'max-md:inset-0 max-md:h-dvh max-md:max-h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:border-b-0 max-md:bg-background',
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            document.querySelector<HTMLInputElement>('[data-autofocus]')?.focus()
          }}
        >
          <p className="text-center text-3xl font-bold tracking-[0.15em] md:hidden" aria-hidden>
            KURIO
          </p>
          <DialogTitle className="flex items-center justify-center gap-2 text-center">
            {mode === 'login' ? (
              <>
                <span className={cn(tab, 'text-accent')}>Entrar</span>
                <span aria-hidden className="h-6 w-px bg-primary" />
                <Link to="/cadastro" search={{ redirect }} className={cn(tab, 'font-normal hover:text-accent')}>
                  Criar conta
                </Link>
              </>
            ) : (
              <>
                <Link to="/entrar" search={{ redirect }} className={cn(tab, 'font-normal hover:text-accent')}>
                  Entrar
                </Link>
                <span aria-hidden className="h-6 w-px bg-primary" />
                <span className={cn(tab, 'text-accent')}>Criar conta</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-foreground">{description}</DialogDescription>
          {children}
        </DialogContent>
      </Dialog>
    </>
  )
}
