# Rate Limiter Service (Node.js + TypeScript + Postgres + Redis)
API rate limiter with per-minute sliding window, daily quotas, endpoint overrides, burst handling, IP blocking, logging & analytics.

## Stack
- Fastify
- Prisma (Postgres)
- Redis (ZSET sliding window + counters)
- TypeScript

## Quickstart

1. **Start databases**

```bash
docker compose up -d
```

2. **Install deps**

```bash
npm i
```

3. **Prisma setup**

```bash
cp .env.example .env  # adjust if needed
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

4. **Run the server**

```bash
npm run dev
# or build & run
npm run build && npm start
```

Server listens on `http://localhost:${PORT}` (default 8080).

---

## API

### Rate Limit Checking

#### `POST /api/check-limit`
Body:
```json
{ "endpoint": "/v1/search", "api_key": "demo-key-123", "ip": "1.2.3.4" }
```
- Also accepts `X-API-Key` header.
- Returns `allowed`, `reason`, `retry_after_ms`, and current usage.

#### `POST /api/record-request`
Body:
```json
{ "endpoint": "/v1/search", "api_key": "demo-key-123", "ip": "1.2.3.4" }
```
Records a successful request (increments sliding window & daily counter).

#### `GET /api/limits/:api_key`
Returns current usage snapshot and configured limits for the provided key.

### API Key Management (Admin)
Headers: `X-Admin-Token: <ADMIN_TOKEN>`

- `POST /api/keys` – create a new key.
- `GET /api/keys` – list keys.
- `PUT /api/keys/:id` – update key (limits, activity).
- `DELETE /api/keys/:id` – deactivate key.

### Blocking & Security (Admin)
- `POST /api/block-ip` – body: `{ ip, minutes, reason? }`
- `DELETE /api/block-ip/:ip`
- `GET /api/blocked-ips`

### Analytics & Monitoring (Admin)
- `GET /api/usage/:api_key` – last 60 minutes usage + recent violations.
- `GET /api/violations` – recent violations across keys.
- `GET /api/health` – basic health metrics.

---

## Notes on Algorithms

- **Sliding window per minute**: Redis ZSET per `(apiKey, endpoint)`, auto-trimmed to last 60s; check counts vs `perMinute + burst`.
- **Daily quota**: Redis counter with TTL to end-of-day; aggregated in Postgres for analytics.
- **Burst handling**: Allow `burst` extra requests over the per-minute limit (set `burst_per_minute` or endpoint-specific `burst`).
- **Endpoint-specific overrides**: Use `Endpoint_Limits` for `/api_key_id + endpoint` customization.
- **IP blocking**: Stored in Postgres and cached in Redis with TTL.

Atomicity across multiple instances is preserved by Redis operations executed in a MULTI pipeline for reads/writes where needed.

---

## Performance Tips

- Keep Redis and your service close (low latency).
- Consider batching logs / using a queue if DB becomes a bottleneck.
- For ultra-high throughput, move the "check + consume" into a single Lua script and call it from your gateway.
- Enable Fastify's `keepAliveTimeout` and tune Node's `UV_THREADPOOL_SIZE` for heavy logging.

---

