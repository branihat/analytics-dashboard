# Hostinger Deployment Guide (VPS)

This project includes a Node/Express backend and a React frontend. For production, the **recommended Hostinger setup is a VPS**, because the backend must run as a long-lived process (or container).

- **Shared hosting**: typically **cannot** run Node/Express servers (unless your specific plan provides Node support).
- **VPS**: ✅ recommended (Ubuntu 22.04/24.04 works well).

## Recommended architecture

**Single deployment (monolith)**: Backend serves the built React app.

- Browser hits: `https://your-domain.com`
- API hits: `https://your-domain.com/api/...`

Your backend already serves the frontend in production from `src/backend/public/` (when `NODE_ENV=production`).

---

## Option A (Recommended): VPS + Docker (simplest)

### 1) Server prerequisites

On the Hostinger VPS (Ubuntu):

```bash
sudo apt update -y
sudo apt install -y ca-certificates curl gnupg

# Install Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update -y
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

### 2) Upload or clone the repo

```bash
cd ~
git clone <YOUR_REPO_URL> analytics-dashboard
cd analytics-dashboard
```

### 3) Create your production `.env`

Create a `.env` file at the repo root (or anywhere you prefer). Example:

```bash
nano .env
```

Minimum recommended variables:

```env
NODE_ENV=production
PORT=8080

# JWT
JWT_SECRET=change-me-super-secret

# Postgres (recommended for production for users/ATR)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Cloudinary (if you use uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Optional: lock CORS down (comma-separated)
# CORS_ORIGIN=https://your-domain.com
```

### 4) Build the image and run the container

Your **root `Dockerfile`** builds the frontend and runs the backend serving it.

```bash
docker build -t analytics-dashboard:latest .
```

Run it (with persistence for uploads + SQLite data):

```bash
mkdir -p ~/analytics-dashboard-data/uploads ~/analytics-dashboard-data/data

docker run -d --restart unless-stopped \
  --name analytics-dashboard \
  -p 8080:8080 \
  --env-file .env \
  -v ~/analytics-dashboard-data/uploads:/app/uploads \
  -v ~/analytics-dashboard-data/data:/app/data \
  analytics-dashboard:latest
```

Check logs:

```bash
docker logs -f analytics-dashboard
```

Test health:

```bash
curl -i http://localhost:8080/api/health
```

### 5) Add Nginx reverse proxy + SSL (recommended)

Install Nginx:

```bash
sudo apt install -y nginx
```

Create Nginx site:

```bash
sudo nano /etc/nginx/sites-available/analytics-dashboard
```

Paste (replace `your-domain.com`):

```nginx
server {
  listen 80;
  server_name your-domain.com www.your-domain.com;

  client_max_body_size 50m;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable site:

```bash
sudo ln -sf /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/analytics-dashboard
sudo nginx -t
sudo systemctl restart nginx
```

Enable HTTPS with Let’s Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## Option B: VPS + Node + PM2 + Nginx (no Docker)

### 1) Install Node 18+ and build tools

```bash
sudo apt update -y
sudo apt install -y curl git build-essential python3
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 2) Clone repo and build frontend

```bash
cd ~
git clone <YOUR_REPO_URL> analytics-dashboard
cd analytics-dashboard

cd src/frontend
npm install
npm run build
```

### 3) Copy frontend build into backend `public/`

```bash
cd ~/analytics-dashboard
rm -rf src/backend/public
mkdir -p src/backend/public
cp -r src/frontend/build/* src/backend/public/
```

### 4) Backend install + `.env`

```bash
cd ~/analytics-dashboard/src/backend
npm install

# Create .env inside backend folder (recommended, since server loads dotenv)
nano .env
```

Use the same env keys as in Option A (at least `NODE_ENV=production`, `PORT=8080`, `JWT_SECRET`, `DATABASE_URL`, Cloudinary keys).

### 5) Run with PM2

```bash
sudo npm i -g pm2
cd ~/analytics-dashboard/src/backend
pm2 start server.js --name analytics-dashboard
pm2 save
pm2 startup
```

Follow the `pm2 startup` output command (it prints a `sudo ...` command you must run).

### 6) Nginx reverse proxy + SSL

Same Nginx + Certbot steps as Option A (proxy to `127.0.0.1:8080`).

---

## DNS settings on Hostinger

Point your domain to your VPS IP:

- **A record**: `@` → `<VPS_PUBLIC_IP>`
- **A record**: `www` → `<VPS_PUBLIC_IP>`

Wait for DNS propagation (usually minutes, sometimes up to a few hours).

---

## Verify deployment

From your laptop:

- Frontend: `https://your-domain.com`
- Health check: `https://your-domain.com/api/health`

If login fails with 404, confirm the backend is reachable and that your app is not pointing to an old API URL.

---

## Persistence (important)

Your backend uses:

- **SQLite** for some data (stored under `src/backend/data/` in dev; in Docker we mount `/app/data`)  
- **Uploads** under `/app/uploads`

If you use Docker, **keep the `-v` volumes** so redeploys don’t wipe data.

For production, prefer **PostgreSQL** for important data. SQLite is fine for small setups but you must persist the DB file.

---

## Common issues

### 1) Port not reachable

- Ensure your VPS firewall/security group allows **80/443** (Nginx) and/or **8080** if testing directly.

### 2) “502 Bad Gateway” from Nginx

- Backend not running, or listening on a different port
- Check:

```bash
sudo systemctl status nginx
curl -i http://127.0.0.1:8080/api/health
```

### 3) CORS errors (if frontend and backend are on different domains)

- If you deploy as a monolith (recommended here), CORS is usually not an issue.
- If you split domains, set `CORS_ORIGIN` to your frontend domain and ensure backend `cors()` is configured accordingly.

---

## What you should choose

- **Want simplest, robust deploy**: **Option A (Docker)** ✅
- **Prefer classic Node hosting**: **Option B (PM2)** ✅

