module.exports = {
  apps: [
    {
      name: 'selva-api',
      script: 'dist/main.js',
      cwd: '/selva/blockchain-system/apps/api',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
