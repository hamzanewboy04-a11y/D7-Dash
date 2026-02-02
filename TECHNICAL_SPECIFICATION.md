# D7 Team Dashboard - Полное Техническое Задание

## 1. Общее описание проекта

### 1.1 Назначение
**D7 Team Dashboard** — финансовая панель управления для команды D7, занимающейся арбитражем трафика в сфере гемблинга/беттинга. Система отслеживает доходы, расходы, зарплаты и ROI по 5 странам.

### 1.2 Бизнес-модель
- Команда закупает рекламу через агентства (TRUST, CROSSGIF, FBM)
- Привлекает пользователей в гемблинг-продукты
- Получает комиссию за первые депозиты (FD) и редепозиты (RD)
- Доходы поступают через "приёмки" (платёжные системы) и собственные каналы

### 1.3 Страны работы
| Код | Название | Валюта |
|-----|----------|--------|
| PE | Peru (Перу 1) | SOL |
| PE2 | Peru 2 (Перу 2) | SOL |
| IT_F | Italy Women (Италия Ж) | EUR |
| IT_M | Italy Men (Италия М) | EUR |
| AR | Argentina (Аргентина) | ARS |
| CL | Chile (Чили) | CLP |

---

## 2. Технологический стек

### 2.1 Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js | 16.1.3 | React-фреймворк с SSR |
| React | 19.2.3 | UI библиотека |
| TypeScript | 5.x | Типизация |
| Tailwind CSS | 4.x | Стилизация |
| Radix UI | - | Компоненты (Dialog, Select, Tabs) |
| Recharts | - | Графики и диаграммы |
| Lucide React | - | Иконки |
| React Hook Form | - | Формы |

### 2.2 Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js API Routes | - | REST API эндпоинты |
| Prisma | 7.2.0 | ORM для PostgreSQL |
| PostgreSQL | - | База данных (Replit managed) |

### 2.3 Внешние интеграции
| Сервис | Назначение |
|--------|------------|
| HTX (Huobi) API | Баланс биржи, история транзакций |
| Moralis API | Транзакции BEP20 (BSC сеть) |
| BSC RPC | Балансы USDT на кошельках |
| Google Sheets | Синхронизация спендов агентств |
| GitHub | Версионирование кода |

---

## 3. Структура страниц

### 3.1 Дашборд (`/`)
**Главная страница с обзором всех показателей**

**Компоненты:**
- Балансы: Биржа, CROSSGIF, FBM, TRUST, Общий баланс
- Итоги за период: Доход, Спенд, Расходы, FD количество, RD сумма
- Прогресс к целям (Goal tracking)
- Графики: Доходы/расходы по дням
- Мотивационные элементы: цитаты, streak

**Данные:**
- Фильтр по периоду (7/30/90 дней, всё время, свой диапазон)
- Кнопка "Внести расход" — быстрое добавление расхода
- Кнопка "Обновить" — синхронизация данных

---

### 3.2 Страны (`/countries`)
**Детальная статистика по каждой стране**

**Таблица показателей:**
| Поле | Описание |
|------|----------|
| Дата | Дата записи |
| Спенд Total | Общий спенд за день |
| Спенд TRUST | Спенд через агентство TRUST |
| Спенд Crossgif | Спенд через CROSSGIF |
| Спенд FBM | Спенд через FBM |
| FD кол-во | Количество первых депозитов |
| nFD кол-во | Количество нейро-FD |
| FD сумма | Сумма первых депозитов в USDT |
| RD кол-во | Количество редепозитов |
| RD сумма | Сумма редепозитов в USDT |
| Доход | Общий доход за день |
| ROI | (Доход - Расходы) / Расходы × 100% |

---

### 3.3 Транзакции (`/transactions`)
**История криптовалютных переводов**

**Типы транзакций:**
- **Входящие (deposit)** — поступления от стран (записываются как доход)
- **Исходящие (withdrawal)** — переводы на агентства или другие адреса

**Функции:**
- Фильтр по стране (только для депозитов)
- Фильтр по типу (все/входящие/исходящие)
- Фильтр по датам
- Ссылки на BSCScan
- Автоматическое определение страны по адресу кошелька
- Синхронизация с HTX биржей

---

### 3.4 Баинг (`/buying`)
**Метрики закупщиков рекламы (баеров)**

**Показатели:**
| Поле | Описание | Формула |
|------|----------|---------|
| Дата | Дата записи | - |
| Деск | Рабочее место баера | - |
| Спенд | Потрачено на рекламу | Вводится |
| Подписки | Количество подписчиков | Вводится |
| Диалоги | Начатых диалогов | Вводится |
| FD | Первые депозиты | Вводится |
| Цена подписки | Стоимость подписчика | Спенд / Подписки |
| Цена FD | Стоимость депозита | Спенд / FD |
| Конверсия | Процент диалогов | (Диалоги / Подписки) × 100% |
| ЗП | Зарплата баера | 10% от спенда |

---

### 3.5 Кабинеты (`/cabinets`)
**Управление рекламными аккаунтами**

**Иерархия:**
```
Кабинет (Cabinet)
├── Деск 1 (Desk) → Сотрудник A
├── Деск 2 (Desk) → Сотрудник B
└── Деск 3 (Desk) → Не назначен
```

**Поля кабинета:**
- Название (Camila 3, Corie, Cabrera)
- Платформа (Crossgif, FBM)
- ID платформы
- Страна

**Поля деска:**
- Название (Desk1, Desk3)
- Привязанный сотрудник
- Описание

---

### 3.6 Агентства (`/agencies`)
**Управление балансами рекламных агентств**

**Агентства:**
- TRUST (комиссия 9%)
- CROSSGIF (комиссия 8%)
- FBM (комиссия 8%)

**Функции:**
- Отображение текущих балансов
- Синхронизация с Google Sheets
- История пополнений

---

### 3.7 SMM (`/smm`)
**Управление SMM проектами**

**Метрики:**
- Посты (количество)
- Сторис (количество)
- Мини-обзоры
- Большие обзоры
- Зарплата SMM

**Плановые периоды:**
- Настройка планов на периоды (например: 1-5 января — один план, 5-10 января — другой)

---

### 3.8 Финансы (`/finance`)
**Финансовая аналитика**

**Разделы:**
- P&L по странам
- P&L по неделям
- Breakdown расходов по категориям
- ROI графики

---

### 3.9 ФОТ / Payroll (`/payroll`)
**Фонд оплаты труда**

**Функции:**
- Список сотрудников с невыплаченными суммами
- История выплат
- Массовая выплата
- Фильтр по статусу (оплачено/не оплачено)

---

### 3.10 Ввод данных (`/data-entry`)
**Страница для ввода ежедневных метрик**

**Поля ввода:**
- Выбор даты
- Выбор страны
- Доход от приёмок (несколько приёмок в день)
- Доход собственный
- FD/nFD количество и суммы
- RD количество и суммы
- Доп. расходы

---

### 3.11 Импорт (`/import`)
**Импорт данных из Excel**

**Поддержка:**
- Загрузка .xlsx файлов
- Парсинг нескольких листов
- Маппинг на страны
- Импорт исторических данных

---

### 3.12 Аналитика (`/analytics`)
**Расширенная аналитика**

- Графики трендов
- Сравнение периодов
- Прогнозы

---

### 3.13 Настройки (`/settings`)
**Системные настройки**

**Вкладки:**
1. **Общие** — базовые настройки
2. **Цели** — целевые показатели (ROI, доход)
3. **Приёмки** — платёжные системы (название, код, комиссия)
4. **SMM Проекты** — настройка контент-планов
5. **Кошелёк** — адрес главного кошелька, адреса стран

---

### 3.14 Справка (`/help`)
**Документация и помощь**

---

## 4. Система аутентификации

### 4.1 Роли пользователей
| Роль | Права |
|------|-------|
| **Admin** | Полный доступ, управление пользователями |
| **Editor** | Редактирование данных, без управления пользователями |
| **Viewer** | Только просмотр (все действия редактирования заблокированы) |

### 4.2 Ограничение разделов
- Поле `allowedSections` в User — массив разрешённых разделов
- Если пустой — доступ ко всем разделам
- Пример: SMM-специалист видит только `/smm`

### 4.3 API аутентификации
```
POST /api/auth/login — вход
POST /api/auth/logout — выход
GET /api/auth/me — текущий пользователь
```

---

## 5. Формулы расчётов

### 5.1 Комиссии агентств
```javascript
Agency Fee = spendTrust × 9% + spendCrossgif × 8% + spendFbm × 8%
```

### 5.2 Комиссия приёмки
```javascript
Priemka Commission = revenueUsdtPriemka × 15%
```

### 5.3 ФОТ (Фонд оплаты труда)

**Баер:**
```javascript
Payroll Buyer = totalSpend × 12%
```

**Обработчик RD:**
```javascript
Payroll RD Handler = rdSumUsdt × 4%
```

**Обработчик FD (тиры):**
```javascript
if (fdCount < 5) rate = $3
else if (fdCount < 10) rate = $4
else rate = $5

bonus = fdCount >= 5 ? $15 : $0
Payroll FD Handler = (fdCount × rate + bonus) × 1.2
```

### 5.4 ROI
```javascript
ROI = (totalRevenue - totalExpenses) / totalExpenses × 100%
```

### 5.5 Курс обмена
```javascript
Exchange Rate = localAmount / usdtAmount
```

---

## 6. Модели базы данных (Prisma)

### 6.1 Основные модели

#### Country (Страна)
```prisma
model Country {
  id        String   @id
  name      String   @unique    // "Peru", "Italy Women"
  code      String   @unique    // "PE", "IT_F"
  currency  String   @default("USDT")
  isActive  Boolean  @default(true)
  status    String   @default("active")
}
```

#### DailyMetrics (Ежедневные метрики)
```prisma
model DailyMetrics {
  id                    String   @id
  date                  DateTime
  countryId             String
  
  // Спенд
  totalSpend            Float
  spendTrust            Float
  spendCrossgif         Float
  spendFbm              Float
  agencyFee             Float
  
  // Доход приёмка
  revenueLocalPriemka   Float
  revenueUsdtPriemka    Float
  commissionPriemka     Float
  
  // Доход собственный
  revenueLocalOwn       Float
  revenueUsdtOwn        Float
  
  // FD/RD
  fdCount               Int
  nfdCount              Int
  fdSumUsdt             Float
  rdCount               Int
  rdSumUsdt             Float
  
  // ФОТ
  payrollBuyer          Float
  payrollRdHandler      Float
  payrollFdHandler      Float
  totalPayroll          Float
  
  // Итоги
  totalRevenueUsdt      Float
  totalExpensesUsdt     Float
  netProfitMath         Float
  roi                   Float
}
```

#### Employee (Сотрудник)
```prisma
model Employee {
  id              String   @id
  name            String
  role            String      // "Баер", "RD Handler", "SMM"
  countryId       String?
  
  // Ставка зарплаты
  percentRate     Float       // Процент от базы
  percentageBase  String      // "spend", "profit", "fd", "rd"
  
  // Настройки выплат
  paymentType     String      // "buffer", "weekly", "monthly"
  bufferDays      Int
  currentBalance  Float
}
```

#### Cabinet (Кабинет)
```prisma
model Cabinet {
  id          String   @id
  name        String      // "Camila 3"
  platform    String?     // "Crossgif"
  platformId  String?     // "759443220489882"
  countryId   String?
  desks       Desk[]
}
```

#### Desk (Деск)
```prisma
model Desk {
  id          String   @id
  name        String      // "Desk1"
  cabinetId   String
  employeeId  String?     // Привязанный сотрудник
}
```

#### BuyerMetrics (Метрики баера)
```prisma
model BuyerMetrics {
  id            String   @id
  date          DateTime
  deskId        String      // Привязка к деску
  countryId     String?
  
  spend         Float
  subscriptions Int
  dialogs       Int
  fdCount       Int
  
  // Вычисляемые
  pricePerSub   Float       // spend / subscriptions
  pricePerFd    Float       // spend / fdCount
  conversionRate Float      // dialogs / subscriptions × 100
}
```

#### Expense (Расход)
```prisma
model Expense {
  id          String   @id
  date        DateTime
  category    String      // "accounts", "proxy", "hosting", etc.
  amount      Float
  description String?
  countryId   String?
}
```

#### Priemka (Приёмка)
```prisma
model Priemka {
  id          String   @id
  name        String      // "MegaPay"
  code        String      // "MP"
  commission  Float       // 15%
  countryId   String
  isActive    Boolean
}
```

#### Balance (Баланс)
```prisma
model Balance {
  id      String   @id
  type    String   @unique  // "exchange", "trust", "crossgif", "fbm"
  amount  Float
  name    String             // Отображаемое название
}
```

#### User (Пользователь)
```prisma
model User {
  id              String   @id
  username        String   @unique
  password        String      // bcrypt hash
  role            String      // "admin", "editor", "viewer"
  allowedSections String[]    // ["smm", "buying"]
}
```

#### WalletSettings (Настройки кошелька)
```prisma
model WalletSettings {
  id            String   @id
  mainAddress   String      // BEP20 адрес главного кошелька (HTX)
  autoSync      Boolean
  syncInterval  Int         // минуты
}
```

#### CountryWallet (Кошелёк страны)
```prisma
model CountryWallet {
  id          String   @id
  countryId   String
  address     String      // BEP20 адрес
  label       String?
}
```

#### HtxTransaction (HTX транзакция)
```prisma
model HtxTransaction {
  id            String   @id
  txId          String   @unique  // ID транзакции в HTX
  type          String            // "deposit", "withdrawal"
  currency      String            // "usdt"
  amount        Float
  fee           Float
  txHash        String?           // Хеш в блокчейне
  fromAddress   String?
  toAddress     String?
  countryId     String?           // Для депозитов — страна отправитель
  createdAt     DateTime
}
```

---

## 7. API эндпоинты

### 7.1 Аутентификация
| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/auth/login | Вход |
| POST | /api/auth/logout | Выход |
| GET | /api/auth/me | Текущий пользователь |

### 7.2 Dashboard
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/dashboard | Данные дашборда (с фильтром по датам) |

### 7.3 Страны и метрики
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/countries | Список стран |
| GET | /api/metrics | Метрики (фильтр: countryId, dateFrom, dateTo) |
| POST | /api/metrics | Создать/обновить метрику |

### 7.4 Баинг
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/buying | Список метрик баеров |
| POST | /api/buying | Добавить запись |
| PUT | /api/buying | Обновить запись |
| DELETE | /api/buying | Удалить запись |

### 7.5 Кабинеты и дески
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/cabinets | Список кабинетов |
| POST | /api/cabinets | Создать кабинет |
| GET | /api/desks | Список десков |
| POST | /api/desks | Создать деск |
| PUT | /api/desks/[id] | Обновить деск |
| DELETE | /api/desks/[id] | Удалить деск |

### 7.6 Расходы
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/expenses | Список расходов |
| POST | /api/expenses | Добавить расход |
| PUT | /api/expenses | Обновить расход |
| DELETE | /api/expenses | Удалить расход |

### 7.7 HTX интеграция
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/htx/balance | Баланс HTX |
| GET | /api/htx/transactions | История транзакций (из БД) |
| POST | /api/htx/transactions | Синхронизировать с API HTX |

### 7.8 Google Sheets
| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/sheets/sync | Синхронизировать агентство |
| POST | /api/sheets/sync-all | Синхронизировать все |
| POST | /api/sheets/sync-spends | Синхронизировать спенды в Countries |

### 7.9 Кошельки
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/wallet/settings | Настройки кошелька |
| POST | /api/wallet/settings | Сохранить настройки |
| GET | /api/wallet/country-wallets | Кошельки стран |
| POST | /api/wallet/sync | Синхронизировать балансы |

### 7.10 Пользователи (Admin only)
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/users | Список пользователей |
| POST | /api/users | Создать пользователя |
| PATCH | /api/users | Обновить пользователя |
| DELETE | /api/users | Удалить пользователя |

---

## 8. Внешние интеграции

### 8.1 HTX (Huobi) API
**Назначение:** Получение баланса биржи и истории транзакций

**Секреты:**
- `HTX_API_KEY`
- `HTX_SECRET_KEY`

**Функции:**
- `getHtxBalance()` — баланс USDT
- `getHtxDepositHistory()` — история депозитов
- `getHtxWithdrawHistory()` — история выводов

**Особенности:**
- API хранит только 120 дней истории
- Транзакции сохраняются в БД для долгосрочного хранения

### 8.2 Moralis API
**Назначение:** Отслеживание BEP20 транзакций

**Секреты:**
- `MORALIS_API_KEY`

**Функции:**
- `getMoralisTokenTransfers()` — USDT переводы на BSC

### 8.3 BSC RPC
**Назначение:** Прямой запрос балансов

**Эндпоинт:** `https://bsc-dataseed.bnbchain.org`

**Функции:**
- `getBscUsdtBalance()` — баланс USDT
- `getBscBnbBalance()` — баланс BNB (для газа)

### 8.4 Google Sheets
**Назначение:** Синхронизация спендов агентств

**Маппинг десков на страны:**
| Деск | Страна |
|------|--------|
| Desk1 | Argentina (AR) |
| Desk2 | Peru 2 (PE2) |
| Desk3 | Peru (PE) |
| FBM | Italy Women (IT_F) |

**Функции:**
- Чтение спендов из таблиц CROSSGIF и FBM
- Автоматическое обновление DailyMetrics

---

## 9. Категории расходов

| Код | Название |
|-----|----------|
| accounts | Аккаунты |
| proxy | Прокси |
| hosting | Хостинг |
| software | Софт |
| advertising | Реклама |
| banking | Банковские комиссии |
| communications | Связь |
| office | Офис |
| payroll | ФОТ |
| commission | Комиссии |
| tools | Инструменты |
| wallet_transfer | Крипто-переводы |
| other | Прочее |

---

## 10. Цветовая схема

| Элемент | Цвет |
|---------|------|
| Sidebar / Dark | #0f172a |
| Primary Blue | #1e40af |
| Light Blue | #3b82f6 |
| Sky Blue | #60a5fa |
| Background | #ffffff |
| Text | #0f172a |
| Green (positive) | #22c55e |
| Red (negative) | #ef4444 |

---

## 11. Автоматизация

### 11.1 Реализованная автоматизация
1. **HTX баланс** — синхронизация по кнопке
2. **HTX транзакции** — синхронизация и сохранение в БД
3. **Определение страны депозита** — по адресу кошелька отправителя
4. **Спенды из Google Sheets** — синхронизация CROSSGIF/FBM → Countries
5. **Расчёт ROI, комиссий, ФОТ** — автоматически при вводе данных

### 11.2 Планируемая автоматизация
1. Автоматическая синхронизация каждый час
2. Уведомления о новых депозитах
3. Автоматический расчёт зарплат по периодам

---

## 12. Деплоймент

### 12.1 Платформа
- **Хостинг:** Replit (Autoscale deployment)
- **База данных:** PostgreSQL (Replit managed)
- **Домен:** d7dashboard.live

### 12.2 Команды
```bash
# Разработка
npm run dev -- -p 5000 -H 0.0.0.0

# Сборка
npm run build

# Продакшн
npm run start

# Миграции БД
npx prisma db push
```

---

## 13. Структура файлов

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API эндпоинты
│   │   ├── auth/            # Аутентификация
│   │   ├── buying/          # Метрики баеров
│   │   ├── cabinets/        # Кабинеты
│   │   ├── countries/       # Страны
│   │   ├── dashboard/       # Дашборд
│   │   ├── expenses/        # Расходы
│   │   ├── htx/             # HTX интеграция
│   │   ├── metrics/         # Метрики
│   │   ├── sheets/          # Google Sheets
│   │   ├── smm/             # SMM
│   │   ├── users/           # Пользователи
│   │   └── wallet/          # Кошельки
│   ├── agencies/            # Страница агентств
│   ├── analytics/           # Аналитика
│   ├── buying/              # Баинг
│   ├── cabinets/            # Кабинеты
│   ├── countries/           # Страны
│   ├── data-entry/          # Ввод данных
│   ├── finance/             # Финансы
│   ├── import/              # Импорт
│   ├── login/               # Вход
│   ├── payroll/             # ФОТ
│   ├── settings/            # Настройки
│   ├── smm/                 # SMM
│   ├── transactions/        # Транзакции
│   └── page.tsx             # Главная (дашборд)
├── components/
│   ├── dashboard/           # Компоненты дашборда
│   ├── layout/              # Sidebar, Header
│   └── ui/                  # Radix UI компоненты
├── lib/
│   ├── auth.ts              # Авторизация
│   ├── bsc-api.ts           # BSC интеграция
│   ├── calculations.ts      # Формулы расчётов
│   ├── db.ts                # Prisma клиент
│   ├── google-sheets.ts     # Google Sheets
│   ├── htx-api.ts           # HTX API
│   └── moralis-api.ts       # Moralis API
└── prisma/
    └── schema.prisma        # Схема БД
```

---

## 14. Требуемые секреты

| Секрет | Назначение |
|--------|------------|
| DATABASE_URL | Подключение к PostgreSQL |
| HTX_API_KEY | API ключ HTX биржи |
| HTX_SECRET_KEY | Секретный ключ HTX |
| MORALIS_API_KEY | API ключ Moralis |
| BSCSCAN_API_KEY | API ключ BSCScan |

---

## 15. Контакты и поддержка

- **GitHub:** github.com/hamzanewboy04-a11y/D7-Dash
- **Платформа:** Replit
- **Домен:** d7dashboard.live
