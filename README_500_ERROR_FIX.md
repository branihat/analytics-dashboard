# Fix for 500 Error in Report Generator

## 📋 Summary

You're getting a 500 Internal Server Error when trying to generate reports. I've created comprehensive diagnostic and fix scripts to resolve this.

## 🎯 Quick Start

### Option 1: Automated Upload and Fix (Recommended)

1. **Edit the upload script** with your VPS details:
   ```bash
   # Edit upload-fixes-to-vps.sh
   # Change: VPS_HOST="your-vps-ip-or-domain"
   # To: VPS_HOST="72.61.226.59" (or your actual VPS IP)
   ```

2. **Run the upload script**:
   ```bash
   chmod +x upload-fixes-to-vps.sh
   ./upload-fixes-to-vps.sh
   ```

3. **SSH to VPS and run diagnostic**:
   ```bash
   ssh root@your-vps
   cd /var/www/analytics-dashboard
   chmod +x diagnose-500-error.sh
   ./diagnose-500-error.sh
   ```

4. **Apply the fix**:
   ```bash
   chmod +x fix-report-service.sh
   ./fix-report-service.sh
   ```

5. **Test it**:
   ```bash
   chmod +x test-report-generation.sh
   ./test-report-generation.sh
   ```

### Option 2: Manual Steps

See `IMMEDIATE_ACTIONS.md` for detailed manual steps.

## 📁 Files Created

### Diagnostic Scripts
- `diagnose-500-error.sh` - Comprehensive diagnostic tool
- `check-backend-logs.sh` - Check backend and Python logs
- `test-report-generation.sh` - End-to-end test

### Fix Scripts
- `fix-report-service.sh` - Automated fix for all issues
- `optimize-pdf-size.py` - PDF size optimization (if needed)
- `upload-fixes-to-vps.sh` - Upload all files to VPS

### Documentation
- `IMMEDIATE_ACTIONS.md` - Quick troubleshooting guide
- `DEPLOYMENT_STATUS.md` - Complete deployment status
- `REPORT_SERVICE_FIX_GUIDE.md` - Detailed fix guide
- `QUICK_FIX_INSTRUCTIONS.md` - Quick deployment steps

### Updated Code Files
- `src/backend/.env` - Added PYTHON_REPORT_SERVICE_URL
- `src/backend/routes/reportGenerator.js` - Better error handling + chunk_size
- `report_generator-main/app.py` - Improved PDF compression

## 🔍 What Gets Fixed

1. ✅ Backend connection to Python service (localhost → 127.0.0.1)
2. ✅ TabError in app.py (restore clean version)
3. ✅ PDF compression (aggressive settings)
4. ✅ Cloudinary upload (6MB chunks)
5. ✅ Better error logging
6. ✅ Missing directories
7. ✅ Service restart

## 🎯 Most Common Issues

### Issue 1: No JSON Files Uploaded
**Error**: "No JSON files found"

**Solution**: You MUST upload JSON files BEFORE generating report!

**Correct Workflow**:
1. Click "Upload JSON" button
2. Select and upload your violation JSON file(s)
3. Enter site name, date, video link
4. Click "Generate Report"

### Issue 2: Python Service Not Running
**Error**: ECONNREFUSED or 503 Service Unavailable

**Solution**:
```bash
systemctl restart report-generator
curl http://127.0.0.1:5000/
```

### Issue 3: Backend Can't Connect
**Error**: ECONNREFUSED ::1:5000

**Solution**: Backend .env needs to use 127.0.0.1 (fixed by script)

## 🧪 Testing

After applying fixes, test in this order:

1. **Python service health**:
   ```bash
   curl http://127.0.0.1:5000/
   ```
   Expected: `Drone Report API Running 🚀`

2. **Upload test JSON**:
   ```bash
   curl -X POST http://127.0.0.1:5000/upload-json \
     -H "Content-Type: application/json" \
     -d '{"location":"Test","date":"2024-02-27","drone_id":"TEST","video_link":"https://test.com","violations":[]}'
   ```
   Expected: `{"message": "JSON stored in backend"}`

3. **Check temp files**:
   ```bash
   ls -lh /var/www/analytics-dashboard/python-report-service/temp_reports/
   ```
   Expected: At least one .json file

4. **Generate test report**:
   ```bash
   curl -X POST http://127.0.0.1:5000/generate-report \
     -H "Content-Type: application/json" \
     -d '{"video_link":"https://test.com"}' \
     --output /tmp/test.pdf
   ```
   Expected: PDF file created

5. **Test from frontend**:
   - Login as admin
   - Go to Report Generator
   - Upload a small JSON file
   - Fill in site name, date, video link
   - Click Generate Report
   - Check Inferred Reports section

## 📊 Monitoring

### Check Service Status
```bash
systemctl status report-generator
pm2 list
```

### Watch Logs
```bash
# Python service
journalctl -u report-generator -f

# Backend
pm2 logs backend

# Both
pm2 logs backend & journalctl -u report-generator -f
```

### Check Memory
```bash
free -h
watch -n 1 free -h
```

## 🆘 If Still Not Working

1. **Run the diagnostic**:
   ```bash
   ./diagnose-500-error.sh
   ```

2. **Share the output** - It will tell us exactly what's wrong

3. **Check specific logs**:
   ```bash
   # When you click "Generate Report", immediately check:
   pm2 logs backend --lines 20
   journalctl -u report-generator -n 20 --no-pager
   ```

4. **Look for these specific errors**:
   - "No JSON files found" → Upload JSON first
   - "ECONNREFUSED" → Service not running or wrong URL
   - "TabError" → app.py has syntax error
   - "Out of memory" → Need more swap space
   - "Cloudinary upload failed" → Check credentials or file size

## 💡 Important Notes

### Workflow
1. Upload JSON files (one or more)
2. Enter site name (required)
3. Select report date (required)
4. Enter video link (required)
5. Generate report
6. Wait 1-3 minutes
7. Check Inferred Reports

### Limitations
- VPS has limited RAM (3.8GB)
- Large reports may fail (OOM)
- PDF must be < 10MB for Cloudinary free tier
- Only 1 concurrent generation supported
- Generation takes 1-3 minutes

### Tips
- Start with small JSON files (< 10 violations)
- Test with minimal data first
- Monitor memory during generation
- Clear temp_reports after successful generation

## 📞 Support

If you need help:

1. Run `./diagnose-500-error.sh` and share output
2. Share backend logs: `pm2 logs backend --lines 50`
3. Share Python logs: `journalctl -u report-generator -n 50 --no-pager`
4. Describe exact steps you took
5. Share any error messages from browser console

## ✅ Success Criteria

Everything is working when:
- ✅ `curl http://127.0.0.1:5000/` returns success message
- ✅ JSON upload creates files in temp_reports/
- ✅ Report generation creates PDF in reports/
- ✅ PDF is < 10MB after compression
- ✅ Upload to Cloudinary succeeds
- ✅ Report appears in Inferred Reports section
- ✅ No errors in backend or Python logs

---

**Ready to fix?** Start with `./upload-fixes-to-vps.sh` or see `IMMEDIATE_ACTIONS.md`
