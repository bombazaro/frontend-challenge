import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFound({ title = 'Página não encontrada', description = 'O endereço acessado não existe ou foi removido.' }: { title?: string; description?: string }) {
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold text-accent" aria-hidden>
        404
      </p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
