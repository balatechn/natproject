# Coolify Deployment Guide

## Server

- URL: `http://187.127.134.246:8000/`
- API Base: `http://187.127.134.246:8000/api/v1`

## Services to Create

| Service | Type | Port |
|---------|------|------|
| postgres | Database / PostgreSQL 16 | 5432 |
| redis | Database / Redis 7 | 6379 |
| minio | Docker image (minio/minio) | 9000, 9001 |
| n8n | Docker image (n8nio/n8n) | 5678 |
| api | Dockerfile (infra/docker/Dockerfile.api) | 3001 |
| web | Dockerfile (infra/docker/Dockerfile.web) | 3000 |

## GitHub Actions Secrets Required

Add these in GitHub → Settings → Secrets → Actions:

```
COOLIFY_API_TOKEN    = 25|XNlVArZ9iYJERUum0AYJfIERQ5zuzqn0HOjbVtkR4a566c28
COOLIFY_WEBHOOK_WEB  = (copy from Coolify web service → Webhooks)
COOLIFY_WEBHOOK_API  = (copy from Coolify api service → Webhooks)
```

## Environment Variables (set in Coolify per service)

For `api` service, set all variables from `apps/api/.env.example`.
For `web` service, set all variables from `apps/web/.env.example`.

## Deploy Order

1. postgres → ready
2. redis → ready  
3. minio → ready
4. api (depends on postgres + redis) → run migrations on first deploy
5. web (depends on api)
6. n8n (depends on postgres)
