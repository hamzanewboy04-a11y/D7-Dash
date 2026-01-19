const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting D7 Dashboard...');
console.log('📁 Database URL:', process.env.DATABASE_URL || 'not set (will use default)');
console.log('📁 Working directory:', process.cwd());

// Check data directory
const dataDir = '/app/data';
try {
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    console.log(`📂 Data directory (${dataDir}) contents:`, files.length > 0 ? files : '(empty)');

    // Check database file size if exists
    const dbPath = path.join(dataDir, 'prod.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`📊 Database file size: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  } else {
    console.log(`📂 Data directory (${dataDir}) does not exist, will be created`);
  }
} catch (err) {
  console.log('📂 Could not check data directory:', err.message);
}

// Push database schema
console.log('📦 Initializing database schema...');
try {
  // Note: We use better-sqlite3 adapter and ensureDatabaseTables() handles schema
  // Prisma db push may not be needed since we create tables directly in prisma.ts
  execSync('npx prisma db push', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('✅ Database schema ready');
} catch (error) {
  console.error('⚠️ Database schema initialization warning:', error.message);
  console.log('📝 Will use fallback table creation via ensureDatabaseTables()');
}

// Start the server first
console.log('🌐 Starting server...');
require('./server.js');

// Auto-seed after server starts (delay to ensure server is ready)
setTimeout(async () => {
  console.log('🌱 Checking if database needs seeding...');

  const port = process.env.PORT || 3000;

  // Check seed status
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

  // Seed database
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
}, 3000); // Wait 3 seconds for server to be ready
