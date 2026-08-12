# cosmos-back

BFF em Node.js + TypeScript para o app Cosmos. Expõe endpoints próprios que agregam NASA APOD, NASA NEO, Spaceflight News e lançamentos SpaceX.

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

> Para produção, troque `NASA_API_KEY=DEMO_KEY` por uma [chave gratuita da NASA](https://api.nasa.gov/).

## Endpoints

| Uso no app | EN (original) | PT (traduzido) |
|---|---|---|
| Home — imagem do dia | `GET /api/apod` | `GET /api/pt/apod` |
| Home — asteroides | `GET /api/neo` | `GET /api/pt/neo` |
| News | `GET /api/news` | `GET /api/pt/news` |
| Launches | `GET /api/launches` | `GET /api/pt/launches` |

Também: `GET /health` e `GET /`.

### Query params

**APOD**
- `date` — `YYYY-MM-DD` (opcional)

**News**
- `limit` — default `10`
- `offset` — default `0`
- `search` — busca textual

**Launches**
- `limit` — default `20`
- `upcoming` — `true` \| `false`
- `mode` — `list` \| `latest` \| `next`

**NEO**
- `start_date` — `YYYY-MM-DD` (default: hoje)
- `end_date` — `YYYY-MM-DD` (máx. 7 dias de intervalo na API da NASA)

### Exemplo

```bash
curl http://localhost:3333/api/apod
curl http://localhost:3333/api/pt/news?limit=5
curl "http://localhost:3333/api/launches?mode=next"
curl "http://localhost:3333/api/neo?start_date=2026-08-12&end_date=2026-08-13"
```

Resposta padrão:

```json
{
  "locale": "pt",
  "data": {}
}
```

## Arquitetura

```
src/
  domain/           entidades + contratos (repositories/services)
  application/      use cases
  infrastructure/   clients NASA / Spaceflight / SpaceX + tradução
  presentation/     rotas, controllers, middlewares, schemas
  main/             composition root (DI)
  shared/           erros, HTTP client, tipos
  config/           env
```

Tradução (`/pt`) usa MyMemory (gratuito). Se a cota diária esgotar, a API devolve o texto original sem quebrar a resposta.

## Fontes externas

| Endpoint Cosmos | Fonte |
|---|---|
| `/api/apod` | NASA APOD |
| `/api/neo` | NASA NeoWs |
| `/api/news` | Spaceflight News API v4 |
| `/api/launches` | Launch Library 2 (SpaceX) — a `api.spacexdata.com` foi arquivada e está fora do ar |
