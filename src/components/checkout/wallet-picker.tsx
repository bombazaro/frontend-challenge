import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Plug, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import type { Network, Wallet } from '@/contracts/api'
import { Button } from '@/components/ui/button'
import { WalletsStrip } from '@/components/layout/footer'
import { useWalletConnection } from '@/features/wallets'
import { errorMessage } from '@/lib/api-error'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/labels'
import { cn, shortAddress } from '@/lib/utils'
import { announce } from '@/realtime/announcer'

/** Seleção de carteira cadastrada + simulação de conexão, recusa e desconexão. */
export function WalletPicker({
  wallets,
  selectedId,
  onSelect,
  network,
}: {
  wallets: Wallet[]
  selectedId: string | null
  onSelect: (id: string) => void
  network: Network
}) {
  const { connect, disconnect } = useWalletConnection()

  if (!wallets.length) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-sm">
        <p>Você ainda não cadastrou carteiras.</p>
        <Link to="/perfil/carteiras" className="mt-2 inline-block font-bold text-accent hover:underline">
          Cadastrar carteira
        </Link>
      </div>
    )
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 w-full text-center font-bold">Carteira e rede</legend>
      <div className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
        <WalletsStrip />
      </div>
      {wallets.map((w) => {
        const selected = w.id === selectedId
        const connected = w.connectedNetwork === network
        const pending = (connect.isPending && connect.variables?.walletId === w.id) || (disconnect.isPending && disconnect.variables === w.id)
        return (
          <div key={w.id} className={cn('rounded-md border p-4', selected ? 'border-primary' : 'border-border')} data-testid={`wallet-${w.role}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="wallet" checked={selected} onChange={() => onSelect(w.id)} className="mt-1 size-4 accent-[var(--primary)]" />
              <span className="flex-1">
                <span className="block font-bold">
                  {w.nickname} · {PROVIDER_LABELS[w.provider]}
                </span>
                <span className="block text-xs text-muted-foreground">{w.secondaryAddress || shortAddress(w.address)}</span>
                <span className="block text-xs text-muted-foreground">
                  {w.role === 'primary' ? 'Carteira principal' : 'Carteira secundária'} · Rede {NETWORK_LABELS[w.network]}
                </span>
              </span>
              {connected && (
                <span className="flex items-center gap-1 text-xs font-bold text-success">
                  <CheckCircle2 className="size-4" aria-hidden /> Conectada
                </span>
              )}
            </label>
            {selected && (
              <div className="mt-3 flex justify-end">
                {connected ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      disconnect.mutate(w.id, {
                        onSuccess: () => announce('Carteira desconectada'),
                        onError: (e) => toast.error(errorMessage(e)),
                      })
                    }
                  >
                    <Unplug className="size-4" aria-hidden /> Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      connect.mutate(
                        { walletId: w.id, network },
                        {
                          onSuccess: () => {
                            toast.success(`${PROVIDER_LABELS[w.provider]} conectada na ${NETWORK_LABELS[network]}`)
                            announce('Carteira conectada')
                          },
                          onError: (e) => {
                            toast.error(errorMessage(e))
                            announce(`Falha ao conectar: ${errorMessage(e)}`)
                          },
                        },
                      )
                    }
                  >
                    {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plug className="size-4" aria-hidden />}
                    {pending ? 'Conectando…' : `Conectar na ${NETWORK_LABELS[network]}`}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
