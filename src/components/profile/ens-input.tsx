import { forwardRef } from 'react'
import { Input } from '@/components/ui/input'

/** Campo "Nome ENS" do Figma: sufixo .eth fixo + nome. */
export const EnsInput = forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(function EnsInput(props, ref) {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-10 items-center rounded-sm border border-input px-3 text-sm" aria-hidden>
        .eth
      </span>
      <Input ref={ref} placeholder="seu-nome" {...props} />
    </div>
  )
})
