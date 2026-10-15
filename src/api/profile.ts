import type { AvatarRequest, ChangePasswordRequest, UpdateProfileRequest, User } from '@/contracts/api'
import { http } from '@/lib/http'

export const profileApi = {
  get: (signal?: AbortSignal) => http.get<User>('/profile', { signal }).then((r) => r.data),
  update: (body: UpdateProfileRequest) => http.put<User>('/profile', body).then((r) => r.data),
  avatar: (body: AvatarRequest) => http.put<User>('/profile/avatar', body).then((r) => r.data),
  changePassword: (body: ChangePasswordRequest) => http.put<void>('/profile/password', body).then(() => undefined),
}
