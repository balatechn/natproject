# NAT Project — Enterprise Management Platform

> Microsoft Project + CRM + Task Management + Workflow Automation + WhatsApp in one unified platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, ShadCN UI, Zustand, TanStack Query |
| Backend | NestJS, Prisma ORM, PostgreSQL, Redis, Socket.IO |
| Automation | n8n, WhatsApp Cloud API / Evolution API |
| Infra | Docker, Coolify, GitHub Actions |

## Monorepo Structure

```
natproject/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # NestJS backend + Prisma
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI primitives
├── infra/
│   ├── docker/       # Dockerfiles + Compose
│   ├── coolify/      # Coolify config
│   └── n8n/          # n8n workflow exports
└── .github/
    └── workflows/    # CI (test/build) + CD (Coolify deploy)
```

## Quick Start (Development)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start infrastructure (postgres, redis, minio, n8n)
docker compose -f infra/docker/docker-compose.yml \
               -f infra/docker/docker-compose.dev.yml up -d

# 4. Run DB migrations
pnpm --filter @natproject/api db:migrate

# 5. Seed demo data
pnpm --filter @natproject/api db:seed

# 6. Start all apps
pnpm dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:3001
- **Swagger:** http://localhost:3001/api/docs
- **n8n:** http://localhost:5678
- **MinIO:** http://localhost:9001

## Modules (Implementation Phases)

| Phase | Module | Status |
|-------|--------|--------|
| 0 | Monorepo bootstrap, schema, Dockerfiles | ✅ Complete |
| 1 | Database schema (Prisma) | ✅ Complete |
| 2 | NestJS API (auth, RBAC, all modules) | Planned |
| 3 | Frontend shell, auth, navigation | Planned |
| 4 | Dashboard, Projects, Tasks | Planned |
| 5 | Gantt, Resource, Team Planner | Planned |
| 6 | Workflow engine + n8n | Planned |
| 7 | CRM + WhatsApp + Notifications | Planned |
| 8 | Reports + Admin panel | Planned |
| 9 | Docker + Coolify deployment | Planned |
| 10 | Playwright/Jest testing | Planned |

## Deployment (Coolify)

See [infra/coolify/DEPLOY.md](infra/coolify/DEPLOY.md) for full deployment guide.

Coolify server: `http://187.127.134.246:8000/`

Required GitHub Secrets:
- `COOLIFY_API_TOKEN`
- `COOLIFY_WEBHOOK_WEB`
- `COOLIFY_WEBHOOK_API`

## License

Private — All rights reserved.
