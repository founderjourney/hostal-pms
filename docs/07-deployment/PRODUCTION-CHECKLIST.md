# Production Deployment Checklist

## 1. Environment Configuration
- [ ] **Node.js Version**: Ensure Node.js 18+ is installed.
- [ ] **Environment Variables**:
  - Copy `.env.production.example` to `.env`.
  - Set `NODE_ENV=production`.
  - Set strong `ADMIN_PASSWORD` and `RECEPTION_PASSWORD`.
  - Set a random `SESSION_SECRET`.
  - Configure `PORT` (usually 3000 or 8080).

## 2. Database
- [ ] **PostgreSQL**: Ensure PostgreSQL is running and accessible.
- [ ] **Connection String**: Set `DATABASE_URL` in `.env`.
- [ ] **Migration**: Run `node server/migrate-ical-schema.js` and `node server/migrate-indexes.js`.
- [ ] **Backup**: Configure daily backups using `scripts/backup.sh`.

## 3. Security
- [ ] **SSL/TLS**: Ensure the server is behind Nginx/Apache with HTTPS (Let's Encrypt).
- [ ] **Firewall**: Open only necessary ports (e.g., 80, 443, 22).
- [ ] **Rate Limiting**: Verify `express-rate-limit` is active (enabled by default).
- [ ] **Secrets**: Ensure no secrets are committed to git.

## 4. Process Management
- [ ] **PM2**: Install PM2 (`npm install -g pm2`).
- [ ] **Start**: Run `pm2 start server/server-simple.js --name almanik-pms`.
- [ ] **Startup**: Run `pm2 startup` and `pm2 save`.

## 5. Monitoring
- [ ] **Logs**: Check logs folder is writable (`logs/`).
- [ ] **Rotation**: Verify `winston-daily-rotate-file` is working.
- [ ] **Sentry**: (Optional) Configure `SENTRY_DSN` for error tracking.

## 6. Final Verification
- [ ] **Health Check**: `curl http://localhost:3000/health` returns 200.
- [ ] **Login**: Verify admin login works.
- [ ] **iCal**: Verify public iCal export URLs are accessible.
