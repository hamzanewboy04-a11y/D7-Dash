#!/bin/bash

echo "Starting production server..."

echo "Running database schema sync..."
npx prisma db push

echo "Syncing data to production..."
npx tsx scripts/sync-production-data.ts

echo "Starting Next.js server..."
exec npm run start -- -p 5000 -H 0.0.0.0
