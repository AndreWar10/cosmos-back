# cosmos-back

BFF em Node.js + TypeScript para o app Cosmos. Expõe endpoints próprios que agregam NASA APOD, NASA NEO, Spaceflight News e lançamentos SpaceX.

📚 **Documentação completa das rotas:** [docs/API.md](./docs/API.md)

## Stack

- Node.js 20+
- TypeScript
- Express
- Zod (validação)
- Arquitetura limpa (domain → application → infrastructure → presentation)

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

API em `http://localhost:3333`.

> Para produção, defina `NASA_API_KEY` com uma [chave gratuita da NASA](https://api.nasa.gov/).

## Endpoints (resumo)

| Uso no app | EN | PT |
|---|---|---|
| Health | `GET /health` | — |
| Home — imagem do dia | `GET /api/apod` | `GET /api/pt/apod` |
| Home — asteroides | `GET /api/neo` | `GET /api/pt/neo` |
| Solar System | `GET /api/solar-system` (EN) | `GET /api/pt/solar-system` (PT original) |
| News | `GET /api/news` | `GET /api/pt/news` |
| Launches | `GET /api/launches` | `GET /api/pt/launches` |

Params, exemplos de response e erros → [docs/API.md](./docs/API.md)

```bash
curl http://localhost:3333/api/apod
curl http://localhost:3333/api/pt/news?limit=5
curl "http://localhost:3333/api/launches?mode=next"
curl "http://localhost:3333/api/neo?start_date=2026-08-12&end_date=2026-08-13"
```

## Deploy (Render)

1. Conecta o repo no Render
2. Build: `npm ci --include=dev && npm run build`
3. Start: `npm start`
4. Env: `NASA_API_KEY`, `CORS_ORIGIN=*`

## Arquitetura

```
src/
  domain/           entidades + contratos
  application/      use cases
  infrastructure/   NASA / Spaceflight / Launch Library + tradução
  presentation/     rotas, controllers, middlewares, schemas
  main/             composition root (DI)
  shared/           erros, HTTP client, cache
  config/           env
```
