import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { NETWORKS, type Network } from '@/contracts/api'
import { collectorSchema, type CollectorForm } from '@/contracts/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Eth } from '@/components/common/eth'
import { Field } from '@/components/common/field'
import { EmptyState } from '@/components/common/states'
import { QuoteSummary } from '@/components/cart/quote-summary'
import { EnsInput } from '@/components/profile/ens-input'
import { ReviewDialog } from '@/components/checkout/review-dialog'
import { WalletPicker } from '@/components/checkout/wallet-picker'
import { CouponForm } from '@/components/cart/coupon-form'
import { useCart, useQuote } from '@/features/cart'
import { getPendingOrder, quoteSignature, useCreateOrder } from '@/features/checkout'
import { useWallets } from '@/features/wallets'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { errorMessage, toApiError } from '@/lib/api-error'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/labels'
import { STORAGE_KEYS, storage } from '@/lib/storage'
import { announce } from '@/realtime/announcer'

export const Route = createFileRoute('/_auth/pagamento')({
  component: CheckoutPage,
})

function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const router = useRouter()
  const cart = useCart()
  const wallets = useWallets()
  const createOrder = useCreateOrder()

  const primary = wallets.data?.find((w) => w.role === 'primary')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [network, setNetwork] = useState<Network>('ethereum')
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewedSignature, setReviewedSignature] = useState<string | null>(null)

  const quote = useQuote(network)
  const pendingOrder = getPendingOrder(user.id)

  // Carteira padrão = principal (e sua rede)
  useEffect(() => {
    if (!walletId && primary) {
      setWalletId(primary.id)
      setNetwork(primary.network)
    }
  }, [primary, walletId])

  const wallet = wallets.data?.find((w) => w.id === walletId)
  const visibleWallets = useOtherWallet ? (wallets.data ?? []) : (wallets.data ?? []).filter((w) => w.role === 'primary')

  // Rascunho do formulário sobrevive a expiração de sessão/refresh (sessionStorage)
  const draft = storage.getJSON<CollectorForm>(STORAGE_KEYS.checkoutDraft, sessionStorage)
  const form = useForm<CollectorForm>({
    resolver: zodResolver(collectorSchema),
    defaultValues: draft ?? {
      displayName: user.displayName,
      username: user.username,
      profileName: user.username,
      email: user.email,
      referralCode: '',
      ensName: user.ensName,
      note: '',
    },
  })
  const { errors } = form.formState
  useEffect(() => {
    const sub = form.watch((values) => storage.setJSON(STORAGE_KEYS.checkoutDraft, values, sessionStorage))
    return () => sub.unsubscribe()
  }, [form])

  const currentSignature = quote.data ? quoteSignature(quote.data) : null
  const quoteChanged = reviewOpen && reviewedSignature !== null && currentSignature !== null && reviewedSignature !== currentSignature

  useEffect(() => {
    if (quoteChanged) announce('Os valores do pedido mudaram. Revise antes de confirmar.')
  }, [quoteChanged])

  const openReview = form.handleSubmit(
    () => {
      if (!wallet) return toast.error('Selecione uma carteira cadastrada.')
      if (wallet.connectedNetwork !== network) return toast.error(`Conecte a carteira na rede ${NETWORK_LABELS[network]} antes de revisar.`)
      if (!quote.data?.purchasable) return toast.error('Há itens indisponíveis no carrinho.')
      setReviewedSignature(currentSignature)
      setReviewOpen(true)
    },
    () => toast.error('Corrija os campos destacados.'),
  )

  const confirm = () => {
    if (!quote.data || !wallet || createOrder.isPending) return
    createOrder.mutate(
      { quoteId: quote.data.id, walletId: wallet.id, network, collector: form.getValues() },
      {
        onSuccess: (order) => {
          setReviewOpen(false)
          storage.remove(STORAGE_KEYS.checkoutDraft, sessionStorage)
          navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
        },
        onError: (error) => {
          const e = toApiError(error)
          if (e.code === 'QUOTE_STALE') {
            toast.warning(e.message)
            announce(e.message)
            return // diálogo permanece aberto exigindo nova confirmação
          }
          toast.error(errorMessage(error))
        },
      },
    )
  }

  const items = cart.data?.items ?? []
  const loading = cart.isPending || wallets.isPending

  if (!loading && items.length === 0) {
    return (
      <div className="page-container py-10">
        <EmptyState
          title="Seu carrinho está vazio"
          description="Adicione NFTs ao carrinho para finalizar uma compra."
          action={
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-container pt-6 md:pt-8">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Pagamento' }]} />
      </div>
      <div className="mb-6 flex items-center gap-4 md:hidden">
        <button type="button" onClick={() => router.history.back()} aria-label="Voltar" className="flex size-9 items-center justify-center rounded-full bg-surface">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-lg font-bold">Pagamento com carteira</h1>
      </div>

      {pendingOrder && (
        <div role="status" className="mb-6 rounded-md border border-primary p-4 text-sm">
          Você tem um pedido em processamento.{' '}
          <Link to="/pedidos/$orderId" params={{ orderId: pendingOrder.orderId }} className="font-bold text-accent underline">
            Acompanhar pedido
          </Link>
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_405px]">
        <form noValidate onSubmit={openReview} aria-labelledby="colecionador-titulo" className="order-2 lg:order-none">
          <h2 id="colecionador-titulo" className="mb-5 text-lg font-bold">
            Perfil do colecionador
          </h2>
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <Field label="Nome de exibição" required error={errors.displayName?.message}>
              {(p) => <Input {...p} autoComplete="name" {...form.register('displayName')} />}
            </Field>
            <Field label="Nome de usuário" required error={errors.username?.message}>
              {(p) => <Input {...p} autoComplete="username" {...form.register('username')} />}
            </Field>
            <Field label="Rede" required>
              {(p) => (
                <NativeSelect {...p} value={network} onChange={(e) => setNetwork(e.target.value as Network)}>
                  {NETWORKS.map((n) => (
                    <option key={n} value={n}>
                      {NETWORK_LABELS[n]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field label="Nome do perfil" required error={errors.profileName?.message}>
              {(p) => <Input {...p} {...form.register('profileName')} />}
            </Field>
            <Field label="Endereço da carteira" required hint="Definido pela carteira selecionada">
              {(p) => <Input {...p} value={wallet?.address ?? ''} readOnly placeholder="Endereço 0x da carteira" />}
            </Field>
            <Field label="ENS ou carteira secundária (opcional)">
              {(p) => <Input {...p} value={wallet?.secondaryAddress ?? ''} readOnly placeholder="ENS ou carteira secundária (opcional)" />}
            </Field>
            <Field label="Tipo de carteira" required>
              {(p) => <Input {...p} value={wallet ? PROVIDER_LABELS[wallet.provider] : ''} readOnly placeholder="Selecione uma carteira" />}
            </Field>
            <Field label="Código de indicação" required error={errors.referralCode?.message}>
              {(p) => <Input {...p} {...form.register('referralCode')} />}
            </Field>
            <Field label="E-mail" required error={errors.email?.message}>
              {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
            </Field>
            <Field label="Nome ENS" required error={errors.ensName?.message}>
              {(p) => <EnsInput {...p} {...form.register('ensName')} />}
            </Field>
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useOtherWallet} onChange={(e) => setUseOtherWallet(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Usar outra carteira?
          </label>
          <Field label="Observação do colecionador (opcional)" error={errors.note?.message} className="mt-6 max-w-[350px]">
            {(p) => <Textarea {...p} {...form.register('note')} />}
          </Field>
        </form>

        <aside aria-labelledby="seus-nfts" className="order-1 lg:order-none">
          <h2 id="seus-nfts" className="mb-3 text-lg font-bold">
            Seus NFTs
          </h2>
          {quote.data ? (
            <ul className="flex flex-col gap-3">
              {quote.data.lines.map((l) => (
                <li key={l.cartItemId} className="flex items-center gap-3 bg-surface pr-3">
                  <img src={l.image} alt="" width={70} height={70} className="size-[70px] object-cover" />
                  <span className="flex-1">
                    <span className="block font-bold">{l.name}</span>
                    <span className="block text-sm text-muted-foreground">Edição {l.editionLabel}</span>
                  </span>
                  <span className="text-sm">(x {l.quantity})</span>
                  <Eth value={l.lineTotal} className="font-bold text-accent" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from({ length: Math.max(items.length, 2) }, (_, i) => (
                <Skeleton key={i} className="h-[70px]" />
              ))}
            </div>
          )}
          {showCoupon ? (
            <CouponForm />
          ) : (
            <button type="button" className="mt-4 w-full text-center text-sm hover:text-accent" onClick={() => setShowCoupon(true)}>
              Tem um código promocional? Aplique aqui
            </button>
          )}
          <QuoteSummary quote={quote} />

          <div className="mt-8">
            {wallets.data ? (
              <WalletPicker
                wallets={visibleWallets}
                selectedId={walletId}
                network={network}
                onSelect={(id) => {
                  setWalletId(id)
                  const w = wallets.data?.find((x) => x.id === id)
                  if (w) setNetwork(w.network)
                }}
              />
            ) : (
              <Skeleton className="h-32" />
            )}
          </div>

          <Button
            size="lg"
            className="mt-6 w-full rounded-xl md:rounded-md"
            onClick={openReview}
            disabled={!quote.data || quote.isFetching || Boolean(pendingOrder) || createOrder.isPending}
          >
            Revisar e confirmar compra
          </Button>
        </aside>
      </div>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        quote={quote.data}
        quoteLoading={quote.isFetching}
        changed={quoteChanged}
        wallet={wallet}
        submitting={createOrder.isPending}
        onAcceptChanges={() => setReviewedSignature(currentSignature)}
        onConfirm={confirm}
      />
    </div>
  )
}
