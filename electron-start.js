const { spawn } = require('child_process');
const { app } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // Wait for React dev server to start
  const reactProcess = spawn('npm', ['run', 'dev:renderer'], {
    stdio: 'inherit',
    shell: true
  });

  // Start Electron after a delay
  setTimeout(() => {
    require('./src/main/main.js');
  }, 3000);
} else {
  require('./src/main/main.js');
}