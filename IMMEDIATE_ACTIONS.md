# Immediate Actions to Fix 500 Error

## 🚨 Current Issue
Getting 500 Internal Server Error when trying to generate report from frontend.

## 🔍 Diagnosis Steps (Run on VPS)

### Step 1: Upload and run diagnostic script
```bash
# Upload diagnose-500-error.sh to VPS
scp diagnose-500-error.sh root@your-vps:/var/www/analytics-dashboard/

# SSH to VPS
ssh root@your-vps

# Run diagnostic
cd /var/www/analytics-dashboard
chmod +x diagnose-500-error.sh
./diagnose-500-error.sh
```

This will tell us exactly what's failing.

### Step 2: Check backend logs
```bash
pm2 logs backend --lines 50
```

Look for the exact error message when you try to generate a report.

### Step 3: Check Python service logs
```bash
journalctl -u report-generator -n 50 --no-pager
```

## 🎯 Most Likely Causes

### Cause 1: No JSON files uploaded yet
**Symptom**: Error says "No JSON files found"

**Solution**: You must upload JSON files BEFORE generating report
1. Go to Report Generator page
2. Click "Upload JSON" first
3. Upload your violation JSON files
4. THEN click "Generate Report"

### Cause 2: Python service not running
**Symptom**: ECONNREFUSED or service unavailable

**Solution**:
```bash
systemctl status report-generator
systemctl restart report-generator
curl http://127.0.0.1:5000/
```

### Cause 3: Backend .env not updated
**Symptom**: Connection refused to ::1:5000

**Solution**:
```bash
cd /var/www/analytics-dashboard/src/backend
grep PYTHON_REPORT_SERVICE_URL .env

# If not set or shows localhost, fix it:
echo "PYTHON_REPORT_SERVICE_URL=http://127.0.0.1:5000" >> .env
pm2 restart backend
```

### Cause 4: Python service error
**Symptom**: Service starts but crashes during generation

**Solution**:
```bash
# Check for syntax errors
cd /var/www/analytics-dashboard/python-report-service
python3 -m py_compile app.py

# If errors, restore clean version:
cp ../report_generator-main/app.py ./app.py
systemctl restart report-generator
```

### Cause 5: Missing directories
**Symptom**: Error about temp_reports or reports directory

**Solution**:
```bash
cd /var/www/analytics-dashboard/python-report-service
mkdir -p temp_reports reports image_cache
chmod 755 temp_reports reports image_cache
systemctl restart report-generator
```

## 🧪 Quick Test

### Test Python service directly:
```bash
# 1. Upload a test JSON
curl -X POST http://127.0.0.1:5000/upload-json \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Test",
    "date": "2024-02-27",
    "drone_id": "TEST",
    "video_link": "https://test.com",
    "violations": [{"type":"test","description":"test"}]
  }'

# 2. Check if file was created
ls -lh /var/www/analytics-dashboard/python-report-service/temp_reports/

# 3. Try to generate report
curl -X POST http://127.0.0.1:5000/generate-report \
  -H "Content-Type: application/json" \
  -d '{"video_link":"https://test.com"}' \
  --output /tmp/test.pdf

# 4. Check if PDF was created
ls -lh /tmp/test.pdf
file /tmp/test.pdf
```

## 📋 Checklist

Run through this checklist:

- [ ] Python service is running: `systemctl status report-generator`
- [ ] Python service responds: `curl http://127.0.0.1:5000/`
- [ ] Backend .env has correct URL: `grep PYTHON /var/www/analytics-dashboard/src/backend/.env`
- [ ] Directories exist: `ls -ld /var/www/analytics-dashboard/python-report-service/{temp_reports,reports}`
- [ ] No Python syntax errors: `python3 -m py_compile /var/www/analytics-dashboard/python-report-service/app.py`
- [ ] JSON files uploaded: `ls /var/www/analytics-dashboard/python-report-service/temp_reports/`
- [ ] Backend is running: `pm2 list`
- [ ] Cloudinary credentials set: `grep CLOUDINARY /var/www/analytics-dashboard/src/backend/.env`

## 🔧 Quick Fix Commands

If you just want to try fixing everything at once:

```bash
# SSH to VPS
ssh root@your-vps

# Go to project directory
cd /var/www/analytics-dashboard

# Fix backend .env
cd src/backend
sed -i '/PYTHON_REPORT_SERVICE_URL/d' .env
echo "PYTHON_REPORT_SERVICE_URL=http://127.0.0.1:5000" >> .env

# Restore clean app.py
cd /var/www/analytics-dashboard/python-report-service
cp ../report_generator-main/app.py ./app.py

# Create directories
mkdir -p temp_reports reports image_cache
chmod 755 temp_reports reports image_cache

# Restart services
systemctl restart report-generator
cd /var/www/analytics-dashboard/src/backend
pm2 restart backend

# Wait a moment
sleep 5

# Test
curl http://127.0.0.1:5000/
pm2 logs backend --lines 10
```

## 📞 Next Steps

1. Run the diagnostic script first
2. Share the output with me
3. Based on the output, we'll know exactly what's wrong
4. Apply the specific fix needed

## 💡 Important Notes

- **You MUST upload JSON files before generating a report**
- The workflow is: Upload JSON → Generate Report
- Not: Generate Report directly
- The Python service needs at least one JSON file in temp_reports to generate a report

## 🎯 Expected Workflow

1. User uploads JSON file(s) via "Upload JSON" button
2. JSON files are stored in `temp_reports/` directory
3. User enters site name, date, video link
4. User clicks "Generate Report"
5. Python service reads all JSON files from `temp_reports/`
6. Combines them and generates PDF
7. Backend uploads PDF to Cloudinary
8. Backend saves to Inferred Reports database
9. User sees report in Inferred Reports section

If step 2 doesn't happen (no JSON files), step 5 will fail with "No JSON files found" error.
