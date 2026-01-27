# Рекомендации по улучшению кода D7-Dash

## 🔴 Критические проблемы (ВЫСОКИЙ ПРИОРИТЕТ)

### 1. **Хардкоженный пароль администратора**

**Файл**: `src/lib/auth.ts:146`

**Проблема**:
```typescript
const passwordHash = await hashPassword("admin123");
```

**Риск**: Любой, кто имеет доступ к коду, знает пароль администратора по умолчанию.

**Решение**:
```typescript
// Добавить в .env файл:
INITIAL_ADMIN_PASSWORD=<безопасный_пароль>

// В коде:
if (!process.env.INITIAL_ADMIN_PASSWORD) {
  throw new Error('INITIAL_ADMIN_PASSWORD environment variable is required');
}
const passwordHash = await hashPassword(process.env.INITIAL_ADMIN_PASSWORD);
```

**Приоритет**: 🔴 КРИТИЧЕСКИЙ - исправить немедленно

---

### 2. **Отсутствие валидации входных данных**

**Проблема**: API routes принимают данные без валидации

**Пример** (многие API routes):
```typescript
export async function POST(request: Request) {
  const data = await request.json(); // ❌ Нет валидации
  await prisma.dailyMetrics.create({ data });
}
```

**Риск**: 
- SQL injection через Prisma
- Некорректные данные в БД
- Краши приложения

**Решение**: Использовать Zod (уже установлен):
```typescript
import { z } from 'zod';

const MetricsSchema = z.object({
  date: z.string().datetime(),
  spend: z.number().positive(),
  revenue: z.number().positive(),
  countryId: z.string().uuid(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const data = MetricsSchema.parse(body); // ✅ Валидация
  await prisma.dailyMetrics.create({ data });
}
```

**Файлы для исправления**: Все API routes (~90 файлов)

**Приоритет**: 🔴 КРИТИЧЕСКИЙ

---

### 3. **Непоследовательный импорт Prisma**

**Проблема**: Смешанные паттерны импорта:
```typescript
// Вариант 1 (правильный):
import { prisma } from '@/lib/prisma';

// Вариант 2 (неправильный):
import prisma from '@/lib/prisma';
```

**Риск**: Множественные инстансы Prisma → утечки памяти

**Решение**: Стандартизировать на именованный экспорт во всех ~90+ файлах

**Приоритет**: 🟠 ВЫСОКИЙ

---

### 4. **Небезопасные cookie настройки**

**Файл**: `src/lib/auth.ts`

**Проблема**:
```typescript
sameSite: "none" // ❌ CSRF уязвимость
```

**Решение**:
```typescript
sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
```

**Приоритет**: 🔴 КРИТИЧЕСКИЙ

---

## 🟠 Важные улучшения (СРЕДНИЙ ПРИОРИТЕТ)

### 5. **Отсутствие обработки ошибок с деталями**

**Проблема**: Общие сообщения об ошибках:
```typescript
catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

**Улучшение**:
```typescript
catch (error) {
  console.error('Error in POST /api/metrics:', error);
  
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry' }, 
        { status: 409 }
      );
    }
  }
  
  return NextResponse.json(
    { 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, 
    { status: 500 }
  );
}
```

**Приоритет**: 🟠 ВЫСОКИЙ

---

### 6. **Отсутствие типов TypeScript**

**Проблема**: Использование `any` и `Record<string, unknown>`:
```typescript
const data: any = await fetchData(); // ❌
```

**Решение**: Создать типы в `src/types/`:
```typescript
// src/types/metrics.ts
export interface DailyMetricsInput {
  date: Date;
  countryId: string;
  spend: number;
  revenue: number;
  // ...
}

// Использование:
const data: DailyMetricsInput = await request.json();
```

**Приоритет**: 🟠 СРЕДНИЙ

---

### 7. **Нет пагинации на list эндпоинтах**

**Проблема**:
```typescript
const metrics = await prisma.dailyMetrics.findMany(); // ❌ Все записи
```

**Риск**: 
- Медленные запросы при росте данных
- Высокая нагрузка на память
- Плохой UX

**Решение**:
```typescript
const page = parseInt(searchParams.get('page') ?? '1');
const limit = parseInt(searchParams.get('limit') ?? '50');

const metrics = await prisma.dailyMetrics.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { date: 'desc' }
});

const total = await prisma.dailyMetrics.count();

return NextResponse.json({
  data: metrics,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
});
```

**Файлы**: `/api/metrics`, `/api/payroll`, `/api/expenses`, и др.

**Приоритет**: 🟠 СРЕДНИЙ

---

### 8. **Отсутствие индексов в БД**

**Проблема**: Медленные запросы по датам без индексов

**Решение**: Добавить в `prisma/schema.prisma`:
```prisma
model DailyMetrics {
  // ...
  
  @@index([date])
  @@index([countryId, date])
  @@index([createdAt])
}

model PayrollRecord {
  // ...
  
  @@index([paymentDate])
  @@index([employeeId, paymentDate])
}
```

**Приоритет**: 🟠 СРЕДНИЙ

---

### 9. **Отсутствие rate limiting**

**Проблема**: Нет защиты от DDoS и brute-force атак

**Решение**: Установить `next-rate-limit`:
```typescript
// src/lib/rate-limit.ts
import { NextRequest } from 'next/server';

const rateLimit = new Map<string, number[]>();

export function checkRateLimit(
  req: NextRequest, 
  limit: number = 10, 
  window: number = 60000
): boolean {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const timestamps = rateLimit.get(ip) ?? [];
  
  const recentRequests = timestamps.filter(t => now - t < window);
  
  if (recentRequests.length >= limit) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  
  return true;
}

// В API routes:
if (!checkRateLimit(request, 5, 60000)) { // 5 requests per minute
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

**Приоритет**: 🟠 ВЫСОКИЙ (для auth endpoints)

---

### 10. **Отсутствие логирования**

**Проблема**: Только `console.log`, нет структурированного логирования

**Решение**: Использовать winston или pino:
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Использование:
logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ error, context: '/api/metrics' }, 'Failed to fetch metrics');
```

**Приоритет**: 🟡 СРЕДНИЙ

---

## 🟡 Рекомендации по архитектуре (НИЗКИЙ ПРИОРИТЕТ)

### 11. **Создать слой сервисов**

**Проблема**: Бизнес-логика в API routes

**Текущее**:
```typescript
// app/api/metrics/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  // Много бизнес-логики здесь
  const calculated = calculateAllMetrics(data);
  await prisma.dailyMetrics.create({ data: calculated });
}
```

**Улучшенное**:
```typescript
// src/services/metrics.service.ts
export class MetricsService {
  async createMetrics(data: MetricsInput): Promise<DailyMetrics> {
    const validated = MetricsSchema.parse(data);
    const calculated = calculateAllMetrics(validated);
    return await prisma.dailyMetrics.create({ data: calculated });
  }
}

// app/api/metrics/route.ts
const metricsService = new MetricsService();

export async function POST(request: Request) {
  const data = await request.json();
  const metrics = await metricsService.createMetrics(data);
  return NextResponse.json(metrics);
}
```

**Приоритет**: 🟡 НИЗКИЙ (рефакторинг)

---

### 12. **Добавить middleware pipeline**

**Решение**: Создать composable middleware:
```typescript
// src/middleware/compose.ts
export function composeMiddleware(...middlewares: Middleware[]) {
  return async (request: Request) => {
    for (const middleware of middlewares) {
      const result = await middleware(request);
      if (result) return result; // Early return on error
    }
  };
}

// Использование:
const handler = composeMiddleware(
  authMiddleware,
  rateLimitMiddleware,
  loggingMiddleware
);
```

**Приоритет**: 🟡 НИЗКИЙ

---

### 13. **Создать репозиторий паттерн для Prisma**

**Решение**:
```typescript
// src/repositories/metrics.repository.ts
export class MetricsRepository {
  async findByDateRange(startDate: Date, endDate: Date, countryId?: string) {
    return await prisma.dailyMetrics.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(countryId && { countryId })
      }
    });
  }
  
  async create(data: DailyMetricsInput) {
    return await prisma.dailyMetrics.create({ data });
  }
}
```

**Приоритет**: 🟡 НИЗКИЙ

---

## 📝 Отсутствующие функции

### 14. **Тестирование**

**Проблема**: Нет тестов вообще

**Решение**: Добавить Jest + React Testing Library:
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
```

**Примеры тестов**:
```typescript
// __tests__/lib/calculations.test.ts
import { calculateAgencyFee, calculateRoi } from '@/lib/calculations';

describe('Calculations', () => {
  it('should calculate 9% for TRUST agency', () => {
    expect(calculateAgencyFee(1000, 'TRUST')).toBe(90);
  });
  
  it('should calculate 8% for other agencies', () => {
    expect(calculateAgencyFee(1000, 'FBM')).toBe(80);
  });
  
  it('should calculate ROI correctly', () => {
    expect(calculateRoi(500, 1000)).toBe(50);
  });
});
```

**Приоритет**: 🟠 СРЕДНИЙ

---

### 15. **API документация**

**Решение**: Использовать Swagger/OpenAPI:
```typescript
// Установить:
npm install next-swagger-doc swagger-ui-react

// Создать:
// src/app/api/docs/route.ts
import { createSwaggerSpec } from 'next-swagger-doc';

export async function GET() {
  const spec = createSwaggerSpec({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'D7-Dash API',
        version: '1.0.0'
      }
    }
  });
  
  return Response.json(spec);
}
```

**Приоритет**: 🟡 НИЗКИЙ

---

### 16. **Audit trail (история изменений)**

**Решение**: Добавить таблицу AuditLog:
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // CREATE, UPDATE, DELETE
  entity    String   // DailyMetrics, Employee, etc.
  entityId  String
  before    Json?
  after     Json?
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

**Приоритет**: 🟡 НИЗКИЙ

---

### 17. **Экспорт данных**

**Проблема**: Есть импорт Excel, но нет экспорта

**Решение**:
```typescript
// src/lib/excel-export.ts
import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
}

// API endpoint:
export async function GET(request: Request) {
  const metrics = await prisma.dailyMetrics.findMany();
  const buffer = await generateExcel(metrics);
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=metrics.xlsx'
    }
  });
}
```

**Приоритет**: 🟡 НИЗКИЙ

---

### 18. **Кэширование**

**Решение**: Redis или Next.js cache:
```typescript
// src/lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedCountries = unstable_cache(
  async () => {
    return await prisma.country.findMany();
  },
  ['countries'],
  { revalidate: 3600 } // 1 hour
);

// Или использовать Redis:
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached<T>(
  key: string, 
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

**Приоритет**: 🟡 НИЗКИЙ

---

## 🐛 Багфиксы и оптимизации

### 19. **N+1 query problem**

**Проблема**: Возможные N+1 запросы:
```typescript
const countries = await prisma.country.findMany();
for (const country of countries) {
  const metrics = await prisma.dailyMetrics.findMany({
    where: { countryId: country.id }
  }); // ❌ N+1
}
```

**Решение**:
```typescript
const countries = await prisma.country.findMany({
  include: {
    dailyMetrics: true // ✅ Один запрос
  }
});
```

**Приоритет**: 🟠 СРЕДНИЙ

---

### 20. **Использовать transactions для связанных операций**

**Решение**:
```typescript
await prisma.$transaction(async (tx) => {
  const metrics = await tx.dailyMetrics.create({ data: metricsData });
  await tx.expense.create({ 
    data: { 
      amount: metrics.totalExpenses,
      date: metrics.date 
    } 
  });
  await tx.payrollRecord.createMany({ data: payrollData });
});
```

**Приоритет**: 🟠 СРЕДНИЙ

---

## 📊 Метрики качества кода

### Текущее состояние:
- ❌ **Тесты**: 0%
- ⚠️ **Type coverage**: ~70% (много `any`)
- ⚠️ **Документация**: Частичная
- ❌ **Валидация**: 0%
- ❌ **Rate limiting**: Нет
- ⚠️ **Error handling**: Базовое
- ❌ **Logging**: Console only
- ❌ **Caching**: Нет
- ⚠️ **Security**: Есть уязвимости

### Целевое состояние:
- ✅ **Тесты**: >80%
- ✅ **Type coverage**: 100%
- ✅ **Документация**: Полная
- ✅ **Валидация**: 100% API routes
- ✅ **Rate limiting**: На auth/sensitive endpoints
- ✅ **Error handling**: Детальное с логированием
- ✅ **Logging**: Структурированное
- ✅ **Caching**: На статичные данные
- ✅ **Security**: Без уязвимостей

---

## 🎯 План действий

### Фаза 1: Критические исправления (1-2 недели)
1. ✅ Исправить хардкоженный пароль админа
2. ✅ Добавить Zod валидацию во все API routes
3. ✅ Стандартизировать импорт Prisma
4. ✅ Исправить cookie настройки
5. ✅ Добавить rate limiting на auth endpoints

### Фаза 2: Важные улучшения (2-3 недели)
6. Улучшить обработку ошибок
7. Добавить TypeScript типы
8. Добавить пагинацию
9. Добавить индексы БД
10. Добавить логирование

### Фаза 3: Архитектурные улучшения (4-6 недель)
11. Создать слой сервисов
12. Добавить middleware pipeline
13. Создать репозиторий паттерн
14. Добавить тесты
15. Добавить API документацию

### Фаза 4: Дополнительные функции (ongoing)
16. Audit trail
17. Экспорт данных
18. Кэширование
19. Оптимизации запросов
20. Мониторинг и метрики

---

## 📚 Рекомендуемые библиотеки

### Необходимые:
- `zod` ✅ (уже установлен) - Валидация
- `pino` - Логирование
- `@sentry/nextjs` - Error tracking
- `redis` или `@vercel/kv` - Кэширование

### Полезные:
- `jest` + `@testing-library/react` - Тестирование
- `next-swagger-doc` - API документация
- `helmet` - Security headers
- `bcrypt` - Более безопасное хеширование паролей (альтернатива scrypt)
- `jsonwebtoken` - JWT токены (альтернатива UUID сессиям)

---

## 💡 Дополнительные рекомендации

### Производительность:
1. Использовать `React.memo` для дорогих компонентов
2. Использовать `useMemo`/`useCallback` где нужно
3. Оптимизировать bundle size (tree shaking)
4. Использовать Next.js Image для оптимизации изображений

### Безопасность:
1. Включить HTTPS только в продакшене
2. Добавить CORS настройки
3. Добавить CSP (Content Security Policy)
4. Регулярно обновлять зависимости
5. Использовать `npm audit` для проверки уязвимостей

### DevOps:
1. Настроить CI/CD pipeline (GitHub Actions)
2. Добавить pre-commit hooks (husky + lint-staged)
3. Настроить мониторинг (Grafana, Prometheus)
4. Настроить алерты

### UX:
1. Добавить loading states везде
2. Добавить error boundaries
3. Добавить offline mode
4. Улучшить мобильную версию
5. Добавить темную тему (уже есть Tailwind, нужно активировать)

---

**Общая оценка времени на все улучшения**: 2-3 месяца для одного разработчика

**Приоритет по фазам**:
- Фаза 1: КРИТИЧНО - начать немедленно
- Фаза 2: ВАЖНО - в течение месяца
- Фаза 3-4: ЖЕЛАТЕЛЬНО - по мере доступности ресурсов
