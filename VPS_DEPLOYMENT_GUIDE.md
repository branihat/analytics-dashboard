# VPS Deployment Guide - Python Report Generator

## Overview
This guide will help you deploy the Python Flask report generator service on your VPS alongside your main Node.js application.

## Architecture on VPS

```
VPS Server
├── Node.js App (Port 8080) - Main application
├── Python Flask Service (Port 5000) - Report generator
└── Nginx - Reverse proxy for both services
```

## Prerequisites

- VPS with Ubuntu/Debian (or similar)
- Python 3.8+ installed
- Node.js application already running
- Nginx installed (for reverse proxy)
- Root or sudo access

## Step 1: Install Python Dependencies

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install system dependencies for image processing
sudo apt install libpng-dev libjpeg-dev libfreetype6-dev -y
```

## Step 2: Setup Python Service Directory

```bash
# Navigate to your application directory
cd /path/to/your/app

# Create directory for Python service
mkdir -p python-report-service
cd python-report-service

# Copy Python files here (we'll create them below)
```

## Step 3: Create Python Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install flask reportlab matplotlib pandas requests pillow gunicorn pikepdf
```

## Step 4: Setup Python Service as Systemd Service

Create a systemd service file to run the Python service automatically:

```bash
sudo nano /etc/systemd/system/report-generator.service
```

Add the following content:

```ini
[Unit]
Description=Python Report Generator Service
After=network.target

[Service]
Type=notify
User=your-username
Group=your-username
WorkingDirectory=/path/to/your/app/python-report-service
Environment="PATH=/path/to/your/app/python-report-service/venv/bin"
ExecStart=/path/to/your/app/python-report-service/venv/bin/gunicorn --workers 2 --timeout 180 --bind 127.0.0.1:5000 app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Important:** Replace:
- `your-username` with your actual username
- `/path/to/your/app` with your actual application path

## Step 5: Configure Nginx Reverse Proxy

Edit your Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/your-site
```

Add a location block for the Python service:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Main Node.js application
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

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
}
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Update Backend Environment Variable

Update your Node.js backend `.env` file:

```bash
nano /path/to/your/app/src/backend/.env
```

Add or update:

```env
# Use localhost since both services are on same server
PYTHON_REPORT_SERVICE_URL=http://localhost:5000

# Or use your domain with the proxy path
# PYTHON_REPORT_SERVICE_URL=https://yourdomain.com/python-api
```

## Step 7: Start the Python Service

```bash
# Enable and start the service
sudo systemctl enable report-generator
sudo systemctl start report-generator

# Check status
sudo systemctl status report-generator

# View logs
sudo journalctl -u report-generator -f
```

## Step 8: Restart Your Node.js Application

```bash
# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-nodejs-app

# If using Docker
docker-compose restart
```

## Verification

Test the Python service:

```bash
# Test health endpoint
curl http://localhost:5000/

# Should return: "Drone Report API Running 🚀"
```

Test from your Node.js app:

```bash
# Login to your app as admin
# Navigate to Report Generator page
# Upload a test JSON and generate report
```

## File Structure on VPS

```
/path/to/your/app/
├── src/
│   ├── backend/
│   │   ├── .env (PYTHON_REPORT_SERVICE_URL=http://localhost:5000)
│   │   └── ...
│   └── frontend/
│       └── ...
├── python-report-service/
│   ├── venv/
│   ├── app.py
│   ├── report.py
│   ├── requirements.txt
│   ├── temp_reports/ (auto-created)
│   ├── reports/ (auto-created)
│   └── image_cache/ (auto-created)
└── ...
```

## Monitoring and Logs

### View Python Service Logs
```bash
# Real-time logs
sudo journalctl -u report-generator -f

# Last 100 lines
sudo journalctl -u report-generator -n 100

# Logs from today
sudo journalctl -u report-generator --since today
```

### Check Service Status
```bash
sudo systemctl status report-generator
```

### Restart Service
```bash
sudo systemctl restart report-generator
```

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u report-generator -n 50

# Check if port 5000 is already in use
sudo lsof -i :5000

# Test Python script manually
cd /path/to/your/app/python-report-service
source venv/bin/activate
python app.py
```

### Permission Issues
```bash
# Ensure correct ownership
sudo chown -R your-username:your-username /path/to/your/app/python-report-service

# Ensure directories are writable
chmod 755 /path/to/your/app/python-report-service
```

### Memory Issues
If your VPS has limited RAM, adjust the number of workers:

```bash
sudo nano /etc/systemd/system/report-generator.service

# Change --workers 2 to --workers 1
ExecStart=.../gunicorn --workers 1 --timeout 180 --bind 127.0.0.1:5000 app:app

sudo systemctl daemon-reload
sudo systemctl restart report-generator
```

### Image Download Failures
```bash
# Install additional dependencies
sudo apt install libssl-dev libffi-dev -y
pip install --upgrade requests urllib3
```

## Security Considerations

1. **Firewall**: Ensure port 5000 is NOT exposed externally
   ```bash
   sudo ufw status
   # Port 5000 should only be accessible from localhost
   ```

2. **File Permissions**: Restrict access to service files
   ```bash
   chmod 600 /path/to/your/app/python-report-service/.env
   ```

3. **Nginx Rate Limiting**: Add rate limiting for the Python API
   ```nginx
   limit_req_zone $binary_remote_addr zone=python_api:10m rate=5r/m;
   
   location /python-api/ {
       limit_req zone=python_api burst=2;
       # ... rest of config
   }
   ```

## Updating the Python Service

```bash
cd /path/to/your/app/python-report-service
source venv/bin/activate

# Update code
git pull  # or copy new files

# Update dependencies
pip install -r requirements.txt --upgrade

# Restart service
sudo systemctl restart report-generator
```

## Backup and Maintenance

### Backup Generated Reports
```bash
# Create backup directory
mkdir -p /path/to/backups/reports

# Backup reports (run as cron job)
cp -r /path/to/your/app/python-report-service/reports/* /path/to/backups/reports/
```

### Clean Old Reports (Optional)
```bash
# Delete reports older than 7 days
find /path/to/your/app/python-report-service/reports -name "*.pdf" -mtime +7 -delete
```

### Cron Job for Cleanup
```bash
crontab -e

# Add this line to clean reports weekly
0 2 * * 0 find /path/to/your/app/python-report-service/reports -name "*.pdf" -mtime +7 -delete
```

## Performance Optimization

### 1. Enable Nginx Caching (Optional)
```nginx
proxy_cache_path /var/cache/nginx/python levels=1:2 keys_zone=python_cache:10m max_size=100m;

location /python-api/ {
    proxy_cache python_cache;
    proxy_cache_valid 200 5m;
    # ... rest of config
}
```

### 2. Increase Worker Timeout for Large Reports
```bash
sudo nano /etc/systemd/system/report-generator.service

# Increase timeout to 300 seconds (5 minutes)
ExecStart=.../gunicorn --workers 2 --timeout 300 --bind 127.0.0.1:5000 app:app
```

### 3. Monitor Resource Usage
```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Monitor Python process
top -p $(pgrep -f gunicorn)
```

## Quick Reference Commands

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

# Test service
curl http://localhost:5000/

# Reload Nginx
sudo systemctl reload nginx
```

## Support

If you encounter issues:
1. Check service logs: `sudo journalctl -u report-generator -n 100`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check Node.js logs: `pm2 logs` or your logging method
4. Verify Python service is running: `curl http://localhost:5000/`
5. Test connectivity: `curl -X POST http://localhost:5000/upload-json -H "Content-Type: application/json" -d '{}'`
