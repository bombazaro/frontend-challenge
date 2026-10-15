import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notAvailable } from '@/components/common/not-available'

const promos = [
  { title: 'Lançamentos gênesis de edição limitada', text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.', image: '/nfts/emerald-ape.webp', aba: 'novos' as const },
  { title: 'Arte digital selecionada e muito mais', text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.', image: '/nfts/ivory-baron.webp', aba: 'em-alta' as const },
]

const posts = [
  { date: '12 de setembro', read: 6, title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.', image: '/nfts/ivory-baron.webp' },
  { date: '13 de setembro', read: 2, title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.', image: '/nfts/emerald-ape.webp' },
  { date: '15 de setembro', read: 3, title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.', image: '/nfts/sage-nomad.webp' },
  { date: '15 de setembro', read: 2, title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.', image: '/nfts/golden-beat.webp' },
]

export function Promos() {
  return (
    <section aria-label="Coleções em destaque" className="page-container mt-24 grid gap-8 lg:grid-cols-2">
      {promos.map((p) => (
        <article key={p.title} className="grid grid-cols-[minmax(0,0.9fr)_1fr] items-center overflow-hidden rounded-md bg-surface">
          <img src={p.image} alt="" width={480} height={480} loading="lazy" className="h-full w-full rounded-xl object-cover" />
          <div className="flex flex-col items-end gap-3 p-4 text-right sm:p-8">
            <h2 className="text-sm font-bold sm:text-lg">{p.title}</h2>
            <p className="text-xs leading-6 text-muted-foreground sm:text-sm">{p.text}</p>
            <Button asChild size="sm" className="font-medium">
              <Link to="/" search={{ aba: p.aba }} hash="catalogo">
                Explorar <ArrowRight className="size-4" aria-hidden />
                <span className="sr-only">{p.title}</span>
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

export function Journal() {
  return (
    <section aria-labelledby="diario" className="page-container mt-24">
      <h2 id="diario" className="text-center text-2xl font-bold md:text-3xl">
        Diário da Cunhagem
      </h2>
      <p className="mt-4 text-center text-sm text-muted-foreground">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <article key={post.title} className="overflow-hidden rounded-md bg-surface">
            <img src={post.image} alt="" width={480} height={480} loading="lazy" className="h-48 w-full object-cover" />
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-muted-foreground">
                {post.date} | Leitura de {post.read} min
              </p>
              <h3 className="font-bold">{post.title}</h3>
              <p className="text-xs leading-5 text-muted-foreground">{post.text}</p>
              <button type="button" className="self-start text-xs font-bold text-accent hover:underline" onClick={() => notAvailable('O blog')}>
                Ler mais <span aria-hidden>→</span>
                <span className="sr-only">sobre {post.title}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
