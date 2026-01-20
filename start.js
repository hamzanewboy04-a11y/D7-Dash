const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting D7 Dashboard...');
console.log('📁 Working directory:', process.cwd());

// =====================================
// STEP 1: Check database mode (Turso cloud vs local SQLite)
// =====================================
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (tursoUrl && tursoToken) {
  console.log('☁️  Using Turso cloud database (PRODUCTION MODE)');
  console.log('🌐 Turso URL:', tursoUrl);
  console.log('✅ Data will persist across deployments');
  // Do NOT set DATABASE_URL - let Prisma client use Turso credentials
} else {
  console.log('📁 Using local SQLite database (DEVELOPMENT MODE)');
  console.log('⚠️  WARNING: Data will be lost on redeploy!');

  const dataDir = '/app/data';
  const sourceDb = path.join(process.cwd(), 'prisma', 'data.db');
  const targetDb = path.join(dataDir, 'prod.db');

  // Ensure data directory exists
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📂 Created data directory: ${dataDir}`);
    }
  } catch (err) {
    console.log('⚠️ Could not create data directory:', err.message);
  }

  // Copy committed database to writable location
  try {
    const targetExists = fs.existsSync(targetDb);
    const targetSize = targetExists ? fs.statSync(targetDb).size : 0;
    const sourceExists = fs.existsSync(sourceDb);
    const sourceSize = sourceExists ? fs.statSync(sourceDb).size : 0;

    console.log(`📂 Source DB (${sourceDb}): ${sourceExists ? `${(sourceSize / 1024).toFixed(2)} KB` : 'not found'}`);
    console.log(`📂 Target DB (${targetDb}): ${targetExists ? `${(targetSize / 1024).toFixed(2)} KB` : 'not found'}`);

    // Copy if target doesn't exist, is empty, or source is larger (newer data)
    if (sourceExists && sourceSize > 0 && (!targetExists || targetSize < sourceSize)) {
      console.log('📋 Copying committed database to writable location...');
      fs.copyFileSync(sourceDb, targetDb);
      // Also copy -wal and -shm if they exist
      if (fs.existsSync(sourceDb + '-wal')) {
        fs.copyFileSync(sourceDb + '-wal', targetDb + '-wal');
      }
      if (fs.existsSync(sourceDb + '-shm')) {
        fs.copyFileSync(sourceDb + '-shm', targetDb + '-shm');
      }
      console.log('✅ Database copied successfully');
    } else if (targetExists && targetSize > 0) {
      console.log('✅ Using existing database at writable location');
    } else if (!sourceExists) {
      console.log('⚠️ Source database not found, will create new one');
    }
  } catch (err) {
    console.log('⚠️ Database copy error:', err.message);
  }

  // Only set DATABASE_URL for local SQLite mode
  process.env.DATABASE_URL = `file:${targetDb}`;
  console.log('📁 Database URL set to:', process.env.DATABASE_URL);
}

// =====================================
// STEP 2: Initialize database schema (only for local SQLite)
// =====================================
if (!tursoUrl || !tursoToken) {
  console.log('📦 Initializing local database schema...');
  try {
    execSync('npx prisma db push', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('✅ Database schema ready');
  } catch (error) {
    console.error('⚠️ Database schema initialization warning:', error.message);
    console.log('📝 Will use fallback table creation via ensureDatabaseTables()');
  }
} else {
  console.log('☁️  Turso cloud database - schema already managed remotely');
}

// =====================================
// STEP 3: Start the server
// =====================================
console.log('🌐 Starting server...');
require('./server.js');

// =====================================
// STEP 4: Auto-seed after server starts
// =====================================
setTimeout(async () => {
  console.log('🌱 Checking if database needs seeding...');

  const port = process.env.PORT || 3000;

  const checkSeed = () => {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/api/seed`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  };

  const seedDatabase = () => {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:${port}/api/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
  };

  try {
    const status = await checkSeed();
    console.log('📊 Database status:', status);

    if (!status.seeded) {
      console.log('🌱 Database not seeded, auto-seeding now...');
      const result = await seedDatabase();
      console.log('✅ Auto-seed complete:', result);
    } else {
      console.log('✅ Database already seeded with', status.counts?.countries || 0, 'countries');
    }
  } catch (error) {
    console.error('⚠️ Auto-seed check failed (will retry on page load):', error.message);
  }
}, 3000);
