import { useEffect, useState } from 'react'
import { CATEGORIES, NETWORKS, type CatalogFacets, type Category, type Network } from '@/contracts/api'
import type { CatalogSearch } from '@/contracts/schemas'
import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

const PRICE_CEIL = 13

function toggle<T>(list: T[] | undefined, value: T) {
  const set = new Set(list ?? [])
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return set.size ? [...set] : undefined
}

function FilterOption({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <li>
      <label className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm hover:bg-surface-2', checked ? 'font-bold text-accent' : 'text-muted-foreground')}>
        <span className="flex items-center gap-2">
          <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-[var(--primary)]" />
          {label}
        </span>
        <span className="tabular-nums">({count ?? 0})</span>
      </label>
    </li>
  )
}

export function CatalogFilters({
  search,
  facets,
  onChange,
}: {
  search: CatalogSearch
  facets?: CatalogFacets
  onChange: (patch: Partial<CatalogSearch>) => void
}) {
  const [min, setMin] = useState(search.min ?? 0)
  const [max, setMax] = useState(search.max ?? PRICE_CEIL)

  // URL é a fonte da verdade: navegação pelo histórico restaura os controles
  useEffect(() => {
    setMin(search.min ?? 0)
    setMax(search.max ?? PRICE_CEIL)
  }, [search.min, search.max])

  const fmt = (v: number) => v.toFixed(2).replace('.', ',')

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-3 text-lg font-bold">Coleções</legend>
        <ul className="flex flex-col gap-1">
          {CATEGORIES.map((c: Category) => (
            <FilterOption
              key={c}
              label={CATEGORY_LABELS[c]}
              count={facets?.categories[c]}
              checked={Boolean(search.categoria?.includes(c))}
              onChange={() => onChange({ categoria: toggle(search.categoria, c) })}
            />
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold">Faixa de preço</legend>
        <div className="range-dual mx-1">
          <input
            type="range"
            min={0}
            max={PRICE_CEIL}
            step={0.01}
            value={min}
            aria-label="Preço mínimo em ETH"
            aria-valuetext={`${fmt(min)} ETH`}
            onChange={(e) => setMin(Math.min(Number(e.target.value), max))}
          />
          <input
            type="range"
            min={0}
            max={PRICE_CEIL}
            step={0.01}
            value={max}
            aria-label="Preço máximo em ETH"
            aria-valuetext={`${fmt(max)} ETH`}
            onChange={(e) => setMax(Math.max(Number(e.target.value), min))}
          />
        </div>
        <p className="mt-3 px-3 text-sm" aria-live="polite">
          Preço: {fmt(min)} - {fmt(max)} ETH
        </p>
        <div className="mt-3 flex gap-2 px-3">
          <Button size="sm" onClick={() => onChange({ min: min > 0 ? min : undefined, max: max < PRICE_CEIL ? max : undefined })}>
            Aplicar
          </Button>
          {(search.min !== undefined || search.max !== undefined) && (
            <Button size="sm" variant="ghost" onClick={() => onChange({ min: undefined, max: undefined })}>
              Limpar
            </Button>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold">Rede</legend>
        <ul className="flex flex-col gap-1">
          {NETWORKS.map((n: Network) => (
            <FilterOption
              key={n}
              label={NETWORK_LABELS[n]}
              count={facets?.networks[n]}
              checked={Boolean(search.rede?.includes(n))}
              onChange={() => onChange({ rede: toggle(search.rede, n) })}
            />
          ))}
        </ul>
      </fieldset>
    </div>
  )
}
