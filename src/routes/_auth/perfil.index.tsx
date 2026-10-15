import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Session, User } from '@/contracts/api'
import { changePasswordSchema, profileSchema, type ChangePasswordForm, type ProfileForm } from '@/contracts/schemas'
import { profileApi } from '@/api/profile'
import { qk } from '@/api/keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Field } from '@/components/common/field'
import { PasswordInput } from '@/components/common/password-input'
import { ErrorState } from '@/components/common/states'
import { EnsInput } from '@/components/profile/ens-input'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { errorMessage, toApiError } from '@/lib/api-error'
import { announce } from '@/realtime/announcer'

export const Route = createFileRoute('/_auth/perfil/')({
  component: ProfilePage,
})

const MAX_AVATAR_BYTES = 1024 * 1024

function useSyncUser() {
  const queryClient = useQueryClient()
  return (user: User) => {
    queryClient.setQueryData(qk.profile(user.id), user)
    queryClient.setQueryData<Session | null>(qk.session, (s) => (s ? { ...s, user } : s))
  }
}

function ProfilePage() {
  useDocumentTitle('Perfil do colecionador')
  const { user } = Route.useRouteContext()
  const profile = useQuery({ queryKey: qk.profile(user.id), queryFn: ({ signal }) => profileApi.get(signal) })

  return (
    <section aria-labelledby="perfil-titulo">
      <h2 id="perfil-titulo" className="mb-6 font-bold">
        Perfil do colecionador
      </h2>
      {profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : !profile.data ? (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <ProfileDataForm user={profile.data} />
          <PasswordForm />
        </>
      )}
    </section>
  )
}

function ProfileDataForm({ user }: { user: User }) {
  const sync = useSyncUser()
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user.displayName, username: user.username, email: user.email, ensName: user.ensName, walletNickname: user.walletNickname },
  })
  const { errors, isDirty } = form.formState
  const save = useMutation({
    mutationFn: profileApi.update,
    onSuccess: (updated) => {
      sync(updated)
      form.reset({ displayName: updated.displayName, username: updated.username, email: updated.email, ensName: updated.ensName, walletNickname: updated.walletNickname })
      toast.success('Perfil atualizado')
      announce('Perfil atualizado')
    },
    onError: (error) => {
      const fields = toApiError(error).fieldErrors
      Object.entries(fields).forEach(([k, message]) => form.setError(k as keyof ProfileForm, { message }, { shouldFocus: true }))
      if (!Object.keys(fields).length) toast.error(errorMessage(error))
    },
  })

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-x-7 gap-y-6 md:grid-cols-2">
      <Field label="Nome de exibição" required error={errors.displayName?.message}>
        {(p) => <Input {...p} autoComplete="name" {...form.register('displayName')} />}
      </Field>
      <Field label="Nome de usuário" required error={errors.username?.message}>
        {(p) => <Input {...p} autoComplete="username" {...form.register('username')} />}
      </Field>
      <Field label="E-mail" required error={errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
      </Field>
      <Field label="Nome ENS" required error={errors.ensName?.message}>
        {(p) => <EnsInput {...p} {...form.register('ensName')} />}
      </Field>
      <Field label="Apelido da carteira" required error={errors.walletNickname?.message}>
        {(p) => <Input {...p} {...form.register('walletNickname')} />}
      </Field>
      <AvatarField user={user} />
      <div className="md:col-span-2">
        <Button type="submit" disabled={save.isPending || !isDirty} className="min-w-32">
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

function AvatarField({ user }: { user: User }) {
  const sync = useSyncUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const mutation = useMutation({
    mutationFn: profileApi.avatar,
    onSuccess: (updated) => {
      sync(updated)
      const msg = updated.avatarUrl ? 'Avatar atualizado' : 'Avatar removido'
      toast.success(msg)
      announce(msg)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const onFile = (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast.error('Use uma imagem PNG, JPG ou WEBP.')
    if (file.size > MAX_AVATAR_BYTES) return toast.error('A imagem deve ter no máximo 1 MB.')
    const reader = new FileReader()
    reader.onload = () => mutation.mutate({ dataUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm" id="avatar-label">
        Avatar
      </span>
      <div className="flex items-center gap-5" role="group" aria-labelledby="avatar-label">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Seu avatar atual" className="size-12 rounded-full object-cover" data-testid="avatar-image" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-accent" aria-label="Sem avatar">
            <ImageIcon className="size-5" aria-hidden />
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-label="Selecionar imagem do avatar" data-testid="avatar-input" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        {user.avatarUrl && (
          <Button type="button" variant="ghost" onClick={() => mutation.mutate({ dataUrl: null })} disabled={mutation.isPending}>
            Remover
          </Button>
        )}
      </div>
    </div>
  )
}

function PasswordForm() {
  const form = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } })
  const { errors } = form.formState
  const mutation = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => {
      form.reset()
      toast.success('Senha alterada com sucesso')
      announce('Senha alterada com sucesso')
    },
    onError: (error) => {
      const fields = toApiError(error).fieldErrors
      Object.entries(fields).forEach(([k, message]) => form.setError(k as keyof ChangePasswordForm, { message }, { shouldFocus: true }))
      if (!Object.keys(fields).length) toast.error(errorMessage(error))
    },
  })
  useEffect(() => () => form.reset(), [form])

  return (
    <form
      onSubmit={form.handleSubmit(({ currentPassword, newPassword }) => mutation.mutate({ currentPassword, newPassword }))}
      noValidate
      className="mt-10 grid max-w-[417px] gap-6"
      aria-labelledby="senha-titulo"
    >
      <h2 id="senha-titulo" className="font-bold">
        Alterar senha
      </h2>
      <Field label="Senha atual" error={errors.currentPassword?.message}>
        {(p) => <PasswordInput {...p} autoComplete="current-password" {...form.register('currentPassword')} />}
      </Field>
      <Field label="Nova senha" error={errors.newPassword?.message} hint="Mínimo de 8 caracteres, com uma maiúscula e um número.">
        {(p) => <PasswordInput {...p} autoComplete="new-password" {...form.register('newPassword')} />}
      </Field>
      <Field label="Confirmar nova senha" error={errors.confirmPassword?.message}>
        {(p) => <PasswordInput {...p} autoComplete="new-password" {...form.register('confirmPassword')} />}
      </Field>
      <Button type="submit" disabled={mutation.isPending} className="w-fit min-w-32">
        {mutation.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  )
}
