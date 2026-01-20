# 📦 Сохранение базы данных при редеплое

## Проблема

При редеплое приложения (например, на Vercel, Netlify, Railway и т.д.) файловая система контейнера **временная** - все изменения в файлах (включая `data.db`) теряются после каждого деплоя или перезапуска.

## ✅ Решения

### Вариант 1: Использовать постоянное хранилище (Рекомендуется для прод)

#### A. Railway / Render

1. **Подключите Volume (постоянное хранилище)**
   ```bash
   # Railway автоматически предлагает Volume при обнаружении SQLite
   # Или создайте вручную в настройках проекта
   ```

2. **Измените путь к БД в `.env`:**
   ```env
   DATABASE_URL="file:/data/data.db"
   ```

3. **Настройте volume path:** `/data` → монтируется как постоянное хранилище

#### B. Vercel (ограничения!)

⚠️ **Vercel не поддерживает постоянную файловую БД!**

Решение: Используйте внешнюю БД:
- **Turso** (SQLite в облаке) - https://turso.tech
- **PlanetScale** (MySQL)
- **Supabase** (PostgreSQL)

Пример для Turso:
```env
DATABASE_URL="libsql://your-database.turso.io"
DATABASE_AUTH_TOKEN="your-token"
```

### Вариант 2: Ручной бэкап/восстановление (Для разработки)

#### Скачать базу с сервера:

```bash
# Через SSH (если есть доступ)
scp user@your-server:/path/to/app/prisma/data.db ./backup-$(date +%Y%m%d).db

# Через Railway CLI
railway run cat prisma/data.db > backup-$(date +%Y%m%d).db
```

#### Загрузить базу на сервер:

```bash
# Через SSH
scp ./data.db user@your-server:/path/to/app/prisma/data.db

# Через Railway CLI
railway run sh -c 'cat > prisma/data.db' < ./data.db
```

### Вариант 3: Автоматический бэкап в Git (Простой)

**⚠️ ВНИМАНИЕ:** Не рекомендуется для production с чувствительными данными!

#### Настройка:

1. **Добавьте БД в Git** (если еще не добавлена):
   ```bash
   git add prisma/data.db
   git commit -m "chore: Add database to repo"
   git push
   ```

2. **Создайте скрипт автоматического коммита:**

   ```bash
   # scripts/backup-db.sh
   #!/bin/bash
   git add prisma/data.db
   git commit -m "chore: Auto-backup database $(date +%Y-%m-%d)"
   git push origin main
   ```

3. **Добавьте в package.json:**
   ```json
   {
     "scripts": {
       "db:backup": "bash scripts/backup-db.sh"
     }
   }
   ```

4. **Запускайте регулярно:**
   ```bash
   npm run db:backup
   ```

#### Автоматизация через cron (опционально):

```bash
# Добавьте в crontab (каждый день в 2:00)
0 2 * * * cd /path/to/D7-Dash && npm run db:backup
```

### Вариант 4: S3/Облачное хранилище (Production)

```typescript
// scripts/backup-to-s3.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const client = new S3Client({ region: "us-east-1" });

async function backup() {
  const fileContent = fs.readFileSync("./prisma/data.db");

  await client.send(new PutObjectCommand({
    Bucket: "your-bucket",
    Key: `backups/data-${new Date().toISOString()}.db`,
    Body: fileContent,
  }));

  console.log("✅ Backup uploaded to S3");
}

backup();
```

## 🔧 Текущая настройка проекта

**Используется:** SQLite файл `prisma/data.db`

**Проблемы:**
- ❌ При редеплое данные теряются (если нет Volume)
- ❌ Не подходит для serverless (Vercel)

**Рекомендации:**

### Для разработки:
✅ Добавьте `prisma/data.db` в Git
✅ Делайте коммиты после важных изменений

### Для production:
✅ Используйте Railway/Render с Volume
✅ Или переходите на облачную БД (Turso, Supabase)

## 📋 Чеклист перед деплоем

- [ ] База данных включена в Git или есть Volume
- [ ] Настроены переменные окружения `DATABASE_URL`
- [ ] Есть резервная копия БД локально
- [ ] Протестирован процесс восстановления из бэкапа

## 🚀 Быстрый старт

### Текущий проект (Railway):

1. **Создайте Volume в Railway:**
   - Dashboard → Project → New Volume
   - Mount Path: `/data`

2. **Обновите .env:**
   ```env
   DATABASE_URL="file:/data/data.db"
   ```

3. **Деплойте:**
   ```bash
   git push
   ```

База данных теперь сохранится между деплоями! 🎉

## 📞 Дополнительная помощь

- **Railway Docs:** https://docs.railway.app/databases/sqlite
- **Turso Docs:** https://docs.turso.tech/
- **Prisma SQLite:** https://www.prisma.io/docs/orm/overview/databases/sqlite
