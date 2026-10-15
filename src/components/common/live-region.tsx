import { useAnnouncement } from '@/realtime/announcer'

export function LiveRegion() {
  const message = useAnnouncement()
  return (
    <div aria-live="polite" aria-atomic="true" role="status" className="sr-only" data-testid="live-region">
      {message}
    </div>
  )
}
