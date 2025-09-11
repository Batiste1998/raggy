module.exports = {
  apps: [{
    name: 'raggy',
    script: 'dist/main.js',
    
    // Production
    instances: 2,
    exec_mode: 'cluster',
    
    // Logs
    log_file: './logs/app.log',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    
    // Auto-restart
    max_restarts: 5,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};