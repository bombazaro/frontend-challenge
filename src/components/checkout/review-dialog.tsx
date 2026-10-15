import { AlertTriangle } from 'lucide-react'
import type { Quote, Wallet } from '@/contracts/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Eth } from '@/components/common/eth'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/labels'
import { shortAddress } from '@/lib/utils'

/**
 * Revisão antes do envio. Se a cotação mudar enquanto o diálogo está aberto (evento em tempo real
 * ou resposta 409 QUOTE_STALE), a confirmação fica bloqueada até o usuário aceitar os novos valores.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  quote,
  changed,
  wallet,
  onAcceptChanges,
  onConfirm,
  submitting,
  quoteLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | undefined
  changed: boolean
  wallet: Wallet | undefined
  onAcceptChanges: () => void
  onConfirm: () => void
  submitting: boolean
  quoteLoading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-xl" aria-describedby="revisao-desc">
        <DialogTitle>Revise seu pedido</DialogTitle>
        <DialogDescription id="revisao-desc">Confira itens, rede, carteira e valores antes de confirmar a compra.</DialogDescription>
        {!quote ? (
          <p role="status">Atualizando valores…</p>
        ) : (
          <>
            {changed && (
              <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  Preço, disponibilidade ou taxas mudaram desde a sua revisão. Confira os novos valores para continuar.
                </p>
                <Button size="sm" variant="outline" onClick={onAcceptChanges} disabled={!quote.purchasable || quoteLoading} className="self-start">
                  Revisar novos valores
                </Button>
              </div>
            )}
            <ul className="flex flex-col gap-2 text-sm" aria-label="Itens do pedido">
              {quote.lines.map((l) => (
                <li key={l.cartItemId} className="flex items-center justify-between gap-3">
                  <span>
                    {l.name} <span className="text-muted-foreground">({l.editionLabel}) × {l.quantity}</span>
                  </span>
                  <Eth value={l.lineTotal} className="font-bold text-accent" />
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
              <dt>Subtotal</dt>
              <dd className="text-right"><Eth value={quote.subtotal} /></dd>
              <dt>Desconto</dt>
              <dd className="text-right">(-) <Eth value={quote.discount} /></dd>
              <dt>Taxa de rede ({NETWORK_LABELS[quote.network]})</dt>
              <dd className="text-right"><Eth value={quote.networkFee} /></dd>
              <dt className="font-bold">Total</dt>
              <dd className="text-right text-lg font-bold text-accent" data-testid="review-total"><Eth value={quote.total} minDecimals={3} /></dd>
            </dl>
            {wallet && (
              <p className="text-xs text-muted-foreground">
                Pagamento com {PROVIDER_LABELS[wallet.provider]} ({shortAddress(wallet.address)}) na rede {NETWORK_LABELS[quote.network]}.
              </p>
            )}
            {!quote.purchasable && (
              <p role="alert" className="text-sm text-destructive">
                Há itens indisponíveis. Volte ao carrinho para ajustar.
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                Voltar
              </Button>
              <Button onClick={onConfirm} disabled={changed || submitting || quoteLoading || !quote.purchasable} aria-describedby={changed ? undefined : 'revisao-desc'}>
                {submitting ? 'Enviando pedido…' : 'Confirmar compra'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
