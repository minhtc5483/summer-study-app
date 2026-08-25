module.exports = {
  apps: [
    {
      name: 'summer-study-backend',
      script: 'npm',
      args: 'run start:prod',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        // 3000 is already used on this Pi by an unrelated project's Docker container
        // (flowtask-api-1 publishes 127.0.0.1:3000), which silently swallows all traffic
        // meant for this app via Docker's iptables port publishing. Moved to 3001 to avoid
        // the conflict — update the Cloudflare Tunnel's Public Hostname target to match.
        PORT: 3001
        // Secrets (JWT_SECRET, JWT_REFRESH_SECRET, KIDS_ACCESS_SECRET, FAMILY_PIN, ...) are
        // intentionally NOT set here. They must live only in backend/.env (gitignored, never
        // committed) and are picked up automatically by dotenv.config() in src/index.ts.
        // Do NOT hardcode secrets in this file — it is tracked in git.
      }
    }
  ]
};
