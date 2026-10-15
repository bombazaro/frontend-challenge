import { toast } from 'sonner'

/** Ações fora do escopo: deixam claro que não estão disponíveis (sem aparentar sucesso). */
export function notAvailable(feature: string) {
  toast.info(`${feature} não está disponível nesta demonstração.`)
}
