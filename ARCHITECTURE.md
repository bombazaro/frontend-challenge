# Arquitetura

## Camadas

```
src/
├── contracts/     Contratos tipados (REST + eventos) e schemas Zod — compartilhados por app e mocks
├── lib/           Infra: Axios (http.ts), erro normalizado, QueryClient, dinheiro (big.js), storage
├── api/           Funções REST por recurso + query keys + queryOptions (única porta de acesso à rede)
├── features/      Hooks de domínio (sessão, carrinho, favoritos, carteiras, checkout) sobre TanStack Query
├── realtime/      Socket.IO: criação do socket, guard de eventos, aplicação no cache, anúncios aria-live
├── components/    UI: ui/ (shadcn adaptado), layout/, catalog/, nft/, cart/, checkout/, profile/, common/
├── routes/        TanStack Router (file-based). _auth = layout que protege rotas privadas
└── mocks/         Servidor simulado: db persistido, domínio, handlers MSW, Socket.IO, cenários, painel
```

**Fluxo de dados:** `componente → hook (features) → queryOptions/mutation (api) → Axios → [MSW] → handler → db`.
Componentes, hooks e o cliente Axios **não têm** respostas fictícias. Tudo o que é simulado vive em `src/mocks`, que só é carregado com `VITE_ENABLE_MOCKS=true`.

## Contratos REST

Base `/api`. Todos os erros seguem `{ error: { code, message, fieldErrors?, details? } }`.

| Método e rota | Corpo / parâmetros | Respostas |
| --- | --- | --- |
| `POST /auth/register` | `{ username, email, password }` | 201 `AuthResponse` · 422 `VALIDATION_ERROR` · 409 `EMAIL_TAKEN`/`USERNAME_TAKEN` |
| `POST /auth/login` | `{ email, password }` | 200 `AuthResponse` · 401 `INVALID_CREDENTIALS` |
| `GET /auth/session` | Bearer | 200 `Session` · 401 `UNAUTHENTICATED`/`SESSION_EXPIRED` |
| `POST /auth/logout` | Bearer | 204 |
| `GET /nfts` | `q, category, network, minPrice, maxPrice, tab, sort, page, pageSize` | 200 `NftListResponse` (itens, paginação e facetas) · 500 |
| `GET /nfts/featured` | — | 200 `NftSummary[]` |
| `GET /nfts/:id` · `/nfts/:id/reviews` | — | 200 · 404 `NOT_FOUND` |
| `GET/POST /favorites` · `DELETE /favorites/:nftId` | `{ nftId }` | 200/201 `{ nftIds }` · 401 · 404 · 500 |
| `GET /cart` | Bearer **ou** `X-Cart-Id` | 200 `Cart` |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | 201 `Cart` · 409 `EDITION_UNAVAILABLE`/`QUANTITY_LIMIT` · 422 |
| `PATCH /cart/items/:id` · `DELETE /cart/items/:id` | `{ quantity }` | 200 `Cart` · 404 · 409 `QUANTITY_LIMIT` |
| `PUT /cart/coupon` · `DELETE /cart/coupon` | `{ code }` | 200 `Cart` · 422 `COUPON_INVALID`/`COUPON_EXPIRED` |
| `POST /cart/acknowledge` | — | 200 `Cart` (o usuário reconheceu as mudanças de preço) |
| `POST /cart/merge` | `{ guestCartId }` | 200 `Cart` (carrinho do visitante → usuário) |
| `POST /quote` | `{ network }` | 200 `Quote` (subtotal, desconto, taxa, total, problemas, `purchasable`) |
| `POST /orders` | `Idempotency-Key` + `{ quoteId, walletId, network, collector }` | 201 novo · 200 mesma tentativa · 409 `IDEMPOTENCY_CONFLICT`/`QUOTE_STALE` (com a nova cotação em `details.quote`)/`WALLET_NOT_CONNECTED` · 403 · 422 |
| `GET /orders/:id` | Bearer | 200 `Order` · 403 `FORBIDDEN` · 404 |
| `GET/PUT /profile` · `PUT /profile/avatar` · `PUT /profile/password` | — | 200/204 · 409 · 422 `VALIDATION_ERROR`/`INVALID_PASSWORD` |
| `GET/POST /wallets` · `PUT /wallets/:id` | `UpsertWalletRequest` | 200/201 · 409 `ADDRESS_TAKEN` · 422 · 403 |
| `POST /wallets/:id/connect` · `/disconnect` | `{ network }` | 200 `WalletConnection` · 403 `WALLET_REJECTED` · 204 |

Os tipos completos estão em `src/contracts/api.ts`. **Valores em ETH sempre trafegam como string decimal**: o cliente formata com `big.js` e nunca soma valores para decidir o total. A cotação do servidor é a referência.

## Eventos (Socket.IO)

```ts
interface RealtimeEnvelope<Type, Resource, Data> {
  eventId: string               // identidade estável (deduplicação)
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order'; id: string }
  version: number               // versão do recurso após o evento (ordenação)
  occurredAt: string
  data: Data
}
```

- `nft.updated` (público): `{ nftId, name, price, soldOut, editions[{ id, price, available }] }`. Atualiza catálogo, destaques e detalhe direto no cache, desde que `version` seja maior que a versão em cache. Se o NFT estiver no carrinho, invalida carrinho e cotação (os valores oficiais voltam do REST) e anuncia a mudança por toast e região `aria-live`.
- `order.updated` (privado): `{ orderId, userId, status, txHash, failureReason }`. Só é enviado aos sockets autenticados do dono, e o cliente ainda confere o `userId`. Estados `confirmed` e `refused` são terminais e nunca regridem.

**Guard no cliente** (`realtime/event-guard.ts`): descarta `eventId` repetido e `version <= última vista`. Uma segunda barreira compara com a `version` em cache, que veio do REST.

**Ciclo de vida:** há um socket por sessão (`RealtimeProvider`). Login, logout ou troca de usuário encerram o socket anterior, removem todos os listeners e descartam o guard. O token vai na query da conexão, e o servidor simulado associa o socket ao usuário.

**Reconexão:** ao reconectar, o cliente invalida `nfts`, `cart`, `quote` e os pedidos do usuário, reconciliando os recursos ativos com o REST. A página do pedido pendente também faz polling a cada 4 s como rede de segurança.

### Transporte nos mocks e limitações

- O `socket.io-client` usa `transports: ['websocket']`. O MSW intercepta `WebSocket` no navegador, e o `@mswjs/socket.io-binding` codifica e decodifica os pacotes Engine.IO/Socket.IO. Long-polling não é suportado pelo binding.
- O socket.io-client guarda o construtor `WebSocket` quando o módulo é carregado. Por isso o `main.tsx` inicia o MSW **antes** de importar a aplicação (`import('./bootstrap')`).
- O MSW remove o prefixo `/socket.io/` antes de comparar as URLs, então o `ws.link` usa só a origem (`wss://realtime.kurio.mock`).
- O binding não envia `ping` do Engine.IO. O servidor simulado envia `"2"` a cada 20 s; sem isso, o cliente desconectaria após `pingInterval + pingTimeout`.
- O binding não implementa rooms nem namespaces. O roteamento por usuário é feito no registro de conexões do mock.
- **Versão do MSW:** foi fixada em `2.12.x`. A família 2.15 reescreveu a camada de interceptação ("network sources"), e a combinação com o binding não foi validada.

## Estado e cache (TanStack Query)

- **Query keys** (`api/keys.ts`): os dados públicos ficam em `['nfts', …]` e os privados em `['user', userId, …]`. O carrinho e a cotação usam `['cart', owner]` e `['quote', owner, network, cartRevision]`, onde `owner` é `user:<id>` ou `guest:<cartId>`.
- **staleTime:** 30 s para leituras, 10 s para o carrinho e 0 para a cotação, que é sempre recalculada.
- **Retry:** só para falhas transitórias (rede, timeout, 5xx), no máximo 2 vezes, com backoff de 0,8 s, 1,6 s e até 4 s. Mutations não repetem automaticamente, exceto a criação de pedido, que é idempotente: até 3 tentativas com a mesma chave.
- **Respostas obsoletas:** cada consulta recebe o `signal` do Query, então o Axios cancela a requisição quando os parâmetros mudam. Como os parâmetros fazem parte da chave, uma resposta antiga nunca sobrescreve outra combinação de filtros. `placeholderData: keepPreviousData` evita que a tela pisque.
- **Atualização otimista:** favoritos usam `onMutate`, com snapshot e rollback no `onError` e invalidação no `onSettled`.
- **Invalidação após mutations:** as mutations do carrinho gravam o carrinho retornado e invalidam a cotação. A confirmação do pedido invalida carrinho e cotação. Os eventos invalidam os recursos afetados.
- **URL como estado:** busca, filtros, aba, ordenação e página ficam em `validateSearch` (Zod). Mudar um filtro reinicia a paginação. A busca usa debounce com `replace`, e os demais filtros criam uma entrada no histórico.

## Sessão

- O token fica em `localStorage`. A sessão é validada em `GET /auth/session` no boot, o que permite recuperá-la após refresh.
- O layout `_auth` faz `ensureQueryData(session)` no `beforeLoad` e redireciona para `/entrar?redirect=<href>`.
- **Expiração:** um interceptor do Axios detecta 401 `SESSION_EXPIRED`/`UNAUTHENTICATED` em requisição autenticada. Ele limpa o token e os dados privados e leva a `/entrar?redirect=<href atual>&motivo=expirada`. O rascunho do checkout fica em `sessionStorage` e é restaurado após o login.
- **Logout e troca de usuário:** `removeQueries(['user'|'cart'|'quote'])`, limpeza da tentativa de checkout, troca do socket e novo id de carrinho de visitante.

## Carrinho

- O visitante tem um carrinho no servidor identificado por `X-Cart-Id`, um UUID local, e por isso o carrinho sobrevive a refresh. No login, `POST /cart/merge` soma os itens respeitando os limites. A mesclagem roda **antes** de a sessão ser publicada no cache, para evitar ler o carrinho vazio.
- Cada item guarda `acknowledgedPrice`. Quando o preço atual diverge, o item recebe `issue: 'price_changed'` e a interface destaca a mudança até o usuário clicar em *Entendi* (`/cart/acknowledge`). Itens esgotados ou com estoque reduzido bloqueiam a finalização.
- A disponibilidade por edição define o limite: `min(available, maxPerOrder)`.

## Checkout, idempotência e pedidos

1. O formulário é validado com o schema Zod compartilhado. A carteira precisa estar conectada na rede escolhida.
2. **Revisão** (diálogo com foco preso): grava a assinatura dos valores revisados. Se um evento ou refetch alterar a cotação, *Confirmar* fica desabilitado até o usuário clicar em *Revisar novos valores*.
3. **Envio:** a `Idempotency-Key` é derivada do payload e guardada em `sessionStorage`. O mesmo payload reutiliza a mesma chave, o que cobre duplo clique, retry após timeout e refresh. O botão também fica desabilitado enquanto envia.
4. **Servidor:** com a mesma chave e o mesmo conteúdo, devolve o mesmo pedido (200). Com conteúdo diferente, responde 409. Antes de criar o pedido, revalida a cotação (preço, quantidade, disponibilidade, cupom e taxa) e responde 409 `QUOTE_STALE` com a nova cotação se algo mudou.
5. **Pedido `pending`:** é liquidado depois de 2,5 s, como `confirmed` ou `refused`. A liquidação revalida o estoque, debita a disponibilidade, remove do carrinho só os itens e quantidades comprados e emite os eventos. Se a página recarregar, o mock retoma os timers, e o `GET` liquida pedidos vencidos.
6. **Recibo:** é o snapshot das linhas e dos valores da cotação no momento do pedido. Mudanças posteriores no catálogo não o alteram.

## Mocks (MSW)

- `db.ts`: estado consistente entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos, persistido em `localStorage` (`kurio:mock-db:v1`). O `resetDb()` restaura as fixtures.
- `data/fixtures.ts`: 48 NFTs gerados com PRNG de seed fixa. Os 9 primeiros reproduzem o Figma.
- `scenarios.ts`: cenários combináveis e determinísticos. Gatilhos `once()` disparam só na primeira tentativa.
- `control.ts`: `window.__kurioMock`, usado pelo painel e pelos testes. Ele só altera o "servidor"; a interface recebe tudo via REST e Socket.IO.

## Acessibilidade

- Skip link, foco visível (`:focus-visible` com contraste AA), `aria-current` na navegação e na paginação.
- Diálogos e drawer (Radix) prendem o foco, fecham com Esc e devolvem o foco ao gatilho.
- Os campos usam `<label>`, `aria-invalid` e `aria-describedby` apontando para a mensagem de erro. Erros vindos da API voltam para os campos (`setError`).
- Toasts (sonner) e uma região `aria-live` própria anunciam mutations e mudanças em tempo real.
- Estados não dependem só de cor: há texto como "esgotada", "Preço alterado: era…" e "Conectada", além de ícones.
- Imagens de NFT têm `alt` descritivo, e as decorativas usam `alt=""`. O layout funciona de 320 px a 1440 px, sem overflow horizontal e com zoom de 200%.
- `prefers-reduced-motion` desliga o shimmer e as transições.

## Desvios do Figma e decisões de UX

- **Assets:** as artes dos NFTs foram recortadas das exportações das telas do Figma (`public/nfts/*.webp`), porque o arquivo não permitia exportar os originais. A fonte usada é Roboto Mono (`@fontsource`, servida localmente).
- **Cabeçalho mobile:** segue o Figma (sem cabeçalho e com barra de navegação inferior). O login no mobile fica acessível pelo ícone *Perfil*.
- **Busca:** o Figma não mostra um campo de busca no desktop. Adicionei o campo acima do catálogo, e o ícone de lupa do cabeçalho leva o foco até ele.
- **Pagamento:** endereço, ENS e tipo de carteira são somente leitura, porque vêm da carteira cadastrada selecionada. A seleção de carteira inclui *Conectar* e *Desconectar*, e *Usar outra carteira?* mostra a carteira secundária. O botão do Figma "Confirmar compra" abre primeiro a revisão, como o enunciado exige.
- **Perfil:** dados e senha usam dois formulários (*Salvar* e *Alterar senha*), para que os erros de cada um fiquem claros.
- **Fora do escopo** (Criadores, Aprenda, blog, atividade, ofertas, downloads, suporte, login social, recuperação de senha, newsletter): os botões mostram o toast "não está disponível nesta demonstração" e não simulam sucesso.
- **Links do explorer:** são simulados (`etherscan.io/tx/<hash fictício>`) e identificados para leitores de tela.

## Performance (Lighthouse)

As medianas de 3 execuções estão em `lighthouse/RESULTS.md`. O desktop atinge todas as metas: Performance 92–96, Accessibility 97–100, Best Practices 100, SEO 100. No **mobile**, Accessibility, Best Practices e SEO atingem as metas, mas **Performance fica entre 61 e 69** (varia com a carga da máquina):

- **Causa principal:** TBT de 1,0–1,3 s com o throttling de CPU 4x. A demo precisa iniciar o MSW (registro do Service Worker, handlers, banco simulado e fixtures) **antes** de carregar a aplicação, porque o socket.io-client só pode ser carregado depois da interceptação do WebSocket. Isso cria uma cadeia sequencial: `main` → mocks (cerca de 760 ms de scripting) → aplicação (cerca de 1 s de scripting na primeira renderização).
- **LCP de 3,2–4,0 s:** a imagem do hero tem `preload` e `fetchpriority=high`, mas só é pintada depois de o React renderizar, o que por sua vez espera o MSW.
- **CLS:** cerca de 0,02 no mobile. No detalhe desktop chega a 0,11, causado pela troca do skeleton pelo bloco de informações (alturas diferentes); a correção seria reservar a altura final no skeleton. Nas demais telas, skeletons com as mesmas dimensões e `width`/`height` nas imagens evitam deslocamentos.
- **Em produção real** (sem MSW no caminho crítico), o primeiro passo sumiria. Outras otimizações possíveis: SSR/streaming, pré-renderizar o hero e dividir as fixtures em chunks carregados sob demanda.
