import { Link } from '@tanstack/react-router'
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notAvailable } from '@/components/common/not-available'

const features = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const socials = [
  { label: 'Facebook', icon: Facebook, href: 'https://facebook.com' },
  { label: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
  { label: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { label: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
  { label: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
]

export function WalletsStrip() {
  return (
    <p className="inline-flex flex-wrap items-center gap-2 rounded-md border border-surface-2 bg-surface-2 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-accent">
      METAMASK <span aria-hidden>•</span> WALLETCONNECT <span aria-hidden>•</span> COINBASE
    </p>
  )
}

export function Footer() {
  return (
    <footer className="page-container mt-24 mb-24 md:mb-6">
      <div className="bg-surface">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.3fr] lg:px-12">
          {features.map((f) => (
            <div key={f.title} className="lg:border-r lg:border-primary lg:pr-6">
              <span aria-hidden className="mb-4 flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {f.letter}
              </span>
              <h2 className="mb-2 text-base font-bold md:text-lg">{f.title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{f.text}</p>
            </div>
          ))}
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              notAvailable('A newsletter')
            }}
          >
            <h2 className="text-lg font-bold leading-5">Antecipe-se ao próximo lançamento</h2>
            <div className="flex">
              <label htmlFor="newsletter" className="sr-only">
                E-mail para newsletter
              </label>
              <Input id="newsletter" type="email" placeholder="digite seu e-mail..." className="rounded-r-none border-0 bg-background" />
              <Button type="submit" className="rounded-l-none text-lg">
                Enviar
              </Button>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          </form>
        </div>
        <div className="grid gap-4 bg-surface-2 px-6 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <p className="font-bold tracking-[0.2em]">KURIO</p>
          <p>Feito para colecionadores, criadores e cultura</p>
          <p>contato@email.com</p>
          <p>+55 11 4002 8922</p>
        </div>
        <div className="grid gap-8 px-6 py-8 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <nav aria-label="Meu perfil">
            <h2 className="mb-3 text-lg font-bold">Meu perfil</h2>
            <ul className="space-y-3">
              <li><Link to="/perfil" className="hover:text-accent">Meu perfil</Link></li>
              <li><Link to="/perfil/carteiras" className="hover:text-accent">Minhas carteiras</Link></li>
              <li><Link to="/perfil/favoritos" className="hover:text-accent">Lista de interesse</Link></li>
              <li><button type="button" className="hover:text-accent" onClick={() => notAvailable('Atividade')}>Atividade</button></li>
              <li><button type="button" className="hover:text-accent" onClick={() => notAvailable('O estúdio do criador')}>Estúdio do criador</button></li>
            </ul>
          </nav>
          <nav aria-label="Central de ajuda">
            <h2 className="mb-3 text-lg font-bold">Central de ajuda</h2>
            <ul className="space-y-3">
              {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((t) => (
                <li key={t}><button type="button" className="hover:text-accent" onClick={() => notAvailable(t)}>{t}</button></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Coleções">
            <h2 className="mb-3 text-lg font-bold">Coleções</h2>
            <ul className="space-y-3">
              {([['arte-digital', 'Arte digital'], ['fotografia', 'Fotografia'], ['musica', 'Música'], ['arte-3d', 'Arte 3D'], ['utilidade', 'Utilidade']] as const).map(([id, label]) => (
                <li key={id}>
                  <Link to="/" search={{ categoria: [id] }} hash="catalogo" className="hover:text-accent">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="mb-3 text-lg font-bold">Redes sociais</h2>
            <ul className="mb-6 flex gap-2">
              {socials.map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (abre em nova aba)`} className="flex size-8 items-center justify-center rounded-sm border border-primary text-accent hover:bg-primary/10">
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <h2 className="mb-3 text-lg font-bold">Carteiras compatíveis</h2>
            <WalletsStrip />
          </div>
        </div>
      </div>
      <p className="py-4 text-center text-sm">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
