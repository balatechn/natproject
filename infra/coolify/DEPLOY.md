# Coolify Deployment Guide

## Infrastructure

| Item | Value |
|------|-------|
| Coolify URL | `http://187.127.134.246:8000/` |
| Coolify API base | `http://187.127.134.246:8000/api/v1` |
| GitHub repo | `https://github.com/balatechn/natproject` |
| Deploy branch | `main` |

---

## Step 1 — Create a Coolify Project

1. Open `http://187.127.134.246:8000/` and log in.
2. Click **Projects** → **+ New Project** → name it `NAT Project`.
3. Inside the project, click **+ New Environment** → name it `production`.

---

## Step 2 — Add a GitHub Source

1. Go to **Sources** → **+ Add** → **GitHub App** (or Personal Token).
2. Paste your GitHub Personal Access Token (repo scope).
3. Coolify will use this to clone `balatechn/natproject`.

---

## Step 3 — Deploy Databases & Infrastructure

### 3a. PostgreSQL 16

1. In your project, click **+ New Resource** → **Database** → **PostgreSQL**.
2. Select version **16**.
3. Set:
   - Database name: `natproject`
   - User: `natuser`
   - Password: *(strong password — save it, you need it for the API env vars)*
4. Click **Save** → **Deploy**.
5. Note the **Internal connection string** (format: `postgresql://natuser:PASSWORD@postgres:5432/natproject`).

### 3b. Redis 7

1. **+ New Resource** → **Database** → **Redis**.
2. Select version **7**.
3. Set a password *(save it)*.
4. Click **Save** → **Deploy**.
5. Note the internal connection string: `redis://:PASSWORD@redis:6379`.

### 3c. MinIO (object storage)

1. **+ New Resource** → **Docker Image** → image: `minio/minio:latest`.
2. Set environment variables:
   ```
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=<strong-password>
   ```
3. Command override: `server /data --console-address ":9001"`
4. Expose ports: `9000` (API), `9001` (console).
5. Add a persistent volume: `/data`.
6. **Deploy**.

### 3d. n8n (workflow automation)

1. **+ New Resource** → **Docker Image** → image: `n8nio/n8n:latest`.
2. Set environment variables:
   ```
   N8N_HOST=<your-n8n-domain-or-ip>
   N8N_PORT=5678
   N8N_PROTOCOL=http
   WEBHOOK_URL=http://<your-n8n-host>:5678
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=<strong-password>
   DB_TYPE=postgresdb
   DB_POSTGRESDB_HOST=<postgres-internal-host>
   DB_POSTGRESDB_PORT=5432
   DB_POSTGRESDB_DATABASE=n8n
   DB_POSTGRESDB_USER=natuser
   DB_POSTGRESDB_PASSWORD=<postgres-password>
   ```
3. Add a persistent volume: `/home/node/.n8n`.
4. Expose port: `5678`.
5. **Deploy**.

---

## Step 4 — Deploy the NestJS API

1. **+ New Resource** → **Application** → **GitHub** → select `balatechn/natproject`.
2. Branch: `main`.
3. Build pack: **Dockerfile**.
4. Dockerfile path: `infra/docker/Dockerfile.api`
5. Build context (Docker context): `/` *(repository root)*
6. Port: `3001`.
7. Set environment variables (replace `<...>` with real values):

```env
NODE_ENV=production
PORT=3001

DATABASE_URL=postgresql://natuser:<DB_PASS>@<postgres-host>:5432/natproject?schema=public
REDIS_URL=redis://:<REDIS_PASS>@<redis-host>:6379

JWT_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<openssl rand -base64 64>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=https://<your-web-domain>

S3_ENDPOINT=http://<minio-host>:9000
S3_BUCKET=natproject
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=<minio-password>
S3_REGION=us-east-1

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=NAT Project <noreply@natproject.app>

WHATSAPP_EVOLUTION_URL=
WHATSAPP_EVOLUTION_KEY=
WHATSAPP_INSTANCE=natproject

N8N_WEBHOOK_URL=http://<n8n-host>:5678/webhook
APP_URL=https://<your-web-domain>
API_URL=https://<your-api-domain>
```

8. Health check path: `/api/v1/health`
9. Click **Save** → **Deploy**.

> The entrypoint script (`infra/docker/entrypoint.sh`) automatically runs
> `prisma migrate deploy` before the server starts. No manual migration step needed.

---

## Step 5 — Deploy the Next.js Web

1. **+ New Resource** → **Application** → **GitHub** → `balatechn/natproject`.
2. Branch: `main`.
3. Build pack: **Dockerfile**.
4. Dockerfile path: `infra/docker/Dockerfile.web`
5. Build context: `/` *(repository root)*
6. Port: `3000`.
7. Build arguments *(NEXT_PUBLIC_ vars must be set as build args, not just env vars)*:

```
NEXT_PUBLIC_API_URL=https://<your-api-domain>
NEXT_PUBLIC_WS_URL=wss://<your-api-domain>
```

8. Environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://<your-api-domain>
NEXT_PUBLIC_WS_URL=wss://<your-api-domain>
NEXTAUTH_URL=https://<your-web-domain>
NEXTAUTH_SECRET=<openssl rand -base64 64>
```

9. Click **Save** → **Deploy**.

---

## Step 6 — Configure Automatic Deploys (CI/CD)

After both the API and Web services are deployed:

1. In Coolify, open each service → **Webhooks** tab → copy the **Deploy Webhook URL**.
2. In GitHub, go to `balatechn/natproject` → **Settings** → **Secrets and variables** → **Actions**.
3. Add these secrets:

| Secret name | Value |
|---|---|
| `COOLIFY_API_TOKEN` | `25\|XNlVArZ9iYJERUum0AYJfIERQ5zuzqn0HOjbVtkR4a566c28` |
| `COOLIFY_WEBHOOK_API` | *(webhook URL from Coolify API service)* |
| `COOLIFY_WEBHOOK_WEB` | *(webhook URL from Coolify Web service)* |

Every push to `main` will now automatically redeploy both services via `.github/workflows/cd.yml`.

---

## Step 7 — Seed the Database (first deploy only)

After the first successful API deployment, run the seed script once via Coolify's terminal:

```bash
# Open Coolify → API service → Terminal
node -e "require('child_process').execSync('./node_modules/.bin/prisma db seed', {stdio:'inherit'})"
```

Or set `db:seed` as a one-off command in the API service.

This creates the default admin/manager/member accounts:
- `admin@natproject.app` / `Admin@123`
- `manager@natproject.app` / `Manager@123`
- `member@natproject.app` / `Member@123`

---

## Quick Reference — Service Map

| Service | Internal host | Port | Public? |
|---------|--------------|------|---------|
| PostgreSQL | `postgres` | 5432 | No |
| Redis | `redis` | 6379 | No |
| MinIO API | `minio` | 9000 | Optional |
| MinIO Console | `minio` | 9001 | Optional |
| n8n | `n8n` | 5678 | Yes |
| API (NestJS) | `api` | 3001 | Yes |
| Web (Next.js) | `web` | 3000 | Yes |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| API container restarts | Migration failed | Check DB connection string; ensure postgres is healthy first |
| 502 on web | API health check failing | Wait 60s after deploy; check API logs |
| `NEXT_PUBLIC_API_URL` is wrong | Not passed as build arg | Set build arg in Coolify web service → Build → Arguments |
| Prisma: "missing migration" | Schema changed but not migrated | `git push main` will re-run `prisma migrate deploy` automatically |
| MinIO not accessible | Healthcheck using mc | Healthcheck now uses `curl` — update if using older docker-compose |
