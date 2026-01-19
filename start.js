const { execSync } = require('child_process');

console.log('🚀 Starting D7 Dashboard...');

// Push database schema
console.log('📦 Initializing database...');
try {
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('✅ Database ready');
} catch (error) {
  console.error('⚠️ Database initialization warning:', error.message);
}

// Start the server
console.log('🌐 Starting server...');
require('./server.js');
