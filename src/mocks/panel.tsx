import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { mockControl } from './control'
import { SCENARIOS, type ScenarioName } from './scenarios'

/**
 * Painel da camada de mocks (somente quando VITE_ENABLE_MOCKS=true).
 * Altera o "servidor" simulado; a UI recebe as mudanças pelas mesmas vias de produção (REST + Socket.IO).
 * Oculte com localStorage 'kurio:mock-panel' = 'hidden' (usado nos testes de regressão visual).
 */
export default function MockPanel() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string[]>(mockControl.getScenarios())
  const [nftId, setNftId] = useState('emerald-ape-042')
  const [message, setMessage] = useState('')

  let hidden = false
  try {
    hidden = localStorage.getItem('kurio:mock-panel') === 'hidden'
  } catch {
    hidden = false
  }
  if (hidden) return null

  const toggle = (name: ScenarioName) => {
    const next = active.includes(name) ? active.filter((n) => n !== name) : [...active, name]
    mockControl.setScenarios(next)
    setActive(next)
  }

  const run = (label: string, fn: () => unknown) => {
    try {
      fn()
      setMessage(`${label}: ok`)
    } catch (e) {
      setMessage(`${label}: ${(e as Error).message}`)
    }
  }

  const bumpPrice = () => {
    const nft = mockControl.nfts().find((n) => n.id === nftId)
    if (!nft) throw new Error('NFT inexistente')
    const ed = nft.editions.find((e) => e.id === nft.defaultEditionId)!
    mockControl.updateNft(nftId, { price: (Number(ed.price) + 0.1).toFixed(2) })
  }

  return (
    <div className="fixed bottom-24 left-3 z-[60] font-mono text-xs md:bottom-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mock-panel"
        className="flex items-center gap-1 rounded-full border border-primary bg-background/95 px-3 py-2 font-bold text-accent shadow-lg"
      >
        <FlaskConical className="size-4" aria-hidden /> Mocks{active.length ? ` (${active.length})` : ''}
      </button>
      {open && (
        <div id="mock-panel" role="region" aria-label="Painel de mocks" className="mt-2 max-h-[70dvh] w-80 overflow-y-auto rounded-md border border-border bg-surface p-3 shadow-2xl">
          <p className="mb-2 font-bold">Cenários</p>
          <ul className="space-y-1">
            {(Object.keys(SCENARIOS) as ScenarioName[]).map((name) => (
              <li key={name}>
                <label className="flex cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={active.includes(name)} onChange={() => toggle(name)} className="mt-0.5 accent-[var(--primary)]" />
                  <span>
                    <code className="text-accent">{name}</code> — {SCENARIOS[name]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mb-2 mt-4 font-bold">Eventos (Socket.IO)</p>
          <label className="mb-2 flex flex-col gap-1">
            ID do NFT
            <input value={nftId} onChange={(e) => setNftId(e.target.value)} className="rounded-sm border border-border bg-background px-2 py-1" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-sm bg-primary px-2 py-1 font-bold text-primary-foreground" onClick={() => run('Preço +0.10', bumpPrice)}>
              Preço +0.10
            </button>
            <button type="button" className="rounded-sm bg-primary px-2 py-1 font-bold text-primary-foreground" onClick={() => run('Esgotar 1/50', () => mockControl.updateNft(nftId, { available: 0 }))}>
              Esgotar 1/50
            </button>
            <button type="button" className="rounded-sm border border-primary px-2 py-1" onClick={() => run('Duplicado', () => mockControl.emitDuplicateNftEvent(nftId))}>
              Evento duplicado
            </button>
            <button type="button" className="rounded-sm border border-primary px-2 py-1" onClick={() => run('Antigo', () => mockControl.emitStaleNftEvent(nftId))}>
              Evento antigo
            </button>
            <button type="button" className="rounded-sm border border-primary px-2 py-1" onClick={() => run('Queda', () => mockControl.dropRealtime())}>
              Derrubar socket
            </button>
            <button type="button" className="rounded-sm border border-primary px-2 py-1" onClick={() => run('Sessão', () => mockControl.expireSessions())}>
              Expirar sessões
            </button>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-sm bg-destructive px-2 py-2 font-bold text-primary-foreground"
            onClick={async () => {
              await mockControl.reset()
              localStorage.removeItem('kurio:token')
              location.assign('/')
            }}
          >
            Resetar cenário (dados iniciais)
          </button>
          {message && (
            <p role="status" className="mt-2 text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
