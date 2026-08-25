module.exports = {
  apps: [
    {
      name: 'summer-study-backend',
      script: 'npm',
      args: 'run start:prod',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
        // Secrets (JWT_SECRET, JWT_REFRESH_SECRET, KIDS_ACCESS_SECRET, FAMILY_PIN, ...) are
        // intentionally NOT set here. They must live only in backend/.env (gitignored, never
        // committed) and are picked up automatically by dotenv.config() in src/index.ts.
        // Do NOT hardcode secrets in this file — it is tracked in git.
      }
    }
  ]
};
