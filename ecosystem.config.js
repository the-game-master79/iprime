module.exports = {
  apps: [{
    name: 'price-updater',
    script: './dist/servers/priceServer.js',
    env: {
      NODE_ENV: 'production',
      TRADERMADE_API_KEY: 'your-api-key-here',
      VITE_SUPABASE_URL: 'your-supabase-url',
      VITE_SUPABASE_ANON_KEY: 'your-supabase-key'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/price-updater-error.log',
    out_file: 'logs/price-updater-out.log',
    time: true
  }]
};
