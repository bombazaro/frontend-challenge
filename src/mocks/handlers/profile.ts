import { HttpResponse, http } from 'msw'
import type { AvatarRequest, ChangePasswordRequest, UpdateProfileRequest } from '@/contracts/api'
import { changePasswordRequestSchema, profileSchema, toFieldErrors } from '@/contracts/schemas'
import { db, hashPassword, persist, toPublicUser } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'

const MAX_AVATAR_CHARS = 1_400_000 // ~1 MB em base64

export const profileHandlers = [
  http.get(`${API}/profile`, async ({ request }) => {
    await simulateNetwork(request)
    return HttpResponse.json(toPublicUser(requireUser(request)))
  }),

  http.put(`${API}/profile`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const parsed = profileSchema.safeParse(await readJson<UpdateProfileRequest>(request))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos destacados', { fieldErrors: toFieldErrors(parsed.error) })
    const others = db().users.filter((u) => u.id !== user.id)
    if (others.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase())) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso', { fieldErrors: { email: 'Este e-mail já está em uso' } })
    }
    if (others.some((u) => u.username.toLowerCase() === parsed.data.username.toLowerCase())) {
      return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso', { fieldErrors: { username: 'Este nome de usuário já está em uso' } })
    }
    Object.assign(user, parsed.data)
    persist()
    return HttpResponse.json(toPublicUser(user))
  }),

  http.put(`${API}/profile/avatar`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const { dataUrl } = await readJson<AvatarRequest>(request)
    if (dataUrl !== null) {
      if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) {
        return apiError(422, 'VALIDATION_ERROR', 'Formato de imagem inválido (use PNG, JPG ou WEBP)', { fieldErrors: { avatar: 'Formato inválido' } })
      }
      if (dataUrl.length > MAX_AVATAR_CHARS) {
        return apiError(422, 'VALIDATION_ERROR', 'A imagem deve ter no máximo 1 MB', { fieldErrors: { avatar: 'Máximo de 1 MB' } })
      }
    }
    user.avatarUrl = dataUrl
    persist()
    return HttpResponse.json(toPublicUser(user))
  }),

  http.put(`${API}/profile/password`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const parsed = changePasswordRequestSchema.safeParse(await readJson<ChangePasswordRequest>(request))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Senha inválida', { fieldErrors: toFieldErrors(parsed.error) })
    if ((await hashPassword(parsed.data.currentPassword, user.salt)) !== user.passwordHash) {
      return apiError(422, 'INVALID_PASSWORD', 'Senha atual incorreta', { fieldErrors: { currentPassword: 'Senha atual incorreta' } })
    }
    user.passwordHash = await hashPassword(parsed.data.newPassword, user.salt)
    persist()
    return new HttpResponse(null, { status: 204 })
  }),
]
