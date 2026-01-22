# 🔧 Railway 404 Error Fix

## Problem
Getting `404 (Not Found)` when accessing `/api/auth/login` on Railway.

## Solution Applied
Updated `src/backend/server.js` to:
1. ✅ Ensure API routes are registered before static file serving
2. ✅ Add explicit checks to prevent static middleware from interfering with API routes
3. ✅ Add logging to verify routes are registered

## Steps to Fix

### 1. Commit and Push Changes
```bash
git add .
git commit -m "Fix API route handling in production"
git push origin main
```

### 2. Redeploy on Railway
- Railway should auto-deploy on push
- Or manually trigger redeploy in Railway dashboard

### 3. Verify Routes Are Working
Test these endpoints after deployment:

**Health Check:**
```bash
curl https://analytics-dashboard-production-834d.up.railway.app/api/health
```

**Login Endpoint (should return validation error, not 404):**
```bash
curl -X POST https://analytics-dashboard-production-834d.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

If you get a validation error (400), the route is working! ✅
If you get 404, there's still an issue.

## Debugging Steps

### Check Railway Logs
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on latest deployment
5. Check logs for:
   - `✅ API Routes registered:`
   - `🚀 Server running on port 8080`
   - Any error messages

### Verify Environment Variables
Make sure these are set in Railway:
- `NODE_ENV=production`
- `PORT=8080` (Railway sets this automatically)
- `JWT_SECRET=your-secret`
- `DATABASE_URL=your-database-url`

### Test Locally First
Before deploying, test the production build locally:

```bash
# Build frontend
cd src/frontend
npm run build

# Copy to backend
cd ../..
cp -r src/frontend/build src/backend/public

# Test production mode
cd src/backend
NODE_ENV=production npm start

# Test in another terminal
curl http://localhost:8080/api/health
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

## Common Issues

### Issue 1: Routes Not Registered
**Symptom:** All API calls return 404
**Fix:** Check Railway logs to see if routes are being registered

### Issue 2: Static Files Interfering
**Symptom:** Some API routes work, others don't
**Fix:** Already fixed in the code update

### Issue 3: CORS Issues
**Symptom:** 404 in browser, but curl works
**Fix:** Check CORS configuration (currently allows all origins)

### Issue 4: Railway Routing
**Symptom:** Routes work locally but not on Railway
**Fix:** Make sure Railway is using the correct port (8080)

## Still Having Issues?

1. Check Railway deployment logs
2. Verify the `public` folder exists in the deployed container
3. Test the health endpoint first: `/api/health`
4. Check if other API endpoints work (e.g., `/api/sites`)
