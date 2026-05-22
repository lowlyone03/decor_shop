module.exports = {
  apps: [
    {
      name: 'casa-decor',
      script: 'src/server.js',
      instances: 'max', // Chạy trên tất cả các core CPU (Cluster mode)
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
