# Kurio — NFT Marketplace

Marketplace de NFTs em React + TypeScript (desafio frontend Jungle Gaming). Todas as APIs, a autenticação, as carteiras, os pagamentos e o tempo real são **simulados na camada de rede** com MSW. Não há backend nem blockchain.

> Enunciado original: [`docs/DESAFIO.md`](docs/DESAFIO.md) · Decisões técnicas: [`ARCHITECTURE.md`](ARCHITECTURE.md)

## Stack

React 19 · TypeScript 5.9 · Vite 7 · TanStack Router (rotas por arquivo) · TanStack Query 5 · Axios · Socket.IO Client 4 · Tailwind CSS 4 · shadcn/ui (Radix) · MSW 2.12 + `@mswjs/socket.io-binding` · Zod 4 · React Hook Form · big.js · Playwright · Lighthouse CI.

## Setup

Requisitos: Node 20.19+ e npm 10.

```bash
npm ci
npx playwright install chromium   # navegador dos testes E2E/Lighthouse
npm run dev                        # http://localhost:5173 (mocks ativos)
```

### Variáveis de ambiente

As variáveis ficam versionadas em `.env.development` e `.env.production`, porque não são segredos e a demo publicada também usa os mocks.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW (REST + Socket.IO simulados). Obrigatório na demo. |
| `VITE_API_URL` | `/api` | Base das rotas REST (interceptadas pelo MSW). |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.mock` | Servidor Socket.IO (interceptado pelo MSW). |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Typecheck + build otimizado (`dist/`) |
| `npm run preview` | Serve o build em `http://localhost:4173` |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (builda e sobe o preview automaticamente) |
| `npm run test:e2e:update` | Atualiza as baselines de regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML (traces das falhas incluídos) |
| `npm run lighthouse` | Build + 3 execuções do Lighthouse por página e perfil (relatórios em `lighthouse/reports`, mediana em `lighthouse/RESULTS.md`) |

## Credenciais fictícias

| Usuário | E-mail | Senha | Observação |
| --- | --- | --- | --- |
| Marina Costa | `marina@kurio.dev` | `Kurio@2026` | Carteiras principal (MetaMask/Ethereum) e secundária (Coinbase/Polygon), 1 favorito |
| Rafael Lima | `rafael@kurio.dev` | `Kurio@2026` | Somente carteira principal, sem favoritos |

As senhas são guardadas como hash SHA-256 com salt no banco simulado. Nenhuma senha fica em texto claro.

**Cupons:** `KURIO10` (10%), `GENESIS` (0.05 ETH), `VERAO2024` (expirado). Qualquer outro código é inválido.

## Cenários de simulação

Os cenários são determinísticos e podem ser combinados. Há três formas de ativá-los:

1. **URL:** `/?scenario=slow,payment-refused`. A escolha fica salva em `localStorage`.
2. **Painel "Mocks":** botão no canto inferior esquerdo, com checkboxes, disparo de eventos Socket.IO e reset.
3. **Testes/console:** `window.__kurioMock.setScenarios(['offline'])`.

| Cenário | Efeito |
| --- | --- |
| `slow` | Todas as respostas levam 2,5 s (mostra os skeletons) |
| `variable-latency` | Latência variável em sequência fixa (100 ms – 2 s) |
| `out-of-order` | 1ª consulta do catálogo responde depois da 2ª |
| `offline` | Todas as chamadas REST falham com erro de rede |
| `catalog-error` | `GET /nfts` responde HTTP 500 |
| `flaky` | A 1ª leitura de cada recurso responde 503 (o retry automático recupera) |
| `empty-catalog` | Catálogo sem resultados |
| `favorites-error` | Favoritar/desfavoritar responde 500 (rollback otimista) |
| `price-change-at-checkout` | Preço sobe 0.10 ETH na 1ª confirmação do pedido (409 `QUOTE_STALE`) |
| `soldout-at-checkout` | Edição esgota na 1ª confirmação |
| `order-timeout` | Pedido é criado, mas a resposta excede o timeout do cliente (recuperação pela chave de idempotência) |
| `payment-refused` | Liquidação recusa o pagamento |
| `manual-settlement` | Pedidos ficam pendentes até `__kurioMock.settleOrder(id, 'confirmed' \| 'refused')` |
| `wallet-rejected` | A carteira recusa a conexão |
| `realtime-offline` | O servidor Socket.IO recusa conexões |

**Reset:** acesse `/?mock-reset` ou use o botão *Resetar cenário* do painel. O banco simulado volta às fixtures e os cenários são limpos.

**Sessão expirada:** `__kurioMock.expireSessions()` ou o botão *Expirar sessões* do painel. A próxima chamada autenticada recebe 401 `SESSION_EXPIRED`.

### Reproduzindo os fluxos de falha

- **Preço muda durante o checkout:** abra o pagamento, conecte a carteira e clique em *Revisar e confirmar compra*. Com o diálogo aberto, use o painel → *Preço +0.10* (ID `emerald-ape-042`). A confirmação fica bloqueada até você clicar em *Revisar novos valores*.
- **Timeout com recuperação:** ative `order-timeout` e confirme a compra. Após 6 s o cliente reenvia com a mesma `Idempotency-Key` e recebe o mesmo pedido.
- **Queda do socket com pedido pendente:** ative `manual-settlement`, confirme a compra e ative `realtime-offline` + *Derrubar socket*. Liquide o pedido pelo console e desative `realtime-offline`: ao reconectar, o recibo aparece.
- **Refresh com pedido pendente:** com `manual-settlement`, recarregue `/pedidos/<id>`. O estado é recuperado e o checkout bloqueia uma nova compra.

## Rotas

| Rota | Tela | Acesso |
| --- | --- | --- |
| `/` | Início (destaques, catálogo, busca, filtros, ordenação, paginação na URL) | público |
| `/nft/:id` | Detalhes do NFT | público |
| `/carrinho` | Carrinho (visitante ou usuário) | público |
| `/entrar`, `/cadastro` | Login / Cadastro (`?redirect=` retorna ao fluxo) | público |
| `/pagamento` | Pagamento | autenticado |
| `/pedidos/:id` | Pendente / recibo confirmado / recusado | autenticado (dono) |
| `/perfil`, `/perfil/carteiras`, `/perfil/favoritos` | Conta do colecionador | autenticado |

## Testes

- 12 grupos E2E (`e2e/01…12-*.spec.ts`) cobrindo os cenários do enunciado. Os testes de REST passam pelos handlers MSW e os de tempo real pelo `socket.io-client`.
- O projeto `desktop-chromium` (1440 px) roda tudo. O `mobile-chromium` (390 px) roda os fluxos marcados com `@principal`.
- Regressão visual (`e2e/visual.spec.ts`) das telas de início, detalhe, carrinho e pagamento, com baselines versionadas em `e2e/__screenshots__`.
- Cada teste usa um contexto de navegador novo. Com o `localStorage` vazio, o banco simulado é recriado a partir das fixtures.

## Lighthouse

Resultados (medianas) em [`lighthouse/RESULTS.md`](lighthouse/RESULTS.md). Os relatórios HTML/JSON de cada execução estão em `lighthouse/reports/`, e a análise fica no `ARCHITECTURE.md`.

## Deploy (Vercel)

1. Importe o repositório na Vercel (framework **Vite**; build `npm run build`; output `dist`).
2. Não é preciso configurar variáveis: `.env.production` já liga os mocks.
3. O `vercel.json` reescreve as rotas para `index.html`, o que permite acesso direto e refresh, e serve o `mockServiceWorker.js` sem cache.
