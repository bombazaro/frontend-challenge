import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { registerSchema, type RegisterForm } from '@/contracts/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/common/field'
import { PasswordInput } from '@/components/common/password-input'
import { AuthDialog, SocialButtons, safeRedirect } from '@/components/auth/auth-dialog'
import { useRegister } from '@/features/session'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { errorMessage, toApiError } from '@/lib/api-error'

export const Route = createFileRoute('/cadastro')({
  validateSearch: (s) => z.object({ redirect: z.string().optional().catch(undefined) }).parse(s),
  component: RegisterPage,
})

function RegisterPage() {
  useDocumentTitle('Criar conta')
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const register = useRegister()
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ username, email, password }) =>
    register.mutate(
      { username, email, password },
      {
        onSuccess: () => {
          toast.success('Conta criada com sucesso!')
          router.history.push(safeRedirect(redirect))
        },
        onError: (error) => {
          // Conflitos/validação do servidor voltam para os campos
          Object.entries(toApiError(error).fieldErrors).forEach(([field, message]) =>
            form.setError(field as keyof RegisterForm, { message }, { shouldFocus: true }),
          )
        },
      },
    ),
  )

  const serverError = register.isError && Object.keys(toApiError(register.error).fieldErrors).length === 0

  return (
    <AuthDialog mode="register" redirect={redirect} description="Crie seu perfil de colecionador e conecte uma carteira quando quiser.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Nome de usuário" hideLabel error={errors.username?.message}>
          {(p) => <Input {...p} data-autofocus autoComplete="username" placeholder="Nome de usuário" {...form.register('username')} />}
        </Field>
        <Field label="E-mail" hideLabel error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder="Digite seu e-mail" {...form.register('email')} />}
        </Field>
        <Field label="Senha" hideLabel error={errors.password?.message} hint="Mínimo de 8 caracteres, com uma maiúscula e um número.">
          {(p) => <PasswordInput {...p} autoComplete="new-password" placeholder="Senha" {...form.register('password')} />}
        </Field>
        <Field label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" placeholder="Confirmar senha" {...form.register('confirmPassword')} />}
        </Field>
        {serverError && (
          <p role="alert" className="text-center text-sm text-destructive">
            {errorMessage(register.error)}
          </p>
        )}
        <Button type="submit" size="lg" disabled={register.isPending} className="rounded-xl md:rounded-md">
          {register.isPending ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>
      <SocialButtons />
    </AuthDialog>
  )
}
