import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function pagesToShow(page: number, total: number) {
  const pages = new Set([1, total, page - 1, page, page + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  const base = 'flex size-9 items-center justify-center rounded-sm border border-border text-base hover:border-primary disabled:opacity-40'
  const pages = pagesToShow(page, totalPages)
  return (
    <nav aria-label="Paginação do catálogo" className="mt-10 flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <button type="button" className={base} onClick={() => onChange(page - 1)} aria-label="Página anterior">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </li>
        )}
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && p - pages[i - 1] > 1 && <span aria-hidden>…</span>}
            <button
              type="button"
              className={cn(base, p === page && 'border-primary bg-primary font-bold text-primary-foreground')}
              onClick={() => onChange(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <button type="button" className={base} onClick={() => onChange(page + 1)} aria-label="Próxima página">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
