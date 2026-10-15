import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/states'
import { WalletForm, walletToForm } from '@/components/profile/wallet-form'
import { useWallets } from '@/features/wallets'
import { useDocumentTitle } from '@/hooks/use-document-title'

export const Route = createFileRoute('/_auth/perfil/carteiras')({
  component: WalletsPage,
})

function WalletsPage() {
  useDocumentTitle('Carteiras')
  const wallets = useWallets()
  const [addingPrimary, setAddingPrimary] = useState(false)
  const [addingSecondary, setAddingSecondary] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  if (wallets.isError) return <ErrorState error={wallets.error} onRetry={() => wallets.refetch()} />
  if (!wallets.data)
    return (
      <div className="grid gap-5 md:grid-cols-2" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )

  const primary = wallets.data.find((w) => w.role === 'primary')
  const secondary = wallets.data.find((w) => w.role === 'secondary')
  // "Igual à carteira principal": reaproveita os dados de perfil (o endereço precisa ser outro)
  const copied = sameAsPrimary && primary ? { ...walletToForm(primary), address: '', nickname: 'Reserva' } : undefined

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="carteira-principal">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="carteira-principal" className="font-bold">
              Carteira principal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          {!primary && !addingPrimary && (
            <button type="button" className="font-bold text-accent hover:underline" onClick={() => setAddingPrimary(true)}>
              Adicionar
            </button>
          )}
        </div>
        {primary || addingPrimary ? (
          <WalletForm key={primary?.id ?? 'new-primary'} role="primary" wallet={primary} />
        ) : (
          <p className="text-sm text-muted-foreground">Você ainda não adicionou uma carteira principal.</p>
        )}
      </section>

      <section aria-labelledby="carteira-secundaria">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 id="carteira-secundaria" className="font-bold">
            Carteira secundária
          </h2>
          {!secondary && (
            <div className="flex items-center gap-4">
              {primary && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sameAsPrimary} onChange={(e) => (setSameAsPrimary(e.target.checked), setAddingSecondary(true))} className="size-4 accent-[var(--primary)]" />
                  Igual à carteira principal
                </label>
              )}
              {!addingSecondary && (
                <button type="button" className="font-bold text-accent hover:underline" onClick={() => setAddingSecondary(true)}>
                  Adicionar
                </button>
              )}
            </div>
          )}
        </div>
        {secondary || addingSecondary ? (
          <WalletForm key={secondary?.id ?? `new-secondary-${sameAsPrimary}`} role="secondary" wallet={secondary} initial={copied} onSaved={() => setSameAsPrimary(false)} />
        ) : (
          <p className="text-sm text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
        )}
      </section>
    </div>
  )
}
