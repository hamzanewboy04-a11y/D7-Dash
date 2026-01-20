# D7 Team Dashboard

## Overview
A financial dashboard application for D7 Team, tracking revenue, expenses, and payroll across multiple countries (Peru, Italy, Argentina, Chile). Built with Next.js 16, React 19, and SQLite/Prisma.

## Project Architecture
- **Framework**: Next.js 16.1.3 with App Router
- **UI**: React 19, Tailwind CSS 4, Radix UI components
- **Database**: SQLite with Prisma ORM (supports Turso for cloud deployment)
- **Charts**: Recharts for data visualization

## Key Directories
- `src/app/` - Next.js app router pages and API routes
- `src/components/` - Reusable UI components
- `src/lib/` - Database connection and utility functions
- `prisma/` - Database schema
- `data.db` - SQLite database with imported data

## Running the Application
The development server runs on port 5000:
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

## Database
- Local development uses SQLite (`data.db`)
- Production can use Turso by setting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Data imported from "D7 TEAM (1).xlsx" Excel file (553 records across 5 countries)

## Data Import
To re-import data from Excel:
```bash
npx tsx scripts/import-direct.ts
```

## Scripts
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run db:push` - Push Prisma schema to database
- `npm run db:import` - Import data from Excel
