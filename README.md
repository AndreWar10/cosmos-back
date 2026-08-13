# cosmos-back

BFF em **Node.js + TypeScript** para o app **Cosmos**.

Expõe uma API própria (EN e PT) que agrega fontes de espaço, normaliza o JSON e traduz o que o app precisa — sem o front falar direto com NASA, Spaceflight News ou Launch Library.

**Produção:** [https://cosmos-back-cme4.onrender.com](https://cosmos-back-cme4.onrender.com)

**Documentação completa das rotas:** [docs/API.md](./docs/API.md)

---

## O que o back entrega

| Recurso | Rota EN | Rota PT | Fonte | O que o app recebe |
|---------|---------|---------|-------|--------------------|
| Imagem do dia | `/api/apod` | `/api/pt/apod` | NASA APOD | Título, texto, URL da mídia |
| Notícias | `/api/news` | `/api/pt/news` | Spaceflight News | Lista paginada (título + resumo) |
| Lançamentos SpaceX | `/api/launches` | `/api/pt/launches` | Launch Library 2 | Lista, próximo ou último |
| Asteroides (NEO) | `/api/neo` | `/api/pt/neo` | NASA NeoWs | Objetos próximos por data |
| Sistema solar | `/api/solar-system` | `/api/pt/solar-system` | MockAPI | Sol + planetas (+ Plutão) |

Envelope padrão:

```json
{ "locale": "pt", "data": { } }
```

- **`/api/...`** → inglês  
- **`/api/pt/...`** → português (quando há texto traduzível)

Nuances importantes:

- **NEO:** `/pt` existe por consistência; nomes de catálogo **não** são traduzidos.
- **Sistema solar:** a fonte já é PT. `/api/pt/solar-system` = original; `/api/solar-system` = EN. Conteúdo estático — pode ficar fixo no front.
- **Launches:** lista só com `limit` + `offset`. **Não** há filtro `upcoming` / `status` (rate limit da Launch Library). Use `mode=next` / `mode=latest` para um item, ou filtre no front com o campo `upcoming` de cada item.

Detalhes de query, exemplos de response e erros → [docs/API.md](./docs/API.md).

---

## Stack

- Node.js 20+
- TypeScript + Express
- Zod (validação de query)
- Tradução com fallbacks (`google-translate-api-x` / GTX / MyMemory)
- Cache em memória (SWR) — servidor always-on no Render Starter
- Arquitetura limpa: domain → application → infrastructure → presentation

---

## Setup local

```bash
cp .env.example .env
npm install
npm run dev
```

API em `http://localhost:3333`.

### Variáveis de ambiente

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `PORT` | não | `3333` | Porta HTTP |
| `NODE_ENV` | não | `development` | Ambiente |
| `NASA_API_KEY` | recomendada | `DEMO_KEY` | [Chave gratuita NASA](https://api.nasa.gov/) |
| `CORS_ORIGIN` | não | `*` | Origens CORS (`*` ou lista separada por vírgula) |
| `LAUNCH_LIBRARY_TOKEN` | não | — | Token opcional; sobe o rate limit da Launch Library |

---

## Endpoints (resumo)

| Uso no app | EN | PT |
|---|---|---|
| Health | `GET /health` | — |
| Home — imagem do dia | `GET /api/apod` | `GET /api/pt/apod` |
| Home — asteroides | `GET /api/neo` | `GET /api/pt/neo` |
| News | `GET /api/news` | `GET /api/pt/news` |
| Launches | `GET /api/launches` | `GET /api/pt/launches` |
| Solar System | `GET /api/solar-system` | `GET /api/pt/solar-system` |

```bash
curl http://localhost:3333/health
curl http://localhost:3333/api/apod
curl "http://localhost:3333/api/pt/news?limit=5"
curl "http://localhost:3333/api/launches?mode=next"
curl "http://localhost:3333/api/launches?limit=20&offset=0"
curl "http://localhost:3333/api/neo?start_date=2026-08-12&end_date=2026-08-13"
curl http://localhost:3333/api/pt/solar-system
```

### Launches — modos

| Query | Retorno |
|-------|---------|
| `?limit=20&offset=0` | Lista paginada (mistura próximos e passados) |
| `?mode=next` | Próximo lançamento |
| `?mode=latest` | Último realizado |

---

## Cache (resumo)

O servidor mantém respostas quentes em memória:

- **News** (~15 min) e **Launches** (~30 min) cacheiam a resposta **já localizada** (EN/PT)
- Prefetch da **próxima página** após cada lista
- **Warmup** no boot + refresh a cada **15 min** (page 0, `next`, `latest`)
- Traduções de string ficam ~6 h
- Se a fonte falhar (ex.: 429) e houver valor antigo → pode devolver **stale**

Mais detalhes em [docs/API.md](./docs/API.md#cache-e-performance).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev com hot reload (`tsx watch`) |
| `npm run build` | Compila TypeScript → `dist/` |
| `npm start` | Sobe a API compilada |
| `npm run typecheck` | Typecheck sem emitir |

---

## Deploy (Render)

Configurado em [`render.yaml`](./render.yaml) (plano **Starter**, always-on).

1. Conecta o repo no Render  
2. Build: `npm ci --include=dev && npm run build`  
3. Start: `npm start`  
4. Env: `NASA_API_KEY`, `CORS_ORIGIN=*` (e opcionalmente `LAUNCH_LIBRARY_TOKEN`)

URL atual: `https://cosmos-back-cme4.onrender.com`

---

## Arquitetura

```
src/
  domain/           entidades + contratos
  application/      use cases
  infrastructure/   NASA / Spaceflight / Launch Library / MockAPI + tradução
  presentation/     rotas, controllers, middlewares, schemas
  main/             composition root (DI) + warmup
  shared/           erros, HTTP client, cache, utils
  config/           env + URLs externas
```

---

## Licença

MIT
