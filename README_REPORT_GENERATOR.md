# 🚁 AI Report Generator - Complete Integration

## 📋 Overview

This integration adds a powerful AI-powered report generation feature to your application. Admins can upload multiple JSON files containing drone surveillance violation data and generate comprehensive PDF reports with analytics, charts, and evidence images.

## ✨ Features

### User Features
- 📤 **Multi-file Upload**: Upload multiple JSON files at once
- 🎯 **Drag & Drop**: Easy file upload interface
- 🔗 **Video Links**: Add Google Drive or direct video URLs
- 📊 **Analytics**: Automatic charts and statistics
- 📄 **PDF Generation**: Professional, compressed PDF reports
- 🗑️ **Auto Cleanup**: Temporary files cleaned automatically

### Report Contents
- Executive summary with key metrics
- Violation frequency charts
- Category-wise breakdown tables
- Evidence images with GPS coordinates
- Timestamps and alert IDs
- Conclusions and recommendations
- Video evidence links

## 🏗️ Architecture

```
User (Admin) → React Frontend → Node.js Backend → Python Flask Service → PDF Report
```

- **Frontend**: React component for file upload and UI
- **Backend**: Node.js proxy to Python service
- **Python Service**: Flask app for PDF generation
- **Deployment**: Runs on your VPS alongside main app

## 📦 What's Included

### New Files Created

#### Frontend
- `src/frontend/src/pages/ReportGenerator.js` - Main UI component
- `src/frontend/src/styles/ReportGenerator.css` - Styling

#### Backend
- `src/backend/routes/reportGenerator.js` - API routes

#### Deployment
- `deploy-python-service.sh` - Automated deployment script
- `VPS_DEPLOYMENT_GUIDE.md` - Detailed deployment guide
- `QUICK_START_VPS.md` - Quick start guide
- `DEPLOYMENT_SUMMARY.md` - Complete summary
- `sample-violation-data.json` - Test data example

#### Configuration
- Updated `src/backend/server.js` - Route registration
- Updated `src/frontend/src/App.js` - Route and import
- Updated `src/frontend/src/components/Sidebar.js` - Navigation
- Updated `src/backend/package.json` - Dependencies
- Updated `.env.example` - Environment variables

## 🚀 Quick Deployment (VPS)

### Prerequisites
- VPS with Ubuntu/Debian
- Your main app already running
- SSH access
- `report_generator-main` folder

### Step 1: Upload Files
```bash
# From your local machine
scp -r report_generator-main/ user@your-vps:/path/to/your/app/
scp deploy-python-service.sh user@your-vps:/path/to/your/app/
```

### Step 2: Run Deployment
```bash
# SSH into VPS
ssh user@your-vps
cd /path/to/your/app

# Make executable and run
chmod +x deploy-python-service.sh
./deploy-python-service.sh
```

### Step 3: Configure Nginx
Add to your Nginx config (`/etc/nginx/sites-available/your-site`):

```nginx
location /python-api/ {
    proxy_pass http://localhost:5000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 180s;
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
}
```

Then:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Restart Your App
```bash
pm2 restart all  # or your restart command
```

### Step 5: Test
1. Login as admin
2. Click "Report Generator" in sidebar
3. Upload `sample-violation-data.json`
4. Add a video link
5. Click "Generate Report"
6. PDF downloads automatically

## 📝 JSON Format

Your JSON files should follow this structure:

```json
{
  "location": "Site Name",
  "date": "2026-02-25",
  "drone_id": "DRONE_ID",
  "violations": [
    {
      "id": "violation_001",
      "type": "stagnant_water",
      "image_url": "https://...",
      "latitude": "23.1234",
      "longitude": "85.5678",
      "timestamp": "2026-02-25 10:30:00"
    }
  ]
}
```

### Supported Violation Types
- stagnant_water
- water_logging_at_toe_OB_dump
- vehicle_red_flag_absent
- vehicle_red_flag_present
- overhanging_loose_boulders
- cracks
- unsafe_movement_person_on_haul_road
- unsafe_movement_lmv_near_shovel_dumper_dozer_drill
- rest_shelter
- lighting_arrangement
- blocked_drain
- water_sprinkling_arrangement
- fire
- smoke
- person_near_edge_unsafe_area
- unsafe_movement_person_near_dumper_dozer_shovel_drill
- scrap_management_required
- exit_boom_barrier_open
- lmv_tipper_plying_on_same_road
- vehicle_crowding
- person_unsafe
- overcrowding_person
- illegal_mining_pit
- broken_fence

## 🔧 Configuration

### Environment Variables

Add to `src/backend/.env`:
```env
PYTHON_REPORT_SERVICE_URL=http://localhost:5000
```

### Service Management

```bash
# Start service
sudo systemctl start report-generator

# Stop service
sudo systemctl stop report-generator

# Restart service
sudo systemctl restart report-generator

# View status
sudo systemctl status report-generator

# View logs
sudo journalctl -u report-generator -f
```

## 🧪 Testing

### Test Python Service
```bash
curl http://localhost:5000/
# Should return: "Drone Report API Running 🚀"
```

### Test with Sample Data
1. Use the provided `sample-violation-data.json`
2. Upload through the web interface
3. Add any video link (e.g., `https://drive.google.com/...`)
4. Generate report
5. Verify PDF downloads

## 📊 Performance

- **Workers**: 2 (configurable)
- **Timeout**: 180 seconds
- **Memory**: ~200-500MB per report
- **Concurrent**: Handled by gunicorn
- **Report Size**: Typically 2-10MB (compressed)

## 🔒 Security

- ✅ Admin-only access
- ✅ JWT authentication required
- ✅ Python service on localhost only
- ✅ Not exposed externally
- ✅ Nginx reverse proxy
- ✅ Automatic file cleanup

## 🐛 Troubleshooting

### Service Not Starting
```bash
sudo journalctl -u report-generator -n 50
```

### Connection Issues
```bash
# Check service
curl http://localhost:5000/

# Check environment
cat src/backend/.env | grep PYTHON

# Check port
sudo lsof -i :5000
```

### Nginx Issues
```bash
sudo tail -f /var/log/nginx/error.log
sudo nginx -t
```

### Memory Issues
Edit service to use 1 worker:
```bash
sudo nano /etc/systemd/system/report-generator.service
# Change --workers 2 to --workers 1
sudo systemctl daemon-reload
sudo systemctl restart report-generator
```

## 📚 Documentation

- **QUICK_START_VPS.md** - Fast deployment (5 minutes)
- **VPS_DEPLOYMENT_GUIDE.md** - Detailed guide with troubleshooting
- **DEPLOYMENT_SUMMARY.md** - Complete technical summary
- **sample-violation-data.json** - Test data example

## 🎯 Usage Flow

1. **Admin logs in** → Authenticated
2. **Navigates to Report Generator** → Admin-only page
3. **Uploads JSON files** → Multiple files supported
4. **Adds video link** → Google Drive or direct URL
5. **Clicks Generate** → Processing starts
6. **Backend forwards to Python** → Proxy request
7. **Python generates PDF** → With charts and images
8. **PDF downloads** → Automatic download
9. **Cleanup** → Temp files removed

## 💡 Tips

- Test with small JSONs first
- Use public Google Drive links for images
- Monitor logs during first few reports
- Keep image URLs accessible
- Consider 1 worker for limited RAM VPS

## 🆘 Support

### Check Service Health
```bash
# Service status
sudo systemctl status report-generator

# Test endpoint
curl http://localhost:5000/

# View logs
sudo journalctl -u report-generator -f
```

### Common Issues

1. **Port 5000 in use**
   - Change port in service file
   - Update .env file

2. **Permission denied**
   - Check file ownership
   - Verify user in service file

3. **Module not found**
   - Reinstall Python dependencies
   - Check virtual environment

4. **Out of memory**
   - Reduce workers
   - Upgrade VPS RAM

## 📈 Monitoring

### View Logs
```bash
# Real-time
sudo journalctl -u report-generator -f

# Last 100 lines
sudo journalctl -u report-generator -n 100

# Today's logs
sudo journalctl -u report-generator --since today
```

### Check Resources
```bash
# Memory usage
free -h

# Disk usage
df -h

# Process info
top -p $(pgrep -f gunicorn)
```

## 🔄 Updates

To update the Python service:

```bash
cd /path/to/your/app/python-report-service

# Update files
cp ../report_generator-main/app.py .
cp ../report_generator-main/report.py .

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Restart
sudo systemctl restart report-generator
```

## ✅ Deployment Checklist

- [ ] Python service deployed
- [ ] Systemd service created
- [ ] Service is running
- [ ] Nginx configured
- [ ] Backend .env updated
- [ ] Node.js app restarted
- [ ] Can access Report Generator page
- [ ] Can upload JSON files
- [ ] Can generate test report
- [ ] PDF downloads successfully
- [ ] Logs are accessible

## 🎉 Success Indicators

✅ Service shows "active (running)"
✅ Health check returns success
✅ No errors in logs
✅ Can generate reports from UI
✅ PDFs download correctly
✅ Temp files are cleaned up

## 📞 Getting Help

If you encounter issues:

1. Check the detailed guides
2. Review service logs
3. Test Python service directly
4. Verify Nginx configuration
5. Check environment variables
6. Test with sample data

## 🚀 Ready to Deploy!

Follow the **QUICK_START_VPS.md** guide for step-by-step deployment instructions.

Estimated setup time: **10-15 minutes**

---

**Status**: ✅ Ready for production deployment
**Platform**: VPS (Ubuntu/Debian)
**Difficulty**: Easy (automated script provided)
**Support**: Full documentation included
