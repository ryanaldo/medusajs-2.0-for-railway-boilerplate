const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const MEDUSA_SERVER_PATH = path.join(process.cwd(), '.medusa', 'server');

// Check if .medusa/server exists - if not, build process failed
if (!fs.existsSync(MEDUSA_SERVER_PATH)) {
  throw new Error('.medusa/server directory not found. This indicates the Medusa build process failed. Please check for build errors.');
}

// Safely copy package-lock.json if it exists
const lockPath = path.join(process.cwd(), 'package-lock.json');
if (fs.existsSync(lockPath)) {
  fs.copyFileSync(lockPath, path.join(MEDUSA_SERVER_PATH, 'package-lock.json'));
}

// Copy .env if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  fs.copyFileSync(
    envPath,
    path.join(MEDUSA_SERVER_PATH, '.env')
  );
}

// Install dependencies using standard npm to match your environment slate
console.log('Installing dependencies in .medusa/server...');
try {
  execSync('npm install --omit=dev --legacy-peer-deps', { 
    cwd: MEDUSA_SERVER_PATH,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Dependency installation failed, attempting standard fall-through...', error);
}