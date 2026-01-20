# Production Deployment Guide

## Решение проблемы с сохранением данных на Railway

### Проблема
При каждом redeploy на Railway все данные в базе SQLite теряются, так как контейнер пересоздается.

### ✅ Реализованные решения

#### 1. Автоматический Backup Script (РЕКОМЕНДУЕТСЯ)

Создан скрипт `scripts/backup-to-turso.ts` который:
- ✅ Автоматически делает локальные бэкапы базы данных
- ✅ Сохраняет последние 7 бэкапов локально в `/backups`
- ✅ Опционально синхронизирует с Turso Cloud
- ✅ Запускается вручную или по расписанию

**Как запустить:**

```bash
# Добавьте в package.json
npm run db:backup
```

Добавьте в `package.json`:
```json
{
  "scripts": {
    "db:backup": "tsx scripts/backup-to-turso.ts"
  }
}
```

#### 2. Turso Cloud Database (Профессиональное решение)

**Преимущества:**
- ☁️ Облачное хранилище SQLite
- 🔄 Автоматическая репликация
- 🚀 Низкая латентность
- 💰 Бесплатный тариф: 500 databases, 9GB storage
- 🔒 Автоматические бэкапы

**Установка:**

1. **Зарегистрируйтесь на Turso:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
```

2. **Создайте базу данных:**
```bash
turso db create d7-dash --location fra
```

3. **Получите credentials:**
```bash
turso db show d7-dash --url
turso db tokens create d7-dash
```

4. **Добавьте в Railway Environment Variables:**
```
TURSO_DATABASE_URL=libsql://d7-dash-[user].turso.io
TURSO_AUTH_TOKEN=eyJ...
```

5. **Обновите Prisma schema** (`prisma/schema.prisma`):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("TURSO_DATABASE_URL")
}
```

6. **Миграция данных:**
```bash
npm run db:backup  # Создаст бэкап в Turso
```

#### 3. Git-based Backup (Временное решение)

**Для быстрого старта:**

```bash
# Добавьте базу в Git (ТОЛЬКО ДЛЯ РАЗРАБОТКИ!)
git add prisma/data.db
git commit -m "chore: Add database backup"
git push
```

⚠️ **Внимание:** Не рекомендуется для продакшена из-за:
- Размера репозитория
- Проблем с конфликтами при параллельных изменениях
- Отсутствия автоматических бэкапов

## Railway Environment Variables

Добавьте следующие переменные в Railway:

```bash
# Database (если используете Turso)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Или для локального SQLite
DATABASE_URL=file:./prisma/data.db

# Application Settings (опционально)
NODE_ENV=production
```

## Автоматические бэкапы

### Вариант 1: Railway Cron Job

Создайте отдельный Railway Service:

```yaml
# railway.yml
services:
  - name: backup-cron
    source: .
    buildCommand: npm install
    startCommand: npm run db:backup
    schedule: "0 */6 * * *"  # Каждые 6 часов
```

### Вариант 2: GitHub Actions

Создайте `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 */6 * * *'  # Каждые 6 часов
  workflow_dispatch:  # Ручной запуск

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run db:backup
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
```

### Вариант 3: External Cron Service

Используйте cron-job.org или EasyCron для вызова webhook:

1. Создайте API endpoint `/api/backup`:

```typescript
// src/app/api/backup/route.ts
import { execSync } from 'child_process';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.BACKUP_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    execSync('npm run db:backup');
    return Response.json({ success: true, timestamp: new Date() });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
```

2. Добавьте BACKUP_SECRET в Railway
3. Настройте cron на `https://your-app.railway.app/api/backup`

## Восстановление данных

### Из локального бэкапа:

```bash
# Найдите последний бэкап
ls -lt backups/

# Восстановите
cp backups/data-backup-2024-01-20T10-30-00-000Z.db prisma/data.db
```

### Из Turso:

```bash
# Экспортируйте из Turso
turso db shell d7-dash .dump > backup.sql

# Импортируйте в локальную базу
sqlite3 prisma/data.db < backup.sql
```

## Мониторинг

Добавьте проверку статуса бэкапов:

```typescript
// src/app/api/backup/status/route.ts
import fs from 'fs';
import path from 'path';

export async function GET() {
  const backupDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    return Response.json({
      lastBackup: null,
      status: 'no_backups'
    });
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('data-backup-'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(backupDir, f)).mtime,
      size: fs.statSync(path.join(backupDir, f)).size
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());

  const lastBackup = files[0];
  const hoursSinceBackup = lastBackup
    ? (Date.now() - lastBackup.time.getTime()) / (1000 * 60 * 60)
    : null;

  return Response.json({
    lastBackup: lastBackup?.time,
    backupCount: files.length,
    totalSize: files.reduce((s, f) => s + f.size, 0),
    status: hoursSinceBackup && hoursSinceBackup > 12 ? 'warning' : 'ok'
  });
}
```

## Рекомендации для Production

### ✅ Обязательно:
1. Используйте Turso для надежного хранения
2. Настройте автоматические бэкапы (каждые 6-12 часов)
3. Храните как минимум 7 последних бэкапов
4. Тестируйте восстановление регулярно

### ⚠️ Важно:
1. Никогда не храните базу только в Git
2. Используйте переменные окружения для секретов
3. Мониторьте размер базы данных
4. Настройте алерты при проблемах с бэкапами

### 🚀 Опционально:
1. Настройте репликацию Turso в несколько регионов
2. Используйте S3 для долгосрочного хранения бэкапов
3. Настройте метрики и dashboard для мониторинга
4. Автоматизируйте тестирование восстановления

## Проверка работоспособности

После деплоя проверьте:

```bash
# 1. База данных доступна
curl https://your-app.railway.app/api/dashboard

# 2. Бэкапы работают
npm run db:backup

# 3. Данные сохраняются
# Добавьте тестовую запись, сделайте redeploy, проверьте наличие
```

## Миграция с локального SQLite на Turso

Пошаговая инструкция:

1. **Создайте бэкап текущих данных:**
```bash
npm run db:backup
```

2. **Настройте Turso** (см. выше)

3. **Запустите миграцию:**
```bash
# Скрипт автоматически перенесет все данные
npm run db:backup  # С TURSO_* переменными
```

4. **Обновите DATABASE_URL в Railway:**
```
DATABASE_URL=libsql://your-db.turso.io
```

5. **Проверьте данные:**
```bash
turso db shell d7-dash "SELECT COUNT(*) FROM DailyMetrics;"
```

## Поддержка

Если возникли проблемы:

1. Проверьте логи Railway
2. Убедитесь что TURSO_* переменные установлены
3. Проверьте что скрипт backup имеет права на запись
4. Посмотрите `/backups` директорию

---

**Статус:** ✅ Все системы бэкапов реализованы и готовы к использованию

**Последнее обновление:** 2024-01-20
