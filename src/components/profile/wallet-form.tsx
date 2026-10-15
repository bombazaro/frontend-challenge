import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { NETWORKS, WALLET_PROVIDERS, type Wallet, type WalletRole } from '@/contracts/api'
import { walletSchema, type WalletForm as WalletFormValues } from '@/contracts/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Field } from '@/components/common/field'
import { useSaveWallet } from '@/features/wallets'
import { errorMessage, toApiError } from '@/lib/api-error'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/labels'
import { announce } from '@/realtime/announcer'
import { EnsInput } from './ens-input'

export const emptyWallet: WalletFormValues = {
  displayName: '',
  nickname: '',
  network: '' as WalletFormValues['network'],
  profileName: '',
  address: '',
  secondaryAddress: '',
  provider: '' as WalletFormValues['provider'],
  referralCode: '',
  email: '',
  ensName: '',
}

export function walletToForm(w: Wallet): WalletFormValues {
  return {
    displayName: w.displayName,
    nickname: w.nickname,
    network: w.network,
    profileName: w.profileName,
    address: w.address,
    secondaryAddress: w.secondaryAddress,
    provider: w.provider,
    referralCode: w.referralCode,
    email: w.email,
    ensName: w.ensName,
  }
}

export function WalletForm({ role, wallet, initial, onSaved }: { role: WalletRole; wallet?: Wallet; initial?: WalletFormValues; onSaved?: () => void }) {
  const save = useSaveWallet()
  const form = useForm<WalletFormValues>({ resolver: zodResolver(walletSchema), defaultValues: wallet ? walletToForm(wallet) : (initial ?? emptyWallet) })
  const { errors } = form.formState

  useEffect(() => {
    if (!wallet && initial) form.reset(initial)
  }, [initial, wallet, form])

  const submit = form.handleSubmit((values) =>
    save.mutate(
      { id: wallet?.id, body: { ...values, role } },
      {
        onSuccess: () => {
          const msg = role === 'primary' ? 'Carteira principal salva' : 'Carteira secundária salva'
          toast.success(msg)
          announce(msg)
          onSaved?.()
        },
        onError: (error) => {
          const fields = toApiError(error).fieldErrors
          Object.entries(fields).forEach(([k, message]) => form.setError(k as keyof WalletFormValues, { message }, { shouldFocus: true }))
          if (!Object.keys(fields).length) toast.error(errorMessage(error))
        },
      },
    ),
  )

  return (
    <form onSubmit={submit} noValidate className="grid gap-x-7 gap-y-5 md:grid-cols-2" aria-label={role === 'primary' ? 'Carteira principal' : 'Carteira secundária'}>
      <Field label="Nome de exibição" required error={errors.displayName?.message}>
        {(p) => <Input {...p} {...form.register('displayName')} />}
      </Field>
      <Field label="Apelido da carteira" required error={errors.nickname?.message}>
        {(p) => <Input {...p} {...form.register('nickname')} />}
      </Field>
      <Field label="Rede" required error={errors.network?.message}>
        {(p) => (
          <NativeSelect {...p} {...form.register('network')}>
            <option value="">Selecione uma rede</option>
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
      <Field label="Endereço da carteira" required error={errors.address?.message}>
        {(p) => <Input {...p} placeholder="Endereço 0x da carteira" spellCheck={false} {...form.register('address')} />}
      </Field>
      <Field label="ENS ou carteira secundária (opcional)" error={errors.secondaryAddress?.message}>
        {(p) => <Input {...p} placeholder="ENS ou carteira secundária (opcional)" {...form.register('secondaryAddress')} />}
      </Field>
      <Field label="Tipo de carteira" required error={errors.provider?.message}>
        {(p) => (
          <NativeSelect {...p} {...form.register('provider')}>
            <option value="">Selecione uma carteira</option>
            {WALLET_PROVIDERS.map((w) => (
              <option key={w} value={w}>
                {PROVIDER_LABELS[w]}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Código de indicação" required error={errors.referralCode?.message}>
        {(p) => <Input {...p} {...form.register('referralCode')} />}
      </Field>
      <Field label="E-mail" required error={errors.email?.message}>
        {(p) => <Input {...p} type="email" {...form.register('email')} />}
      </Field>
      <Field label="Nome ENS" required error={errors.ensName?.message}>
        {(p) => <EnsInput {...p} {...form.register('ensName')} />}
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
      </div>
    </form>
  )
}
