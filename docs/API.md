# Cosmos API — Documentação de rotas

Base URL local: `http://localhost:3333`  
Produção (Render): `https://<seu-servico>.onrender.com`

Idioma:
- **EN (padrão):** `/api/...`
- **PT (traduzido):** `/api/pt/...`

Envelope padrão das rotas `/api/*`:

```json
{
  "locale": "en" | "pt",
  "data": {}
}
```

---

## Índice

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Lista rápida dos endpoints |
| `GET` | `/health` | Health check |
| `GET` | `/api/apod` | Imagem astronômica do dia |
| `GET` | `/api/pt/apod` | APOD traduzido (PT) |
| `GET` | `/api/news` | Feed de notícias espaciais |
| `GET` | `/api/pt/news` | Notícias traduzidas (PT) |
| `GET` | `/api/launches` | Lançamentos SpaceX |
| `GET` | `/api/pt/launches` | Lançamentos traduzidos (PT) |
| `GET` | `/api/neo` | Asteroides próximos (NEO) |
| `GET` | `/api/pt/neo` | NEO (mesmo payload; dados de catálogo) |

---

## `GET /`

Retorna metadados da API e mapa de rotas.

**Resposta `200`**

```json
{
  "name": "Cosmos API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "apod": "GET /api/apod | GET /api/pt/apod",
    "news": "GET /api/news | GET /api/pt/news",
    "launches": "GET /api/launches | GET /api/pt/launches",
    "neo": "GET /api/neo | GET /api/pt/neo"
  }
}
```

---

## `GET /health`

Health check do serviço.

**Resposta `200`**

```json
{
  "status": "ok",
  "service": "cosmos-back",
  "timestamp": "2026-08-12T15:00:00.000Z"
}
```

---

## `GET /api/apod` · `GET /api/pt/apod`

Imagem/vídeo astronômico do dia (NASA APOD).  
Em `/pt`, traduz `title` e `explanation`.

### Query params

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `date` | `string` (`YYYY-MM-DD`) | não | hoje (UTC NASA) | Data da imagem |

### Exemplos

```http
GET /api/apod
GET /api/apod?date=2026-08-01
GET /api/pt/apod
GET /api/pt/apod?date=2026-08-01
```

### Resposta `200`

```json
{
  "locale": "pt",
  "data": {
    "date": "2026-08-12",
    "title": "Perseidas sobre um pequeno planeta",
    "explanation": "...",
    "url": "https://apod.nasa.gov/...",
    "hdUrl": "https://apod.nasa.gov/...",
    "mediaType": "image",
    "copyright": "..."
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `date` | `string` | Data `YYYY-MM-DD` |
| `title` | `string` | Título |
| `explanation` | `string` | Texto explicativo |
| `url` | `string` | URL da mídia |
| `hdUrl` | `string?` | URL em alta resolução |
| `mediaType` | `string` | `image` ou `video` |
| `copyright` | `string?` | Créditos |
| `thumbnailUrl` | `string?` | Thumbnail (quando disponível) |

---

## `GET /api/news` · `GET /api/pt/news`

Feed de notícias (Spaceflight News API v4).  
Em `/pt`, traduz `title` e `summary` de cada artigo.

### Query params

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `limit` | `number` (1–100) | não | `10` | Qtd. de itens |
| `offset` | `number` (≥ 0) | não | `0` | Paginação |
| `search` | `string` | não | — | Busca textual |

### Exemplos

```http
GET /api/news
GET /api/news?limit=5&offset=10
GET /api/news?search=SpaceX
GET /api/pt/news?limit=5
```

### Resposta `200`

```json
{
  "locale": "en",
  "data": {
    "count": 35605,
    "next": "https://...",
    "previous": null,
    "results": [
      {
        "id": 39459,
        "title": "...",
        "summary": "...",
        "url": "https://...",
        "imageUrl": "https://...",
        "newsSite": "SpaceNews",
        "publishedAt": "2026-08-12T14:00:00Z",
        "updatedAt": "2026-08-12T14:00:46Z",
        "featured": false,
        "authors": [{ "name": "..." }]
      }
    ]
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `count` | `number` | Total de artigos |
| `next` / `previous` | `string \| null` | Links de paginação da fonte |
| `results[].id` | `number` | ID do artigo |
| `results[].title` | `string` | Título |
| `results[].summary` | `string` | Resumo |
| `results[].url` | `string` | Link original |
| `results[].imageUrl` | `string` | Imagem de capa |
| `results[].newsSite` | `string` | Site de origem |
| `results[].publishedAt` | `string` | ISO datetime |
| `results[].featured` | `boolean` | Destaque |
| `results[].authors` | `array` | Autores |

---

## `GET /api/launches` · `GET /api/pt/launches`

Lançamentos SpaceX (via Launch Library 2).  
Em `/pt`, traduz `name` e `details`.

### Query params

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `mode` | `list` \| `latest` \| `next` | não | `list` | Tipo de consulta |
| `limit` | `number` (1–100) | não | `20` | Qtd. (só em `mode=list`) |
| `upcoming` | `true` \| `false` | não | — | Filtra futuros/passados (só em `mode=list`) |

### Modos

| `mode` | Retorno |
|--------|---------|
| `list` | Array de lançamentos |
| `latest` | Último lançamento (objeto) |
| `next` | Próximo lançamento futuro (objeto) |

### Exemplos

```http
GET /api/launches
GET /api/launches?limit=10
GET /api/launches?upcoming=true
GET /api/launches?upcoming=false&limit=5
GET /api/launches?mode=next
GET /api/launches?mode=latest
GET /api/pt/launches?mode=next
```

### Resposta `200` (`mode=list`)

```json
{
  "locale": "en",
  "data": [
    {
      "id": "36ab6924-...",
      "name": "Falcon 9 Block 5 | Starlink Group 10-19",
      "flightNumber": 715,
      "dateUtc": "2026-08-15T21:52:00Z",
      "dateUnix": 1786825920,
      "success": null,
      "upcoming": true,
      "details": "...",
      "rocket": "Falcon 9 Block 5",
      "launchpad": "Space Launch Complex 40",
      "links": {
        "patch": { "small": "...", "large": "..." },
        "webcast": null,
        "wikipedia": "...",
        "article": "...",
        "flickr": { "original": [] }
      },
      "cores": []
    }
  ]
}
```

Com `mode=next` ou `mode=latest`, `data` é um **objeto** (não array).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | ID do lançamento |
| `name` | `string` | Nome da missão |
| `flightNumber` | `number` | Contagem aproximada de tentativas da agência |
| `dateUtc` | `string` | Data/hora UTC (NET) |
| `dateUnix` | `number` | Timestamp Unix |
| `success` | `boolean \| null` | Sucesso (null se ainda não ocorreu) |
| `upcoming` | `boolean` | Ainda não ocorreu |
| `details` | `string \| null` | Descrição da missão |
| `rocket` | `string` | Foguetes / configuração |
| `launchpad` | `string` | Plataforma |
| `links` | `object` | Imagens e links úteis |

---

## `GET /api/neo` · `GET /api/pt/neo`

Asteroides próximos à Terra (NASA NeoWs).  
O path `/pt` existe por consistência; nomes são designações de catálogo e **não** são traduzidos.

### Query params

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `start_date` | `string` (`YYYY-MM-DD`) | não | hoje | Início do intervalo |
| `end_date` | `string` (`YYYY-MM-DD`) | não | `start_date` | Fim do intervalo (máx. **7 dias** na NASA) |

### Exemplos

```http
GET /api/neo
GET /api/neo?start_date=2026-08-12&end_date=2026-08-14
GET /api/pt/neo?start_date=2026-08-12
```

### Resposta `200`

```json
{
  "locale": "en",
  "data": {
    "elementCount": 5,
    "startDate": "2026-08-12",
    "endDate": "2026-08-12",
    "objectsByDate": {
      "2026-08-12": [
        {
          "id": "54051285",
          "neoReferenceId": "54051285",
          "name": "(2020 RC)",
          "nasaJplUrl": "https://ssd.jpl.nasa.gov/...",
          "absoluteMagnitude": 22.1,
          "estimatedDiameterKm": { "min": 0.1, "max": 0.3 },
          "isPotentiallyHazardous": false,
          "isSentryObject": false,
          "closeApproach": {
            "closeApproachDate": "2026-08-12",
            "relativeVelocityKmh": "45231.2",
            "missDistanceKm": "4821931.5",
            "orbitingBody": "Earth"
          }
        }
      ]
    }
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `elementCount` | `number` | Total de objetos no intervalo |
| `startDate` / `endDate` | `string` | Intervalo consultado |
| `objectsByDate` | `Record<string, Neo[]>` | Objetos agrupados por data |
| `isPotentiallyHazardous` | `boolean` | Potencialmente perigoso |
| `closeApproach` | `object \| null` | Dados da aproximação mais relevante |

---

## Erros

Formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "date must be YYYY-MM-DD"
  }
}
```

| HTTP | `code` | Quando |
|------|--------|--------|
| `400` | `VALIDATION_ERROR` | Query inválida |
| `404` | `NOT_FOUND` | Recurso não encontrado (ex.: next launch) |
| `502` | `UPSTREAM_ERROR` | Falha na API externa |
| `500` | `INTERNAL_ERROR` | Erro interno |

---

## Uso no app

| Tela | Endpoints sugeridos |
|------|---------------------|
| Home | `GET /api/apod` + `GET /api/neo` (ou `/api/pt/...`) |
| News | `GET /api/news?limit=20` |
| Launches | `GET /api/launches?mode=next` e/ou `?upcoming=true` |

---

## Fontes externas

| Rota Cosmos | Fonte |
|-------------|-------|
| `/api/apod` | [NASA APOD](https://api.nasa.gov/planetary/apod) |
| `/api/neo` | [NASA NeoWs Feed](https://api.nasa.gov/neo/rest/v1/feed) |
| `/api/news` | [Spaceflight News v4](https://api.spaceflightnewsapi.net/v4/articles/) |
| `/api/launches` | [Launch Library 2](https://ll.thespacedevs.com/2.2.0/launch) (filtro SpaceX) |
