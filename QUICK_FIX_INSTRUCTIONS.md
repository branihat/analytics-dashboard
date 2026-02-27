# Quick Fix Instructions - Report Generator Service

## 🚨 Current Issues
1. Backend can't connect to Python service (ECONNREFUSED ::1:5000)
2. TabError in app.py causing worker crashes
3. PDF files too large (30MB > 10MB Cloudinary limit)

## ✅ Solutions Applied

### Local Files Updated:
- ✅ `src/backend/.env` - Added `PYTHON_REPORT_SERVICE_URL=http://127.0.0.1:5000`
- ✅ `src/backend/routes/reportGenerator.js` - Added `chunk_size: 6000000` for Cloudinary
- ✅ `report_generator-main/app.py` - Improved PDF compression

### VPS Deployment Script Created:
- ✅ `fix-report-service.sh` - Automated fix script

## 🚀 Deploy to VPS

### Option 1: Automated (Recommended)

```bash
# 1. Upload fix-report-service.sh to VPS
scp fix-report-service.sh root@your-vps:/var/www/analytics-dashboard/

# 2. SSH to VPS
ssh root@your-vps

# 3. Run the script
cd /var/www/analytics-dashboard
chmod +x fix-report-service.sh
./fix-report-service.sh

# 4. Verify
curl http://127.0.0.1:5000/
# Should return: "Drone Report API Running 🚀"
```

### Option 2: Manual

```bash
# SSH to VPS
ssh root@your-vps

# Fix 1: Update backend .env
cd /var/www/analytics-dashboard/src/backend
echo "PYTHON_REPORT_SERVICE_URL=http://127.0.0.1:5000" >> .env

# Fix 2: Restore clean app.py
cd /var/www/analytics-dashboard/python-report-service
cp ../report_generator-main/app.py ./app.py

# Fix 3: Update reportGenerator.js
cd /var/www/analytics-dashboard/src/backend/routes
# (Upload the updated reportGenerator.js from local)

# Fix 4: Restart services
systemctl restart report-generator
pm2 restart backend

# Verify
systemctl status report-generator
curl http://127.0.0.1:5000/
```

## 🧪 Testing

### 1. Test Python Service
```bash
curl http://127.0.0.1:5000/
```
Expected: `Drone Report API Running 🚀`

### 2. Test from Frontend
1. Login as admin
2. Go to "Report Generator"
3. Upload a SMALL JSON file (test first!)
4. Enter site name, date, video link
5. Click "Generate Report"
6. Check Inferred Reports section

### 3. Monitor Logs
```bash
# Python service
journalctl -u report-generator -f

# Backend
pm2 logs backend

# Check for errors
journalctl -u report-generator -n 50 --no-pager
```

## 📊 What Changed

### Backend Connection
- **Before**: `http://localhost:5000` → IPv6 `::1:5000` ❌
- **After**: `http://127.0.0.1:5000` → IPv4 ✅

### PDF Compression
- **Before**: Basic compression → 30MB files ❌
- **After**: Aggressive compression with:
  - `stream_decode_level=generalized`
  - `recompress_flate=True`
  - `normalize_content=True`
  - File size monitoring

### Cloudinary Upload
- **Before**: No chunk size → Large file upload fails ❌
- **After**: `chunk_size: 6000000` (6MB chunks) ✅

## ⚠️ Important Notes

1. **Test with small files first** - Start with minimal JSON data
2. **Monitor file sizes** - Check if compression reduces below 10MB
3. **Memory usage** - VPS has limited RAM, watch for OOM kills
4. **Service logs** - Always check logs if generation fails

## 🔍 Troubleshooting

### Service won't start
```bash
journalctl -u report-generator -n 50 --no-pager
```

### Still getting ECONNREFUSED
```bash
# Check what's listening on port 5000
netstat -tlnp | grep 5000

# Verify backend .env
cat /var/www/analytics-dashboard/src/backend/.env | grep PYTHON
```

### PDF still too large
- Reduce image quality in report.py
- Use smaller test datasets
- Consider alternative storage (S3, VPS direct)

## 📁 Files to Upload to VPS

1. `fix-report-service.sh` → `/var/www/analytics-dashboard/`
2. `src/backend/routes/reportGenerator.js` → `/var/www/analytics-dashboard/src/backend/routes/`
3. `report_generator-main/app.py` → `/var/www/analytics-dashboard/report_generator-main/`

## ✨ Next Steps After Deployment

1. Run the fix script on VPS
2. Verify service is running
3. Test with small JSON file
4. Check generated PDF size
5. If still > 10MB, optimize report.py images
6. Monitor memory usage during generation

---

**Need help?** Check `REPORT_SERVICE_FIX_GUIDE.md` for detailed troubleshooting.
