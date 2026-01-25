# D7 Team Dashboard

## Инструкция по использованию

### Вход в систему
1. Откройте сайт и введите логин/пароль
2. **Роли пользователей:**
   - **Admin** — полный доступ ко всем функциям
   - **Editor** — может редактировать данные
   - **Viewer** — только просмотр (без редактирования)

3. **Ограничение доступа к разделам:**
   - При создании/редактировании пользователя можно выбрать, какие разделы ему доступны
   - Если ничего не выбрано — доступны все разделы
   - Примеры: SMM-специалист видит только SMM, баер — только Баинг

---

### Главная страница (Dashboard)
Показывает общую статистику за выбранный период:
- **Балансы** — Биржа, агентства (TRUST, CROSSGIF, FBM), общий баланс
- **Общий спенд** — сумма расходов на рекламу
- **Общий доход** — сумма заработка
- **ROI** — рентабельность (доход - расходы) / расходы × 100%
- **Графики** — визуализация динамики по дням

---

### Страны (/countries)
Детальная статистика по каждой стране:
- Перу, Италия (Ж), Италия (М), Аргентина, Чили
- Фильтр по периоду (7/30/90 дней, всё время, свой диапазон)
- Показатели: спенд, FD (первые депозиты), nFD (нейро FD), RD (редепозиты)

---

### Баинг (/buying)
Модуль для отслеживания метрик баеров (закупщиков рекламы):

**Показатели:**
- **Спенд** — сколько потрачено на рекламу
- **Подписки** — количество подписчиков
- **Диалоги** — количество начатых диалогов
- **FD** — первые депозиты
- **Цена подписки** — спенд / подписки
- **Цена FD** — спенд / FD
- **Конверсия %** — (диалоги / подписки) × 100%
- **ЗП** — зарплата баера (10% от спенда)

**Действия (только для Editor/Admin):**
- Добавить запись — кнопка "Добавить"
- Редактировать — иконка карандаша
- Удалить — иконка корзины

---

### Кабинеты и Дески (/cabinets)
Управление рекламными аккаунтами:

**Структура:**
- **Кабинет** — рекламный аккаунт (например: "Camila 3", "Corie", "Cabrera")
- **Деск** — рабочее место внутри кабинета (например: "Desk1", "Desk3")

**Функции:**
1. **Создать кабинет** — название, платформа, ID платформы, страна
2. **Создать деск** — название, описание
3. **Назначить сотрудника** — привязать баера к деску
4. **Удалить** — удаление кабинета или деска

**Логика:** Метрики баинга привязываются к дескам, а не напрямую к сотрудникам, что позволяет точнее отслеживать эффективность каждого рабочего места.

---

### Сотрудники (/employees)
Управление командой:
- Добавление/редактирование сотрудников
- Роли: Баер, RD Handler, SMM и другие
- Привязка к странам
- Настройка ставок зарплаты

---

### Расходы (/expenses)
Учёт всех расходов компании:

**Категории расходов:**
- Аккаунты
- Прокси
- Хостинг
- Софт
- Реклама
- Банковские комиссии
- Связь
- Офис
- И другие

---

### Настройки (/settings)
- Управление пользователями (создание/редактирование аккаунтов)
- Настройка целей (goals)
- Конфигурация расчётов
- **Приёмки** — управление платёжными системами (название, код, комиссия)
- **SMM Проекты** — настройка планов для сторонних SMM проектов (посты, сторис, мини-обзоры, большие обзоры)

---

### Формулы расчётов

| Показатель | Формула |
|------------|---------|
| Agency Fee | Trust: 9%, остальные: 8% |
| Priemka Commission | 15% |
| Payroll Buyer | 12% от спенда |
| Payroll RD Handler | 4% от суммы RD |
| ROI | (Доход - Расходы) / Расходы × 100% |
| Цена подписки | Спенд / Количество подписок |
| Цена FD | Спенд / Количество FD |
| Конверсия | (Диалоги / Подписки) × 100% |

---

### Терминология
- **FD (First Deposit)** — первый депозит клиента
- **nFD (нейро First Deposit)** — первый депозит через нейро-воронку
- **RD (Редепозит)** — повторный депозит клиента
- **Спенд** — расходы на рекламу
- **Кабинет** — рекламный аккаунт на платформе
- **Деск** — рабочее место/подаккаунт внутри кабинета
- **Баер** — специалист по закупке рекламы

---

## Overview
A financial dashboard application for D7 Team, tracking revenue, expenses, and payroll across multiple countries (Peru, Italy Women, Italy Men, Argentina, Chile). Built with Next.js 16, React 19, and PostgreSQL/Prisma.

## Recent Changes (January 2026)
- **HTX Exchange API Integration**:
  - Integrated with HTX (Huobi) API for real-time exchange balance fetching
  - Fetches actual USDT balance from HTX spot account
  - Requires HTX_API_KEY and HTX_SECRET_KEY secrets
  - Balance syncs automatically when clicking sync button on dashboard
- **BEP20 (BSC) Network Support**:
  - Switched from TRC20 (TRON) to BEP20 (Binance Smart Chain) for transaction tracking
  - Uses Moralis API for detecting incoming/outgoing USDT transfers (free tier)
  - Country wallets use Trust Wallet BEP20 addresses
  - Exchange deposit address: 0x8cd0f0f43fb2705b16f32a5c0e5f2f1c63ae1fda
  - Requires MORALIS_API_KEY secret
- **Enhanced Wallet Integration with Expense & Balance Tracking**:
  - Store main wallet address in Settings > Кошелёк tab
  - Auto-sync wallet balance every 60 seconds
  - Display USDT and TRX balance on dashboard
  - Map country-specific sender wallets (Italy, Peru, Argentina, etc.)
  - Auto-detect incoming transfers and record as revenue for the matched country
  - **NEW: Track outgoing transactions as expenses** - All withdrawals recorded with "wallet_transfer" category for later categorization
  - **NEW: Agency wallet addresses** - Map TRUST, CROSSGIF, FBM wallets in settings
  - **NEW: Auto-detect agency top-ups** - Transfers to agency wallets automatically update both exchange balance (decrease) and agency balance (increase)
  - Transaction history logging with idempotency (no duplicates)
- **Balance Tracking System**: Track exchange (Биржа) and agency (TRUST, CROSSGIF, FBM) balances on dashboard
  - Agency top-up expenses decrease exchange and increase agency balance
  - Regular expenses decrease exchange balance
  - Buyer spend auto-deducts from agency balance based on cabinet platform
- **SMM Plan Periods**: Date-range based planning for SMM projects (e.g., Jan 1-5 has one plan, Jan 5-10 another)
- **SMM Project Management**: New Settings > SMM Проекты tab for managing custom SMM projects with monthly/daily content plans (posts, stories, mini reviews, big reviews)
- **Priemka (Payment Processor) Management**: New feature to create/manage priemkas with name, code, commission rate in Settings > Приёмки tab
- **Multiple Priemkas per Day**: Data entry page now supports entering revenue from multiple priemkas per country per day with auto-calculated exchange rates
- **PriemkaEntry Model**: Tracks daily priemka revenue (local/USDT) and exchange rates per country

## Previous Changes (January 2026)
- **Cabinet & Desk Management**: New feature to create/manage ad cabinets (Camila 3, Corie, Cabrera) and desks (Desk1, Desk3), with employee assignment
- **Comprehensive Excel Import**: Imports ALL tables from ALL sheets including secondary tables (e.g., Перу январь has 2 tables, декабрь has 5 tables)
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

## Data Structure: Cabinets & Desks
- **Cabinet**: Ad account/кабинет (e.g., "Camila 3", "Corie", "Cabrera") with platform info
- **Desk**: Desk within cabinet (e.g., "Desk1", "Desk3", "Default") linked to cabinet
- **BuyerMetrics**: Daily metrics linked to desk (not employee) for accurate tracking
- Employees can be assigned to desks for payroll tracking

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
