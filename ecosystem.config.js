module.exports = {
  apps: [
    {
      name: 'summer-study-backend',
      script: 'npm',
      args: 'run start:prod',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        JWT_SECRET: 'super-secret-key-for-summer-app',
        JWT_REFRESH_SECRET: 'super-secret-refresh-key-for-summer-app'
      }
    }
  ]
};
