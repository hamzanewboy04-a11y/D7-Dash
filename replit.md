# D7 Team Dashboard

## Overview
A financial dashboard application for D7 Team, tracking revenue, expenses, and payroll across multiple countries (Peru, Italy Women, Italy Men, Argentina, Chile). Built with Next.js 16, React 19, and PostgreSQL/Prisma.

## Recent Changes (January 2026)
- **Role-Based Permissions**: Viewers can only view, editors/admins can edit (403 for unauthorized edits)
- **Customizable Sidebar**: Per-user section visibility via allowedSections field
- **Simplified Employee Payroll**: Removed complex tiers, now uses simple percentRate with percentageBase field (from spend/profit/FD/RD sums)
- **Custom Roles**: Can create custom role names for employees (not limited to predefined roles)
- **Expanded Expense Categories**: 13 categories including accounts, proxies, hosting, software, advertising, banking, communications, office
- **Date Period Filtering**: Countries page now has date range selector (7/30/90 days, all time, custom)
- **Design Update**: New color scheme (black, white, blue, light blue)
- **Motivational Features**: Daily quotes, achievement badges, profit streaks, goal tracking
- **Authentication**: Role-based access (admin/editor/viewer), login page, user management
- **Payroll Per-Employee**: Employee rate configuration moved to employee cards (not global settings)
- **Terminology**: nFD (нейро First Deposit), FD (First Deposit), RD (Редепозит)
- **Import Fixes**: Fixed Excel import for individual ad spend and payroll detail fields
- **Production Seeding**: Auto-seeds database during deployment

## Project Architecture
- **Framework**: Next.js 16.1.3 with App Router
- **UI**: React 19, Tailwind CSS 4, Radix UI components
- **Database**: PostgreSQL (Replit managed, persistent across deployments)
- **Charts**: Recharts for data visualization
- **ORM**: Prisma 7 with PostgreSQL adapter

## Color Scheme
- Dark/Sidebar: #0f172a
- Primary Blue: #1e40af
- Light Blue: #3b82f6
- Sky Blue: #60a5fa
- Background: #ffffff
- Text: #0f172a
- Green (positive): #22c55e
- Red (negative): #ef4444

## Key Directories
- src/app/ - Next.js app router pages and API routes
- src/components/ - Reusable UI components
  - dashboard/ - Dashboard-specific components (charts, cards, motivational)
  - layout/ - Layout components (sidebar)
  - ui/ - Shadcn UI components
- src/lib/ - Database connection and utility functions
- prisma/ - Database schema
- scripts/ - Data import and migration scripts

## Running the Application
The development server runs on port 5000:
npm run dev -- -p 5000 -H 0.0.0.0

## Database
- Uses Replit-managed PostgreSQL (persists across deployments)
- Connection via DATABASE_URL environment variable (auto-configured)
- Data imported from D7 TEAM (1).xlsx Excel file (398 unique records across 5 countries)
- Auto-seeding during deployment via scripts/seed-production.ts

## Calculation Logic
All financial calculations are in src/lib/calculations.ts:
- Agency Fee: Trust 9%, others 8%
- Priemka Commission: 15%
- Payroll Buyer: 12% of spend
- Payroll RD Handler: 4% of RD sum
- ROI: (Revenue - Expenses) / Expenses

## Scripts
- npm run dev - Development server
- npm run build - Production build
- npm run start - Production server
- npx prisma db push - Push Prisma schema to database
- npx tsx scripts/seed-production.ts - Seed production database

## Deployment
Configured for Autoscale deployment on Replit. Database persists across deployments.
Build command: prisma generate && npm run build
Run command: Database push and seeding happen at runtime to avoid platform migration issues.
