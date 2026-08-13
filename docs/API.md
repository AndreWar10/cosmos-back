# Cosmos API — Documentação de rotas

BFF do app **Cosmos**. Agrega fontes externas (NASA, Spaceflight News, Launch Library, MockAPI) e devolve payloads estáveis, com suporte a **EN** e **PT**.

| Ambiente | Base URL |
|----------|----------|
| Local | `http://localhost:3333` |
| Produção (Render) | `https://cosmos-back-cme4.onrender.com` |

---

## Idioma (locale)

| Path | Locale | Comportamento |
|------|--------|---------------|
| `/api/...` | `en` | Resposta em inglês (padrão) |
| `/api/pt/...` | `pt` | Texto traduzido para português |

Envelope padrão das rotas `/api/*`:

```json
{
  "locale": "en",
  "data": {}
}
```

**Exceções / nuances**

| Rota | Observação |
|------|------------|
| APOD, News, Launches | Fonte em EN → `/pt` traduz campos de texto |
| NEO | Nomes são designações de catálogo; `/pt` existe por consistência, **não** traduz |
| Solar System | Fonte já é **PT** → `/api/pt/solar-system` = original; `/api/solar-system` = traduzido EN |

---

## Índice

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Metadados + mapa de endpoints |
| `GET` | `/health` | Health check |
| `GET` | `/api/apod` | Imagem astronômica do dia (EN) |
| `GET` | `/api/pt/apod` | APOD traduzido (PT) |
| `GET` | `/api/news` | Feed de notícias (EN) |
| `GET` | `/api/pt/news` | Notícias traduzidas (PT) |
| `GET` | `/api/launches` | Lançamentos SpaceX (EN) |
| `GET` | `/api/pt/launches` | Lançamentos traduzidos (PT) |
| `GET` | `/api/neo` | Asteroides próximos (NEO) |
| `GET` | `/api/pt/neo` | NEO (mesmo payload) |
| `GET` | `/api/solar-system` | Sistema solar em inglês |
| `GET` | `/api/pt/solar-system` | Sistema solar em português (original) |

---

## `GET /`

Metadados da API e mapa de rotas.

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
    "neo": "GET /api/neo | GET /api/pt/neo",
    "solarSystem": "GET /api/solar-system | GET /api/pt/solar-system"
  }
}
```

---

## `GET /health`

Health check do serviço (útil para Render / monitoramento).

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

Imagem ou vídeo astronômico do dia ([NASA APOD](https://api.nasa.gov/planetary/apod)).

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

**Cache:** ~30 min (upstream).

---

## `GET /api/news` · `GET /api/pt/news`

Feed de notícias espaciais ([Spaceflight News API v4](https://api.spaceflightnewsapi.net/v4/articles/)).

Em `/pt`, traduz `title` e `summary` de cada artigo.

A **resposta já localizada** (EN ou PT) fica em cache (~15 min, stale-while-revalidate). Após servir uma página, a próxima (`offset + limit`) é pré-carregada em background.

### Query params

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `limit` | `number` (1–100) | não | `10` | Quantidade de itens |
| `offset` | `number` (≥ 0) | não | `0` | Deslocamento |
| `search` | `string` | não | — | Busca textual |

### Exemplos

```http
GET /api/news
GET /api/news?limit=20&offset=0
GET /api/news?search=SpaceX
GET /api/pt/news?limit=20
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
| `count` | `number` | Total de artigos na fonte |
| `next` / `previous` | `string \| null` | Links de paginação da fonte |
| `results[].id` | `number` | ID do artigo |
| `results[].title` | `string` | Título |
| `results[].summary` | `string` | Resumo |
| `results[].url` | `string` | Link original |
| `results[].imageUrl` | `string` | Imagem de capa |
| `results[].newsSite` | `string` | Site de origem |
| `results[].publishedAt` | `string` | ISO datetime |
| `results[].updatedAt` | `string` | ISO datetime |
| `results[].featured` | `boolean` | Destaque |
| `results[].authors` | `array` | Autores (`{ name }`) |

---

## `GET /api/launches` · `GET /api/pt/launches`

Lançamentos **SpaceX** via [Launch Library 2](https://ll.thespacedevs.com/2.2.0/launch) (`lsp__id=121`).

Em `/pt`, traduz `name` e `details`.

### Importante — o que **não** existe

Não há query `upcoming`, `status` nem filtros de “só próximos” / “só realizados” na lista.

A lista (`mode=list`) mistura próximos e passados (ordenados por data, mais recentes primeiro). Cada item traz `upcoming` e `status` para o front filtrar localmente se quiser.

Motivo: o plano free da Launch Library limita a **~15 requisições/hora**. Filtros extras multiplicavam hits e geravam `429`.

### Query params

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `mode` | `list` \| `latest` \| `next` | não | `list` | Tipo de consulta |
| `limit` | `number` (1–100) | não | `20` | Itens por página (`list`) |
| `offset` | `number` (≥ 0) | não | `0` | Deslocamento (`list`) |

### Modos

| `mode` | Retorno |
|--------|---------|
| `list` | Lista paginada `{ count, limit, offset, results }` |
| `latest` | Último lançamento realizado (objeto único) |
| `next` | Próximo lançamento futuro (objeto único) |

### Exemplos

```http
GET /api/launches?limit=20&offset=0
GET /api/launches?limit=20&offset=20
GET /api/launches?mode=next
GET /api/launches?mode=latest
GET /api/pt/launches?limit=20&offset=0
GET /api/pt/launches?mode=next
```

### Infinite scroll (app)

1. `offset=0&limit=20`
2. ao scrollar: `offset=20&limit=20`
3. depois: `offset=40&limit=20`
4. parar quando `results.length < limit` ou `offset + results.length >= count`

A próxima página é pré-carregada em background após cada request de lista.

### Resposta `200` (`mode=list`)

```json
{
  "locale": "en",
  "data": {
    "count": 843,
    "limit": 20,
    "offset": 0,
    "results": [
      {
        "id": "uuid-da-launch-library",
        "name": "Falcon 9 Block 5 | Starlink Group …",
        "flightNumber": 120,
        "dateUtc": "2026-08-15T12:00:00Z",
        "dateUnix": 1786795200,
        "success": null,
        "upcoming": true,
        "details": "Mission description…",
        "rocket": "Falcon 9 Block 5",
        "launchpad": "Space Launch Complex 40",
        "status": "Go",
        "links": {
          "patch": { "small": "https://...", "large": "https://..." },
          "webcast": null,
          "wikipedia": "https://...",
          "article": null,
          "flickr": { "original": [] }
        },
        "cores": []
      }
    ]
  }
}
```

### Resposta `200` (`mode=next` ou `mode=latest`)

```json
{
  "locale": "pt",
  "data": {
    "id": "...",
    "name": "...",
    "flightNumber": 120,
    "dateUtc": "2026-08-15T12:00:00Z",
    "dateUnix": 1786795200,
    "success": true,
    "upcoming": false,
    "details": "...",
    "rocket": "Falcon 9 Block 5",
    "launchpad": "...",
    "status": "Success",
    "links": { "...": "..." },
    "cores": []
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | ID na Launch Library |
| `name` | `string` | Nome do lançamento |
| `flightNumber` | `number` | Tentativa da agência (quando disponível) |
| `dateUtc` | `string` | Data/hora NET em ISO |
| `dateUnix` | `number` | Epoch seconds |
| `success` | `boolean \| null` | `true` sucesso, `false` falha, `null` ainda indefinido |
| `upcoming` | `boolean` | Se ainda é futuro / planejado |
| `details` | `string \| null` | Descrição da missão |
| `rocket` | `string` | Nome do foguete |
| `launchpad` | `string` | Local de lançamento |
| `status` | `string` | Abreviação da LL (`Go`, `Success`, `TBD`, …) |
| `links` | `object` | Imagem, wiki, artigo, etc. |
| `cores` | `array` | Sempre `[]` nesta integração (campo reservado) |

**Cache:** resposta localizada ~30 min. Warmup no boot + refresh a cada 15 min (page 0, `next`, `latest`).

**Rate limit upstream:** sem token ~15 req/h. Com `LAUNCH_LIBRARY_TOKEN` o limite sobe (ver [The Space Devs](https://thespacedevs.com/llapi)). Em falha/429 com cache antigo, a API pode devolver **stale**.

---

## `GET /api/neo` · `GET /api/pt/neo`

Asteroides próximos à Terra ([NASA NeoWs](https://api.nasa.gov/neo/rest/v1/feed)).

O path `/pt` existe por consistência; nomes **não** são traduzidos.

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

**Cache:** ~10 min.

---

## `GET /api/solar-system` · `GET /api/pt/solar-system`

Corpos do sistema solar ([MockAPI systemSolar](https://63ee56ee5e9f1583bdc10f2c.mockapi.io/api/v1/systemSolar)).

A fonte já vem em **português**.

| Path | Comportamento |
|------|----------------|
| `/api/pt/solar-system` | Original (PT) |
| `/api/solar-system` | Traduzido PT → EN |

Conteúdo é estático (Sol + planetas + Plutão). No app, faz sentido **fixar no front** se quiser zero latência e independência do MockAPI.

### Exemplos

```http
GET /api/pt/solar-system
GET /api/solar-system
```

### Resposta `200`

```json
{
  "locale": "pt",
  "data": [
    {
      "id": "0",
      "name": "Sol",
      "type": "Estrela",
      "resume": "...",
      "introduction": "",
      "images": {
        "svg": "https://...",
        "png": "https://..."
      },
      "searchTags": ["planeta", "sol", "estrela central"],
      "features": {
        "orbitalPeriod": ["0 dias", "0 anos"],
        "orbitalSpeed": "0 km/h",
        "rotationDuration": "25dias 9h07min",
        "radius": "696.340 km",
        "diameter": "1.392.700 km",
        "sunDistance": "0 km",
        "oneWayLightToTheSun": "",
        "satellites": { "number": 0, "names": [] },
        "temperature": "5.505°C",
        "gravity": "274 m/s²"
      },
      "geography": ""
    }
  ]
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | Identificador |
| `name` | `string` | Nome |
| `type` | `string` | Tipo (Estrela, Terrestre, Gigante de Gás, …) |
| `resume` | `string` | Texto descritivo |
| `images.svg` / `images.png` | `string` | URLs de imagem |
| `searchTags` | `string[]` | Tags de busca |
| `features` | `object` | Dados orbitais / físicos |
| `introduction` / `geography` | `string` | Podem vir vazios na fonte |

**Cache:** ~60 min.

---

## Cache e performance

| Recurso | TTL aproximado | Observação |
|---------|----------------|------------|
| APOD | 30 min | Cache upstream |
| NEO | 10 min | Cache upstream |
| News (resposta EN/PT) | 15 min | SWR + prefetch da próxima página |
| Launches (resposta EN/PT) | 30 min | SWR + prefetch 1 página à frente |
| Solar System | 60 min | Cache upstream / traduzido |
| Strings de tradução | 6 h | Evita re-traduzir o mesmo texto |

No boot o servidor faz **warmup** (news page 0 EN+PT, launches page 0 EN+PT, `next`, `latest`) e a cada **15 min** refresca essas chaves quentes.

Se a fonte externa falhar (ex.: 429) e existir valor antigo, a API pode devolver **stale** em vez de erro.

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

## Uso sugerido no app

| Tela | Endpoints |
|------|-----------|
| Home | `GET /api/pt/apod` + `GET /api/pt/neo` |
| News | `GET /api/pt/news?limit=20&offset=0` (+ scroll com `offset`) |
| Launches (destaque) | `GET /api/pt/launches?mode=next` e/ou `?mode=latest` |
| Launches (lista / scroll) | `GET /api/pt/launches?limit=20&offset=0` |
| Solar System | Fixo no front **ou** `GET /api/pt/solar-system` / `GET /api/solar-system` |

---

## Fontes externas

| Rota Cosmos | Fonte |
|-------------|-------|
| `/api/apod` | [NASA APOD](https://api.nasa.gov/planetary/apod) |
| `/api/neo` | [NASA NeoWs Feed](https://api.nasa.gov/neo/rest/v1/feed) |
| `/api/news` | [Spaceflight News v4](https://api.spaceflightnewsapi.net/v4/articles/) |
| `/api/launches` | [Launch Library 2](https://ll.thespacedevs.com/2.2.0/launch) (filtro SpaceX) |
| `/api/solar-system` | [MockAPI systemSolar](https://63ee56ee5e9f1583bdc10f2c.mockapi.io/api/v1/systemSolar) |
