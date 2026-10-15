import type { RealtimeEnvelope } from '@/contracts/api'

/**
 * Tolerância a duplicatas e eventos antigos:
 * - eventId já processado => descartado
 * - versão <= última versão vista do recurso => descartado
 * A verificação final também ocorre contra a versão no cache (dados vindos do REST).
 */
export class EventGuard {
  private seen = new Set<string>()
  private queue: string[] = []
  private versions = new Map<string, number>()

  constructor(private readonly capacity = 500) {}

  accept(event: RealtimeEnvelope<string, string, unknown>): boolean {
    if (this.seen.has(event.eventId)) return false
    this.seen.add(event.eventId)
    this.queue.push(event.eventId)
    if (this.queue.length > this.capacity) this.seen.delete(this.queue.shift()!)

    const key = `${event.resource.type}:${event.resource.id}`
    const last = this.versions.get(key) ?? 0
    if (event.version <= last) return false
    this.versions.set(key, event.version)
    return true
  }

  reset() {
    this.seen.clear()
    this.queue = []
    this.versions.clear()
  }
}
