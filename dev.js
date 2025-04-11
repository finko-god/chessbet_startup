const { execSync } = require('child_process');
const path = require('path');

// First build the app
console.log('Building Next.js app...');
try {
  execSync('npx next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Then run the custom server
console.log('Starting custom server with Socket.io...');
try {
  execSync('node server.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Server failed:', error);
  process.exit(1);
} 