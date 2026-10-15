export const env = {
  enableMocks: import.meta.env.VITE_ENABLE_MOCKS === 'true',
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock',
}
