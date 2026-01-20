#!/bin/bash

echo "Starting production server..."

echo "Running database migrations..."
npx prisma db push --skip-generate

echo "Running database seeding..."
npx tsx scripts/seed-production.ts

echo "Starting Next.js server..."
exec npm run start -- -p 5000 -H 0.0.0.0
