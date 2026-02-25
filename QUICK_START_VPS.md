# Quick Start - Deploy Python Report Generator on VPS

## Prerequisites
- VPS with Ubuntu/Debian
- Your main Node.js app already running
- SSH access to your VPS
- The `report_generator-main` folder in your project root

## Step-by-Step Deployment

### 1. Upload Files to VPS

Upload these files to your VPS application directory:
- `report_generator-main/` folder (entire folder)
- `deploy-python-service.sh`

```bash
# From your local machine
scp -r report_generator-main/ user@your-vps:/path/to/your/app/
scp deploy-python-service.sh user@your-vps:/path/to/your/app/
```

### 2. SSH into Your VPS

```bash
ssh user@your-vps
cd /path/to/your/app
```

### 3. Run the Deployment Script

```bash
# Make script executable
chmod +x deploy-python-service.sh

# Run the script
./deploy-python-service.sh
```

The script will:
- ✅ Install Python and dependencies
- ✅ Create virtual environment
- ✅ Install Python packages
- ✅ Create systemd service
- ✅ Start the Python service
- ✅ Update your backend .env file
- ✅ Show Nginx configuration

### 4. Configure Nginx

Edit your Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/your-site
```

Add this location block inside your `server` block:

```nginx
# Python Report Generator Service
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

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Restart Your Node.js App

```bash
# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-app-name

# If using Docker
docker-compose restart
```

### 6. Test the Integration

1. Login to your application as admin
2. Navigate to "Report Generator" in the sidebar
3. Upload a test JSON file
4. Add a video link
5. Click "Generate Report"
6. PDF should download automatically

## Verify Installation

```bash
# Check Python service status
sudo systemctl status report-generator

# Test Python service directly
curl http://localhost:5000/
# Should return: "Drone Report API Running 🚀"

# View logs
sudo journalctl -u report-generator -f
```

## Troubleshooting

### Service not starting?
```bash
# View detailed logs
sudo journalctl -u report-generator -n 50

# Check if port 5000 is available
sudo lsof -i :5000
```

### Can't connect from Node.js?
```bash
# Verify .env file
cat src/backend/.env | grep PYTHON_REPORT_SERVICE_URL

# Should show: PYTHON_REPORT_SERVICE_URL=http://localhost:5000
```

### Nginx errors?
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t
```

## File Structure After Deployment

```
/path/to/your/app/
├── src/
│   ├── backend/
│   │   ├── .env (updated with PYTHON_REPORT_SERVICE_URL)
│   │   └── ...
│   └── frontend/
│       └── ...
├── report_generator-main/
│   ├── app.py
│   ├── report.py
│   └── requirements.txt
├── python-report-service/
│   ├── venv/
│   ├── app.py (copied)
│   ├── report.py (copied)
│   ├── requirements.txt (copied)
│   ├── temp_reports/
│   ├── reports/
│   └── image_cache/
└── deploy-python-service.sh
```

## Management Commands

```bash
# Start service
sudo systemctl start report-generator

# Stop service
sudo systemctl stop report-generator

# Restart service
sudo systemctl restart report-generator

# View status
sudo systemctl status report-generator

# View logs (real-time)
sudo journalctl -u report-generator -f

# View last 100 log lines
sudo journalctl -u report-generator -n 100
```

## Update Python Service

If you need to update the Python code:

```bash
cd /path/to/your/app/python-report-service

# Update files
cp ../report_generator-main/app.py .
cp ../report_generator-main/report.py .

# Restart service
sudo systemctl restart report-generator
```

## Security Notes

- ✅ Python service runs on localhost:5000 (not exposed externally)
- ✅ Only accessible through Nginx reverse proxy
- ✅ Requires authentication through your Node.js app
- ✅ Temp files are automatically cleaned after report generation

## Performance Tips

For VPS with limited resources:

```bash
# Edit service to use 1 worker instead of 2
sudo nano /etc/systemd/system/report-generator.service

# Change: --workers 2 to --workers 1
ExecStart=.../gunicorn --workers 1 --timeout 180 --bind 127.0.0.1:5000 app:app

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart report-generator
```

## Need Help?

Check the detailed guide: `VPS_DEPLOYMENT_GUIDE.md`

Common issues:
1. Port 5000 already in use → Change port in service file
2. Permission denied → Check file ownership
3. Module not found → Reinstall Python dependencies
4. Out of memory → Reduce workers or upgrade VPS

## Success Indicators

✅ Service status shows "active (running)"
✅ `curl http://localhost:5000/` returns success message
✅ No errors in `sudo journalctl -u report-generator`
✅ Can generate reports from the web interface
✅ PDFs download successfully

That's it! Your Python Report Generator is now running on your VPS! 🎉
