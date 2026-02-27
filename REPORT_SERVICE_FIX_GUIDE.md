# Report Generator Service - Fix Guide

## Issues Fixed

### 1. Connection Issue (ECONNREFUSED)
- **Problem**: Backend using `localhost` which resolves to IPv6 `::1` on the server
- **Solution**: Changed to `127.0.0.1` (IPv4) in backend `.env`

### 2. TabError in app.py
- **Problem**: Mixed tabs and spaces causing Python worker crashes
- **Solution**: Restored clean `app.py` from original source

### 3. PDF File Size Too Large
- **Problem**: Generated PDFs are 30MB, exceeding Cloudinary free tier limit (10MB)
- **Solutions Applied**:
  - More aggressive PDF compression with additional pikepdf options
  - Cloudinary upload configured with 6MB chunk_size for large files
  - File size warning added to monitor compression effectiveness

### 4. Memory Constraints
- **Current Status**: VPS has 3.8GB RAM, ~700MB available
- **Mitigations**:
  - Service runs with 1 worker to minimize memory usage
  - 300s timeout for long-running operations
  - 2GB swap space added

## Deployment Steps

### On VPS (as root):

```bash
# 1. Upload the fix script
# (Upload fix-report-service.sh to /var/www/analytics-dashboard/)

# 2. Make it executable
cd /var/www/analytics-dashboard
chmod +x fix-report-service.sh

# 3. Run the fix script
./fix-report-service.sh

# 4. Verify Python service is running
systemctl status report-generator

# 5. Test the connection
curl http://127.0.0.1:5000/

# 6. Check logs
journalctl -u report-generator -f
```

### Manual Steps (if script fails):

```bash
# 1. Fix backend .env
cd /var/www/analytics-dashboard/src/backend
nano .env
# Add or update: PYTHON_REPORT_SERVICE_URL=http://127.0.0.1:5000

# 2. Restore clean app.py
cd /var/www/analytics-dashboard/python-report-service
cp ../report_generator-main/app.py ./app.py

# 3. Restart services
systemctl restart report-generator
pm2 restart backend

# 4. Verify
systemctl status report-generator
curl http://127.0.0.1:5000/
```

## Testing the Service

### 1. Health Check
```bash
curl http://127.0.0.1:5000/
# Expected: "Drone Report API Running 🚀"
```

### 2. From Frontend
1. Login as admin
2. Navigate to "Report Generator" in sidebar
3. Upload a small JSON file first (test with minimal data)
4. Enter site name and report date
5. Add video link
6. Click "Generate Report"

### 3. Monitor Logs
```bash
# Python service logs
journalctl -u report-generator -f

# Backend logs
pm2 logs backend

# Nginx logs
tail -f /var/log/nginx/error.log
```

## File Size Optimization

### Current Compression Settings
```python
pdf.save(
    output_path,
    optimize_streams=True,
    compress_streams=True,
    stream_decode_level=pikepdf.StreamDecodeLevel.generalized,
    object_stream_mode=pikepdf.ObjectStreamMode.generate,
    recompress_flate=True,
    normalize_content=True
)
```

### If PDFs Still Exceed 10MB:

1. **Reduce image quality in report.py**:
   - Lower DPI for embedded images
   - Compress images before embedding
   - Use JPEG instead of PNG where possible

2. **Split large reports**:
   - Generate multiple smaller PDFs for large datasets
   - Implement pagination

3. **Alternative storage**:
   - Use AWS S3 (larger file size limits)
   - Upgrade Cloudinary plan
   - Store on VPS and serve via nginx

## Service Configuration

### systemd Service
Location: `/etc/systemd/system/report-generator.service`

```ini
[Unit]
Description=Python Report Generator Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/analytics-dashboard/python-report-service
Environment="PATH=/var/www/analytics-dashboard/python-report-service/venv/bin"
ExecStart=/var/www/analytics-dashboard/python-report-service/venv/bin/gunicorn \
    --bind 127.0.0.1:5000 \
    --workers 1 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile - \
    app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration
Timeouts set to 300s for report generation:
```nginx
proxy_read_timeout 300s;
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
```

## Troubleshooting

### Service Won't Start
```bash
# Check for syntax errors
cd /var/www/analytics-dashboard/python-report-service
source venv/bin/activate
python -m py_compile app.py

# Check for port conflicts
lsof -i :5000
# Kill if needed: kill -9 <PID>

# Check service logs
journalctl -u report-generator -n 50 --no-pager
```

### Connection Refused
```bash
# Verify service is listening on 127.0.0.1
netstat -tlnp | grep 5000

# Test direct connection
curl -v http://127.0.0.1:5000/

# Check backend .env
cat /var/www/analytics-dashboard/src/backend/.env | grep PYTHON
```

### Worker Killed (Out of Memory)
```bash
# Check memory usage
free -h

# Check swap
swapon --show

# Add more swap if needed
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### PDF Upload Fails
```bash
# Check Cloudinary credentials
cat /var/www/analytics-dashboard/src/backend/.env | grep CLOUDINARY

# Test with smaller file first
# Check file size before upload
ls -lh /var/www/analytics-dashboard/python-report-service/reports/

# Monitor upload in backend logs
pm2 logs backend --lines 100
```

## Performance Optimization

### For Large Reports:
1. Process JSON files in batches
2. Implement progress tracking
3. Use background job queue (Bull/Redis)
4. Cache generated reports

### Memory Management:
1. Clear temp files after generation
2. Limit concurrent report generations
3. Implement request queuing
4. Monitor memory usage: `watch -n 1 free -h`

## Next Steps

1. ✅ Fix connection issue (localhost → 127.0.0.1)
2. ✅ Fix TabError in app.py
3. ✅ Improve PDF compression
4. ✅ Add Cloudinary chunk upload
5. ⏳ Test with small JSON files
6. ⏳ Monitor file sizes after compression
7. ⏳ Optimize report.py if PDFs still too large
8. ⏳ Consider alternative storage if needed

## Support

If issues persist:
1. Check all logs (Python, Node, Nginx)
2. Verify all environment variables
3. Test each component independently
4. Monitor system resources during generation
5. Try with minimal test data first
