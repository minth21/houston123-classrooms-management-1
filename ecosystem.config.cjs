/**
 * PM2 ecosystem config for Next.js production (cluster mode) 
 * Usage:
 * 1. Build: npm run build
 * 2. Start: npm run start:pm2
 */
module.exports = {
  apps: [
    {
      name: 'web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 'max', // Or a specific number e.g. 4
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      watch: false,
      autorestart: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
