import { useSyncExternalStore } from 'react'

/** Região aria-live global para anunciar mudanças em tempo real e resultados de mutations. */
let message = ''
const listeners = new Set<() => void>()

export function announce(text: string) {
  // Limpa e reescreve para que leitores de tela anunciem mensagens repetidas
  message = ''
  listeners.forEach((l) => l())
  setTimeout(() => {
    message = text
    listeners.forEach((l) => l())
  }, 50)
}

export function useAnnouncement() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => message,
    () => '',
  )
}
