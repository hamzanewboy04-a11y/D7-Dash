#!/usr/bin/env tsx
/**
 * Automatic Database Backup Script
 *
 * This script backs up your SQLite database to Turso cloud storage.
 * Run this script regularly (e.g., via cron job) to ensure data safety.
 *
 * Usage:
 *   npm run db:backup
 *
 * Environment variables required:
 *   TURSO_DATABASE_URL - Your Turso database URL
 *   TURSO_AUTH_TOKEN - Your Turso authentication token
 */

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const SQLITE_DB_PATH = path.join(process.cwd(), 'prisma', 'data.db');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

interface BackupStats {
  countries: number;
  employees: number;
  dailyMetrics: number;
  expenses: number;
  timestamp: string;
}

async function backupToTurso(): Promise<void> {
  console.log('🔄 Starting database backup to Turso...\n');

  // Check if Turso credentials are configured
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error('❌ Turso credentials not found!');
    console.log('\nTo enable cloud backups:');
    console.log('1. Sign up at https://turso.tech');
    console.log('2. Create a database: turso db create d7-dash');
    console.log('3. Get credentials: turso db show d7-dash --url');
    console.log('4. Create token: turso db tokens create d7-dash');
    console.log('5. Add to .env:');
    console.log('   TURSO_DATABASE_URL="libsql://..."');
    console.log('   TURSO_AUTH_TOKEN="eyJ..."');
    console.log('\nFalling back to local file backup only...\n');
    await backupToLocalFile();
    return;
  }

  try {
    // Connect to Turso
    const turso = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    // Read from local SQLite
    const prisma = new PrismaClient();

    const stats: BackupStats = {
      countries: 0,
      employees: 0,
      dailyMetrics: 0,
      expenses: 0,
      timestamp: new Date().toISOString(),
    };

    console.log('📊 Reading data from local database...');

    // Backup Countries
    const countries = await prisma.country.findMany();
    console.log(`  Found ${countries.length} countries`);

    for (const country of countries) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Country (id, name, currency, exchangeRate, isActive, status, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          country.id,
          country.name,
          country.currency,
          country.exchangeRate,
          country.isActive ? 1 : 0,
          country.status || 'active',
          country.createdAt.toISOString(),
          country.updatedAt.toISOString(),
        ],
      });
      stats.countries++;
    }

    // Backup Employees
    const employees = await prisma.employee.findMany();
    console.log(`  Found ${employees.length} employees`);

    for (const employee of employees) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Employee (id, name, role, salary, countryId, isActive, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          employee.id,
          employee.name,
          employee.role,
          employee.salary,
          employee.countryId,
          employee.isActive ? 1 : 0,
          employee.createdAt.toISOString(),
          employee.updatedAt.toISOString(),
        ],
      });
      stats.employees++;
    }

    // Backup DailyMetrics
    const metrics = await prisma.dailyMetrics.findMany();
    console.log(`  Found ${metrics.length} daily metrics`);

    for (const metric of metrics) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO DailyMetrics (
                id, date, countryId, totalSpend, fdCount, revenueUsdtPriemka, commissionPriemka,
                revenueLocalOwn, revenueUsdtOwn, fdSumLocal, totalRevenueUsdt, totalExpenses,
                netProfit, roi, payrollBuyer, payrollFdHandler, payrollRdHandler,
                payrollHeadDesigner, totalPayroll, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          metric.id,
          metric.date.toISOString(),
          metric.countryId,
          metric.totalSpend,
          metric.fdCount,
          metric.revenueUsdtPriemka,
          metric.commissionPriemka,
          metric.revenueLocalOwn,
          metric.revenueUsdtOwn,
          metric.fdSumLocal,
          metric.totalRevenueUsdt,
          metric.totalExpenses,
          metric.netProfit,
          metric.roi,
          metric.payrollBuyer,
          metric.payrollFdHandler,
          metric.payrollRdHandler,
          metric.payrollHeadDesigner,
          metric.totalPayroll,
          metric.createdAt.toISOString(),
          metric.updatedAt.toISOString(),
        ],
      });
      stats.dailyMetrics++;
    }

    // Backup Expenses
    const expenses = await prisma.expense.findMany();
    console.log(`  Found ${expenses.length} expenses`);

    for (const expense of expenses) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Expense (id, date, countryId, category, description, amount, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          expense.id,
          expense.date.toISOString(),
          expense.countryId,
          expense.category,
          expense.description || '',
          expense.amount,
          expense.createdAt.toISOString(),
          expense.updatedAt.toISOString(),
        ],
      });
      stats.expenses++;
    }

    await prisma.$disconnect();

    // Also create local file backup
    await backupToLocalFile();

    console.log('\n✅ Backup completed successfully!');
    console.log('📈 Backup Statistics:');
    console.log(`   Countries: ${stats.countries}`);
    console.log(`   Employees: ${stats.employees}`);
    console.log(`   Daily Metrics: ${stats.dailyMetrics}`);
    console.log(`   Expenses: ${stats.expenses}`);
    console.log(`   Timestamp: ${stats.timestamp}`);
    console.log(`\n💾 Data is now safely backed up to Turso cloud!`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    console.log('\n⚠️  Attempting local file backup as fallback...');
    await backupToLocalFile();
    process.exit(1);
  }
}

async function backupToLocalFile(): Promise<void> {
  try {
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `data-backup-${timestamp}.db`);

    // Copy database file
    fs.copyFileSync(SQLITE_DB_PATH, backupPath);

    // Compress old backups (keep only last 7 days)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('data-backup-'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only 7 most recent backups
    files.slice(7).forEach(f => {
      fs.unlinkSync(f.path);
      console.log(`   Removed old backup: ${f.name}`);
    });

    const fileSize = (fs.statSync(backupPath).size / 1024).toFixed(2);
    console.log(`✅ Local backup created: ${path.basename(backupPath)}`);
    console.log(`   Size: ${fileSize} KB`);
    console.log(`   Location: ${backupPath}`);
    console.log(`   Keeping ${files.slice(0, 7).length} recent backups`);

  } catch (error) {
    console.error('❌ Local backup failed:', error);
    throw error;
  }
}

// Run backup
backupToTurso().catch(console.error);
