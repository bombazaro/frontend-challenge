import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
  label,
  size = 'md',
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
  label: string
  size?: 'sm' | 'md'
}) {
  const btn = cn(
    'flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40',
    size === 'md' ? 'h-12 w-8' : 'size-6',
  )
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={`Diminuir quantidade de ${label}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <output className="min-w-6 text-center text-lg" aria-live="polite" aria-label={`Quantidade: ${value}`}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Aumentar quantidade de ${label}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
