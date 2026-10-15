import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { loginSchema, type LoginForm } from '@/contracts/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/common/field'
import { PasswordInput } from '@/components/common/password-input'
import { notAvailable } from '@/components/common/not-available'
import { AuthDialog, SocialButtons, safeRedirect } from '@/components/auth/auth-dialog'
import { useLogin } from '@/features/session'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { errorMessage } from '@/lib/api-error'

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  motivo: z.enum(['expirada']).optional().catch(undefined),
})

export const Route = createFileRoute('/entrar')({
  validateSearch: (s) => searchSchema.parse(s),
  component: LoginPage,
})

function LoginPage() {
  useDocumentTitle('Entrar')
  const { redirect, motivo } = Route.useSearch()
  const router = useRouter()
  const login = useLogin()
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: (res) => {
        toast.success(`Bem-vindo(a), ${res.session.user.displayName}!`)
        router.history.push(safeRedirect(redirect))
      },
    }),
  )

  return (
    <AuthDialog mode="login" redirect={redirect} description="Entre para gerenciar sua carteira, coleção e perfil criador.">
      {motivo === 'expirada' && (
        <p role="alert" className="rounded-md border border-destructive/60 p-3 text-center text-xs text-destructive">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="E-mail" hideLabel error={errors.email?.message}>
          {(p) => <Input {...p} data-autofocus type="email" autoComplete="email" placeholder="contato@email.com" {...form.register('email')} />}
        </Field>
        <Field label="Senha" hideLabel error={errors.password?.message}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" placeholder="Senha" {...form.register('password')} />}
        </Field>
        <button type="button" className="self-end text-sm text-accent hover:underline" onClick={() => notAvailable('A recuperação de senha')}>
          Esqueceu a senha?
        </button>
        {login.isError && (
          <p role="alert" className="text-center text-sm text-destructive">
            {errorMessage(login.error)}
          </p>
        )}
        <Button type="submit" size="lg" disabled={login.isPending} className="rounded-xl md:rounded-md">
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <SocialButtons />
    </AuthDialog>
  )
}
