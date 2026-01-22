# 🚀 Deployment Guide

Your application can be deployed in **two ways**:

## Option 1: Monolithic Deployment (Recommended for Small/Medium Apps) ✅

**Deploy backend and frontend together as a single service.**

### How it works:
- Backend serves the built React frontend as static files
- Single deployment, single URL
- Simpler to manage and deploy
- **Current setup is already configured for this!**

### Platforms that support this:
- ✅ **Railway** (already configured)
- ✅ **Heroku**
- ✅ **Render**
- ✅ **DigitalOcean App Platform**
- ✅ **AWS Elastic Beanstalk**
- ✅ **Any VPS with Docker**

### Deployment Steps:

#### For Railway (Already Configured):
1. Push your code to GitHub
2. Connect Railway to your GitHub repo
3. Railway will automatically:
   - Build frontend (React app)
   - Build backend (Node.js)
   - Serve both from one service
   - Frontend accessible at: `https://your-app.railway.app`
   - API accessible at: `https://your-app.railway.app/api`

#### For Other Platforms:

**1. Build the frontend:**
```bash
cd src/frontend
npm install
npm run build
```

**2. Copy build to backend:**
```bash
# From project root
cp -r src/frontend/build src/backend/public
```

**3. Deploy backend:**
```bash
cd src/backend
# Deploy using your platform's method
```

**4. Set environment variables:**
```
NODE_ENV=production
PORT=8080
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Option 2: Separate Deployment (Recommended for Large Apps) 🔄

**Deploy backend and frontend as separate services.**

### How it works:
- Frontend: Static files served by CDN/nginx
- Backend: API server on separate domain/subdomain
- More scalable and flexible
- Better for microservices architecture

### Deployment Steps:

#### Frontend Deployment:

**Option A: Vercel/Netlify (Recommended for React apps)**
1. Connect your GitHub repo
2. Set build directory: `src/frontend`
3. Set build command: `npm run build`
4. Set output directory: `build`
5. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-api.com
   ```

**Option B: Static Hosting (AWS S3, Cloudflare Pages, etc.)**
1. Build frontend:
   ```bash
   cd src/frontend
   npm install
   npm run build
   ```
2. Upload `build/` folder contents to your static host
3. Configure environment variable for API URL

#### Backend Deployment:

**Deploy to:**
- Railway
- Heroku
- Render
- DigitalOcean
- AWS EC2/Elastic Beanstalk
- Any Node.js hosting

**Steps:**
1. Navigate to backend:
   ```bash
   cd src/backend
   ```

2. Set environment variables:
   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=your_database_url
   JWT_SECRET=your_jwt_secret
   CORS_ORIGIN=https://your-frontend-domain.com
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. Deploy using your platform's method

**Important:** Update CORS settings in backend to allow your frontend domain!

---

## 🔧 Configuration Changes Needed

### For Monolithic Deployment (Current Setup):
✅ **No changes needed!** Your app is already configured.

### For Separate Deployment:

**1. Update Backend CORS (if needed):**
```javascript
// src/backend/server.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

**2. Update Frontend API URL:**
Create `.env.production` in `src/frontend/`:
```
REACT_APP_API_URL=https://your-backend-api.com
```

**3. Remove frontend serving from backend:**
The backend already handles this correctly - it only serves frontend in production mode when `public/` folder exists.

---

## 📋 Platform-Specific Guides

### Railway (Recommended - Already Configured)
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`
5. Set environment variables in Railway dashboard

### Heroku
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set buildpack: `heroku buildpacks:set heroku/nodejs`
5. Set env vars: `heroku config:set NODE_ENV=production`
6. Deploy: `git push heroku main`

### Render
1. Connect GitHub repo
2. Select "Web Service"
3. Build command: `cd src/backend && npm install`
4. Start command: `cd src/backend && npm start`
5. Set environment variables

### Vercel (Frontend Only)
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to frontend: `cd src/frontend`
3. Deploy: `vercel`
4. Set `REACT_APP_API_URL` in Vercel dashboard

---

## 🎯 Recommendation

**For your current setup, I recommend:**

✅ **Monolithic Deployment** (Option 1)
- Your Dockerfile is already configured
- Railway setup is ready
- Simpler to manage
- Single deployment
- Perfect for small to medium applications

**Use Separate Deployment if:**
- You need to scale frontend and backend independently
- You want to use a CDN for frontend
- You have a large team with separate frontend/backend teams
- You need different hosting for frontend (e.g., Vercel) and backend (e.g., Railway)

---

## 🔐 Environment Variables Checklist

Make sure to set these in your hosting platform:

**Required:**
- `NODE_ENV=production`
- `PORT=8080` (or your platform's assigned port)
- `JWT_SECRET=your-secret-key-here`
- `DATABASE_URL=your-database-connection-string`

**Cloudinary (for file uploads):**
- `CLOUDINARY_CLOUD_NAME=your-cloud-name`
- `CLOUDINARY_API_KEY=your-api-key`
- `CLOUDINARY_API_SECRET=your-api-secret`

**Optional (for separate deployment):**
- `CORS_ORIGIN=https://your-frontend-domain.com`
- `REACT_APP_API_URL=https://your-backend-api.com` (frontend only)

---

## 🚀 Quick Deploy Commands

### Monolithic (Railway):
```bash
railway login
railway init
railway up
```

### Separate (Frontend to Vercel):
```bash
cd src/frontend
vercel --prod
```

### Separate (Backend to Railway):
```bash
cd src/backend
railway login
railway init
railway up
```

---

## 📝 Notes

- Your current setup uses **port 8080** for backend
- Frontend is built and served from `src/backend/public/` in production
- Database (SQLite) is stored in `src/backend/data/violations.db`
- For production, consider using PostgreSQL (already configured in your env file)
