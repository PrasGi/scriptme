# Script Minder – VPS Deployment (Step by Step)

Deploy **script-minder** (Next.js app + **worker:analyze**), **MongoDB**, **Redis**, and optional **Grafana + Loki** for log dashboards. The app uses JSON logging (`lib/logger`) suitable for Loki and Grafana.

**Context:** This guide follows the same VPS setup as your **docker** repo:

- **Jenkins** runs on the **host** at `jenkins.prasme.id` (port 8081). Pipelines copy code to **`/projects/<project-name>`** (e.g. `/projects/script-minder`) and run `docker compose` there. See docker repo docs for the standard deploy directory location.
- **Nginx** (Docker) is the entry point for HTTPS; configs live in `/docker/nginx/conf.d/`. All app traffic goes through Nginx on `server-network`.
- **MongoDB and Redis:** Started **separately** from the docker repo (`/docker/redis`, `/docker/db/mongo`), one by one. They are shared by script-minder and other projects. script-minder’s compose has **only app + worker** (no Mongo/Redis).

See your **docker** repo docs: `docs/01-ARCHITECTURE-OVERVIEW.md`, `docs/04-JENKINS-DOCKER-DEPLOYMENT.md`, `docs/07-DEPLOY-NEW-PROJECT.md`.

---

## Prerequisites

- VPS with Docker and Docker Compose; **infrastructure** (nginx, db, monitoring) at **`/docker`**; **application deploy directories** at **`/projects/<project-name>`** (e.g. `/projects/script-minder`)
- **`server-network`** exists: `docker network create server-network`
- Domain for the app: **scriptme.cloud** (DNS A record pointing to your VPS IP). See docker repo **09-DOMAIN-SETUP-SCRIPTME-CLOUD.md** for full domain setup steps.

---

## Step 1: Create Docker network (if not exists)

On the VPS:

```bash
docker network create server-network
```

---

## Step 2: Start MongoDB and Redis (separately, from docker repo)

MongoDB and Redis are **not** in script-minder’s compose. Start them **one by one** from the docker repo; they are shared by script-minder and other projects.

**Redis:**

```bash
cd /docker/redis
cp .env.example .env
# Edit .env: REDIS_PORT=6379
docker compose up -d
docker exec redis redis-cli ping   # expect PONG
```

**MongoDB:**

```bash
cd /docker/db/mongo
cp .env.example .env
# Edit .env: MONGO_ROOT_USER, MONGO_ROOT_PASSWORD, MONGO_DB=scriptminder, MONGO_PORT=27017
mkdir -p data logs init-scripts
docker compose up -d
docker exec mongodb mongosh --eval "db.adminCommand('ping')"   # expect { ok: 1 }
```

Then in script-minder’s `.env` use:  
`MONGODB_URI=mongodb://<user>:<pass>@mongodb:27017/scriptminder?authSource=admin` and `REDIS_URL=redis://redis:6379`.  
See docker repo **08-DEPLOY-ORDER-REDIS-MONGO-PROJECT.md** for the full order.

---

## Step 3: Environment variables

In script-minder root create `.env`. Mongo and Redis are started from `/docker` (Step 2); set connection strings:

```env
# Shared Mongo/Redis (from /docker/db/mongo and /docker/redis)
MONGODB_URI=mongodb://admin:<password>@mongodb:27017/scriptminder?authSource=admin
REDIS_URL=redis://redis:6379

APP_PORT=3200
NODE_ENV=production

# Auth (required)
AUTH_SECRET=<generate with: openssl rand -base64 32>

# Google OAuth (optional)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# GitHub OAuth (optional)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# AI (required for analyze)
GOOGLE_GENAI_API_KEY=<your-key>
```

---

## Step 4: Build and run

Ensure Redis and MongoDB from Step 2 are running. Then:

```bash
cd /projects/script-minder
docker compose build --no-cache
docker compose up -d
```

Check:

```bash
docker ps
curl http://localhost:3200/api/health
```

Expected: `{"status":"ok","service":"script-minder",...}`

---

## Step 5: Nginx (reverse proxy + SSL)

Nginx runs in Docker on `server-network`. The app container is **`script-minder`** and listens on **3000** inside the container (see docker repo **02-NGINX-FLOW.md**).

1. **Nginx config** for **scriptme.cloud** is in the **docker** repo as `nginx/conf.d/script-minder.conf`. After you pull the docker project on the VPS, the file is at `/docker/nginx/conf.d/script-minder.conf` and Nginx will load it. Get an SSL certificate and reload Nginx (see docker repo **09-DOMAIN-SETUP-SCRIPTME-CLOUD.md**). If you use a different domain, edit `server_name` and SSL paths in that file. Otherwise use the same pattern as `tenant-store.conf`: upstream **`script-minder:3000`**, then HTTP→HTTPS redirect and HTTPS server block with your domain and SSL paths (e.g. Let’s Encrypt under `/etc/letsencrypt/live/<your-domain>/`). Example:

```nginx
# Upstream – container name on server-network
upstream script-minder {
    server script-minder:3000 fail_timeout=0;
}

# HTTP → HTTPS redirect (include /.well-known/acme-challenge/ for certbot)
server {
    listen 80;
    listen [::]:80;
    server_name scriptme.cloud www.scriptme.cloud;
    location /.well-known/acme-challenge/ { root /usr/share/nginx/html; }
    location / { return 301 https://$host$request_uri; }
}

# HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name scriptme.cloud www.scriptme.cloud;
    ssl_certificate /etc/letsencrypt/live/scriptme.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scriptme.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    # ... security headers, access_log, error_log ...

    location / {
        proxy_pass http://script-minder;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    location /_next/static {
        proxy_pass http://script-minder;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

2. **Test and reload Nginx** (same as in **04-JENKINS-DOCKER-DEPLOYMENT.md**):

```bash
docker exec nginx nginx -t && docker exec nginx nginx -s reload
```

SSL: use certbot with webroot `-w /docker/nginx/html` or standalone; see docker repo **03-SSL-CERTIFICATES.md**.

---

## Step 6: Jenkins CI/CD

Jenkins runs on the **host** (e.g. `https://jenkins.prasme.id`). The pipeline copies the repo to **`/projects/script-minder`** and runs `docker compose` there (**04-JENKINS-DOCKER-DEPLOYMENT.md**).

1. **Credentials** (Manage Jenkins → Credentials → Add Secret text):

   | Credential ID | Description |
   |---------------|--------------|
   | `script-minder-mongo-root-user` | MongoDB user (used to build MONGODB_URI for shared `mongodb`) |
   | `script-minder-mongo-root-password` | MongoDB root password |
   | `script-minder-auth-secret` | NextAuth `AUTH_SECRET` (e.g. `openssl rand -base64 32`) |
   | `script-minder-google-genai-api-key` | `GOOGLE_GENAI_API_KEY` for AI/analyze |
   | `script-minder-google-oauth-id` | `AUTH_GOOGLE_ID` (optional) |
   | `script-minder-google-oauth-secret` | `AUTH_GOOGLE_SECRET` (optional) |
   | `script-minder-github-oauth-id` | `AUTH_GITHUB_ID` (optional) |
   | `script-minder-github-oauth-secret` | `AUTH_GITHUB_SECRET` (optional) |
   | `script-minder-cloudflare-proxy-url` | `CLOUDFLARE_PROXY_URL` (optional) |
   | `script-minder-cloudflare-tiktok-url` | `CLOUDFLARE_TIKTOK_URL` (optional) |

   **Note:** `NEXTAUTH_URL` is set in the Jenkinsfile to `https://scriptme.cloud`. To use another domain, edit the pipeline `environment { NEXTAUTH_URL = '...' }`.

2. **Pipeline job:**
   - New Item → **Pipeline** (e.g. name: `script-minder-deployment`).
   - **Pipeline:** “Pipeline script from SCM” → Git → repo URL, branch `*/main`, Script path: **`Jenkinsfile`**.
   - **Build Triggers:** ☑ “GitHub hook trigger for GITScm polling” (optional).
   - Save.

3. **Server prep** (once on the VPS). Deploy directory for all projects: **`/projects/<project-name>`** (see docker repo docs):

   ```bash
   sudo mkdir -p /projects/script-minder
   sudo chown -R jenkins:jenkins /projects/script-minder
   # Jenkins user must be able to run Docker
   groups jenkins   # should include docker; if not: sudo usermod -aG docker jenkins
   ```

4. **Webhook (optional):** In GitHub repo → Settings → Webhooks → Add webhook: Payload URL `https://jenkins.prasme.id/github-webhook/`, Content type `application/json`, Just the push event.

5. On **push** (or “Build Now”), the pipeline: checkout → rsync to **`/projects/script-minder`** → create `.env` from credentials → `docker compose build` → `docker compose up -d` → seed → health check on `http://localhost:3200/api/health` → cleanup → **reload Nginx** (`nginx -t && nginx -s reload`).

---

## Step 7: Grafana dashboard and Loki (logs)

Script-minder logs **JSON** to stdout/stderr (`lib/logger`) with `timestamp`, `level`, `service`, `message`, `eventType`, `resource`, `auth`, `data`, `error`, so Loki and Grafana can parse and filter them.

### 7.1 Loki + Promtail (docker repo)

From your `docker` repo on the VPS:

```bash
cd /docker/monitoring/loki
docker compose up -d
```

Promtail is already configured (in `promtail-config.yml`) to scrape containers named `script-minder` and `script-minder-worker`, parse JSON, and push to Loki.

### 7.2 Grafana

```bash
cd /docker/monitoring/grafana
cp .env.example .env   # if exists
# Set GF_ADMIN_USER, GF_ADMIN_PASSWORD, GF_SERVER_ROOT_URL
docker compose up -d
```

Ensure Grafana has a **Loki** datasource (e.g. `http://loki:3100`). The `docker` repo’s Grafana provisioning may already add it.

### 7.3 Script Minder dashboard

The dashboard is in the `docker` repo:

- **Path:** `monitoring/grafana/dashboards/script-minder-dashboard.json`
- **Provisioning:** Grafana is configured to load dashboards from `dashboards/` (see `provisioning/dashboards/dashboards.yml`).

If you added that file and restarted Grafana, open **Dashboards** and choose **“Script Minder – Logs”**. You can filter by:

- **Container:** `script-minder` (app) or `script-minder-worker`
- **Level:** info, warn, error, debug
- **eventType:** e.g. auth.login, crud.create, db.error
- **resource:** e.g. project, script

Panels:

- Main **Logs** panel (JSON lines).
- **Log volume by level** and **by eventType**.
- **Errors only** (level=error).

---

## Step 8: Verify worker:analyze

The **worker:analyze** process runs in the **script-minder-worker** container. It consumes jobs from the BullMQ queue (Redis) and updates scripts (MongoDB).

- Check it is running: `docker logs script-minder-worker -f`
- Trigger an analysis from the app; you should see logs in the worker and in Grafana (job=script-minder, container=script-minder-worker).

---

## Quick reference

| Item            | Command / URL |
|-----------------|----------------|
| App health      | `curl http://localhost:3200/api/health` |
| App container   | `script-minder` (port 3200 → 3000) |
| Worker container| `script-minder-worker` |
| Mongo           | `mongodb:27017` (from `/docker/db/mongo`) |
| Redis           | `redis:6379` (from `/docker/redis`) |
| Loki            | `http://loki:3100` (for Grafana) |
| Grafana         | Configured port (e.g. 3000 on host); open “Script Minder – Logs” dashboard |

---

## Files added in this setup

**In script-minder repo:**

- `Dockerfile` – Next.js standalone app image
- `Dockerfile.worker` – Image for `worker:analyze` (tsx)
- `docker-compose.yml` – app and worker only (Mongo/Redis started from `/docker` separately)
- `Jenkinsfile` – Build, deploy, health check, optional Nginx reload
- `.dockerignore`
- `app/api/health/route.ts` – Health check for Docker/Jenkins
- `next.config.ts` – `output: 'standalone'`
- `DEPLOYMENT.md` – This guide

**In docker repo (monitoring):**

- `monitoring/loki/promtail-config.yml` – Scrape config for `script-minder` and `script-minder-worker` with JSON pipeline
- `monitoring/grafana/dashboards/script-minder-dashboard.json` – Grafana dashboard for Script Minder logs
