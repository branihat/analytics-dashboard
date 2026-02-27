#!/bin/bash

echo "🔍 Checking Backend Logs for Report Generator Errors..."
echo "=" * 60

# Check PM2 logs
echo ""
echo "📋 PM2 Backend Logs (last 50 lines):"
pm2 logs backend --lines 50 --nostream

echo ""
echo "=" * 60
echo ""
echo "🐍 Python Service Status:"
systemctl status report-generator --no-pager

echo ""
echo "=" * 60
echo ""
echo "📋 Python Service Logs (last 30 lines):"
journalctl -u report-generator -n 30 --no-pager

echo ""
echo "=" * 60
echo ""
echo "🔌 Check if Python service is responding:"
curl -v http://127.0.0.1:5000/ 2>&1

echo ""
echo "=" * 60
echo ""
echo "🔍 Check backend environment:"
cat /var/www/analytics-dashboard/src/backend/.env | grep PYTHON

echo ""
echo "=" * 60
echo ""
echo "📊 Memory Status:"
free -h

echo ""
echo "🔍 Port 5000 Status:"
netstat -tlnp | grep 5000
