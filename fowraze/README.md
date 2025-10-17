Fowraze — Automate your daily grind: quotes, invoices, and follow-ups.

This is the MVP web app built with Next.js (App Router), Prisma (Postgres), NextAuth (Google), and Tailwind.

## Getting Started

1) Copy environment variables and fill in secrets:

```bash
cp .env.example .env
```

2) Start local databases:

```bash
docker compose up -d
```

3) Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npx prisma migrate dev --name init
```

4) Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech
- Next.js 15 (App Router), React 19, Tailwind 4
- Prisma + Postgres, NextAuth (Google, database sessions)
- Docker Compose for Postgres + Redis

## Notes
- Seed users are created on first Google sign-in.
- Protected routes under `/dashboard` require authentication.
