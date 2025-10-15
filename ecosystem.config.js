module.exports = {
    apps: [{
        name: 'mock-api-server',
        script: 'dist/index.js',
        instances: 2,
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env_production: {
            NODE_ENV: 'production'
        }
    }]
};
