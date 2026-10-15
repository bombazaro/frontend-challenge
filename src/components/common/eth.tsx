import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

export function Eth({ value, className, minDecimals }: { value: string; className?: string; minDecimals?: number }) {
  return <span className={cn('tabular-nums', className)}>{formatEth(value, { minDecimals })}</span>
}
