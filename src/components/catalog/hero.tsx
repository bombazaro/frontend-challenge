import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { featuredQueryOptions } from '@/api/nfts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Carrossel de destaques: troca manual (sem autoplay, respeitando movimento reduzido e LCP). */
export function Hero() {
  const featured = useQuery(featuredQueryOptions)
  const [index, setIndex] = useState(0)
  const slides = featured.data ?? []
  const current = slides[index]
  // A 1ª imagem é estática (preload no index.html) para garantir um LCP rápido
  const image = index === 0 || !current ? '/nfts/hero.webp' : current.image

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="page-container">
      <div className="relative mt-4 overflow-hidden rounded-3xl bg-surface p-4 md:mt-8 md:grid md:grid-cols-[1fr_450px] md:items-center md:gap-10 md:rounded-none md:bg-transparent md:p-0">
        <div className="relative z-10 max-w-[60%] md:max-w-none md:px-10">
          <p className="mb-2 text-xs font-medium tracking-[0.15em] md:mb-4 md:text-sm">Bem-vindo à Kurio</p>
          <h1 className="text-lg font-bold leading-snug tracking-wide md:text-[44px] md:leading-[70px]">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </h1>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground md:mt-4 md:max-w-xl md:text-sm md:leading-6">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <Button asChild className="mt-4 hidden md:inline-flex md:mt-8" size="lg">
            <Link to="/" hash="catalogo">
              EXPLORAR
            </Link>
          </Button>
          <Link to="/" hash="catalogo" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-accent md:hidden">
            EXPLORAR <ArrowRight className="size-4" aria-hidden />
          </Link>
          <div className="mt-4 flex gap-2 md:mt-12 md:justify-end" role="group" aria-label="Escolher destaque">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Destaque ${i + 1}${slides[i] ? `: ${slides[i].name}` : ''}`}
                aria-pressed={i === index}
                className={cn('size-3 rounded-full border border-primary', i === index ? 'bg-primary' : 'bg-primary/40')}
              />
            ))}
          </div>
        </div>
        <div className="absolute right-3 top-3 w-[38%] md:static md:w-full">
          <img
            src={image}
            alt={current ? `Destaque: ${current.name}` : 'Destaque: Emerald Ape #042'}
            width={450}
            height={450}
            fetchPriority="high"
            decoding="async"
            className="aspect-square w-full rounded-2xl object-cover md:rounded-3xl"
          />
          {current && (
            <Link to="/nft/$nftId" params={{ nftId: current.id }} className="sr-only focus:not-sr-only">
              Ver {current.name}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
