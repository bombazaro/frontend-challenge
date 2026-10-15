import { z } from 'zod'
import { CATALOG_SORTS, CATALOG_TABS, CATEGORIES, NETWORKS, WALLET_PROVIDERS } from './api'

/**
 * Schemas de validação reutilizados pelos formulários (cliente) e pelos handlers MSW (servidor simulado).
 * Mensagens em português para exibição direta nos campos.
 */

const email = z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido')
const username = z
  .string()
  .trim()
  .min(3, 'Mínimo de 3 caracteres')
  .max(24, 'Máximo de 24 caracteres')
  .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, "_" ou "."')
const password = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
  .regex(/[0-9]/, 'Inclua um número')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    username,
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterForm = z.infer<typeof registerSchema>

export const registerRequestSchema = z.object({ username, email, password })

const ensName = z
  .string()
  .trim()
  .min(3, 'Mínimo de 3 caracteres')
  .max(32, 'Máximo de 32 caracteres')
  .regex(/^[a-z0-9-]+$/, 'Use letras minúsculas, números ou hífen')

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40, 'Máximo de 40 caracteres'),
  username,
  email,
  ensName,
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(30, 'Máximo de 30 caracteres'),
})
export type ProfileForm = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
})

export const ethAddress = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido (0x + 40 caracteres hexadecimais)')

export const walletSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40),
  nickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(30),
  network: z.enum(NETWORKS, { message: 'Selecione uma rede' }),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40),
  address: ethAddress,
  secondaryAddress: z
    .string()
    .trim()
    .refine((v) => v === '' || /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]+\.eth$/.test(v), 'Informe um ENS (nome.eth) ou endereço 0x'),
  provider: z.enum(WALLET_PROVIDERS, { message: 'Selecione uma carteira' }),
  referralCode: z.string().trim().min(4, 'Informe o código de indicação').max(16),
  email,
  ensName,
})
export type WalletForm = z.infer<typeof walletSchema>

export const upsertWalletRequestSchema = walletSchema.extend({ role: z.enum(['primary', 'secondary']) })

export const collectorSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  username,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  email,
  referralCode: z.string().trim().min(4, 'Informe o código de indicação'),
  ensName,
  note: z.string().trim().max(280, 'Máximo de 280 caracteres'),
})
export type CollectorForm = z.infer<typeof collectorSchema>

export const createOrderRequestSchema = z.object({
  quoteId: z.string().min(1),
  walletId: z.string().min(1),
  network: z.enum(NETWORKS),
  collector: collectorSchema,
})

// ---------- Busca do catálogo (estado da URL) ----------
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(60).optional().catch(undefined),
  categoria: z.array(z.enum(CATEGORIES)).optional().catch(undefined),
  rede: z.array(z.enum(NETWORKS)).optional().catch(undefined),
  min: z.coerce.number().min(0).optional().catch(undefined),
  max: z.coerce.number().min(0).optional().catch(undefined),
  aba: z.enum(CATALOG_TABS).optional().catch(undefined),
  ordem: z.enum(CATALOG_SORTS).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Converte um ZodError em mapa campo -> mensagem (formato do contrato de erro) */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
