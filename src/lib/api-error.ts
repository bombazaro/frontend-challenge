import axios from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '@/contracts/api'

export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED' | 'UNKNOWN'

/** Erro normalizado: toda falha de transporte vira ApiError antes de chegar ao Query/UI. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ClientErrorCode
  readonly fieldErrors: Record<string, string>
  readonly details: unknown

  constructor(params: { status: number; code: ClientErrorCode; message: string; fieldErrors?: Record<string, string>; details?: unknown }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.fieldErrors = params.fieldErrors ?? {}
    this.details = params.details
  }

  /** Falhas transitórias que podem ser repetidas com segurança */
  get retryable() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.status >= 500 || this.status === 429
  }

  get isAuthError() {
    return this.code === 'UNAUTHENTICATED' || this.code === 'SESSION_EXPIRED'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError({ status: 0, code: 'CANCELED', message: 'Requisição cancelada' })
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: 'O servidor demorou para responder. Tente novamente.' })
    }
    if (!error.response) {
      return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor. Verifique sua internet.' })
    }
    const body = error.response.data as Partial<ApiErrorBody> | undefined
    if (body?.error) {
      return new ApiError({
        status: error.response.status,
        code: body.error.code,
        message: body.error.message,
        fieldErrors: body.error.fieldErrors,
        details: body.error.details,
      })
    }
    return new ApiError({ status: error.response.status, code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.' })
  }
  return new ApiError({ status: 0, code: 'UNKNOWN', message: error instanceof Error ? error.message : 'Erro inesperado' })
}

export function errorMessage(error: unknown) {
  return toApiError(error).message
}
