#!/bin/bash

echo "Starting production server..."

echo "Running database schema sync..."
npx prisma db push --skip-generate

echo "Starting Next.js server..."
exec npm run start -- -p 5000 -H 0.0.0.0
