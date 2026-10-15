import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApplyCoupon, useCart, useRemoveCoupon } from '@/features/cart'
import { errorMessage, toApiError } from '@/lib/api-error'
import { announce } from '@/realtime/announcer'

/** Aplicar/remover cupom: o servidor valida (inválido/expirado) e devolve o carrinho atualizado. */
export function CouponForm() {
  const cart = useCart()
  const apply = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const coupon = cart.data?.coupon

  if (coupon) {
    return (
      <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-primary/60 px-3 py-2 text-sm">
        <p>
          Cupom <strong className="text-accent">{coupon.code}</strong>
          <span className="block text-xs text-muted-foreground">{coupon.description}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={() => removeCoupon.mutate(undefined, { onSuccess: () => announce('Cupom removido') })} disabled={removeCoupon.isPending} aria-label={`Remover cupom ${coupon.code}`}>
          <X className="size-4" aria-hidden /> Remover
        </Button>
      </div>
    )
  }

  return (
    <form
      className="mt-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!code.trim()) return setError('Informe um código promocional')
        apply.mutate(code, {
          onSuccess: () => {
            setError(null)
            setCode('')
            toast.success('Cupom aplicado')
            announce('Cupom aplicado')
          },
          onError: (err) => setError(toApiError(err).fieldErrors.code ?? errorMessage(err)),
        })
      }}
    >
      <label htmlFor="cupom" className="mb-2 block text-sm font-bold">
        Código promocional
      </label>
      <div className="flex">
        <Input
          id="cupom"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código promocional..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'cupom-erro' : undefined}
          className="h-10 rounded-r-none border-primary text-xs"
        />
        <Button type="submit" disabled={apply.isPending} className="rounded-l-none">
          {apply.isPending ? '...' : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p id="cupom-erro" role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
