#!/bin/bash

echo "🔍 Diagnosing 500 Error in Report Generator"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Python service
echo ""
echo "1️⃣  Checking Python Service..."
if curl -s http://127.0.0.1:5000/ > /dev/null; then
    echo -e "${GREEN}✅ Python service is responding${NC}"
    curl -s http://127.0.0.1:5000/
else
    echo -e "${RED}❌ Python service is NOT responding${NC}"
    echo "   Checking service status..."
    systemctl status report-generator --no-pager | head -20
fi

# 2. Check backend environment
echo ""
echo "2️⃣  Checking Backend Configuration..."
if grep -q "PYTHON_REPORT_SERVICE_URL" /var/www/analytics-dashboard/src/backend/.env; then
    echo -e "${GREEN}✅ PYTHON_REPORT_SERVICE_URL is set${NC}"
    grep "PYTHON_REPORT_SERVICE_URL" /var/www/analytics-dashboard/src/backend/.env
else
    echo -e "${RED}❌ PYTHON_REPORT_SERVICE_URL is NOT set${NC}"
fi

# 3. Check Cloudinary config
echo ""
echo "3️⃣  Checking Cloudinary Configuration..."
if grep -q "CLOUDINARY_CLOUD_NAME" /var/www/analytics-dashboard/src/backend/.env; then
    echo -e "${GREEN}✅ Cloudinary credentials are set${NC}"
else
    echo -e "${RED}❌ Cloudinary credentials are MISSING${NC}"
fi

# 4. Check if temp_reports directory exists
echo ""
echo "4️⃣  Checking Python Service Directories..."
if [ -d "/var/www/analytics-dashboard/python-report-service/temp_reports" ]; then
    echo -e "${GREEN}✅ temp_reports directory exists${NC}"
    echo "   Files in temp_reports:"
    ls -lh /var/www/analytics-dashboard/python-report-service/temp_reports/ 2>/dev/null || echo "   (empty)"
else
    echo -e "${RED}❌ temp_reports directory is MISSING${NC}"
fi

if [ -d "/var/www/analytics-dashboard/python-report-service/reports" ]; then
    echo -e "${GREEN}✅ reports directory exists${NC}"
else
    echo -e "${RED}❌ reports directory is MISSING${NC}"
fi

# 5. Test Python service endpoints
echo ""
echo "5️⃣  Testing Python Service Endpoints..."

# Test upload-json
echo "   Testing /upload-json endpoint..."
TEST_JSON='{"location":"Test","date":"2024-01-01","drone_id":"TEST","video_link":"https://test.com","violations":[]}'
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5000/upload-json \
  -H "Content-Type: application/json" \
  -d "$TEST_JSON")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ /upload-json endpoint works${NC}"
else
    echo -e "${RED}❌ /upload-json endpoint failed (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $RESPONSE_BODY"
fi

# 6. Check recent backend logs
echo ""
echo "6️⃣  Recent Backend Logs (last 20 lines)..."
pm2 logs backend --lines 20 --nostream 2>/dev/null || echo "   PM2 not available or backend not running"

# 7. Check recent Python logs
echo ""
echo "7️⃣  Recent Python Service Logs (last 20 lines)..."
journalctl -u report-generator -n 20 --no-pager

# 8. Memory check
echo ""
echo "8️⃣  Memory Status..."
free -h

# 9. Check for any Python errors
echo ""
echo "9️⃣  Checking for Python Syntax Errors..."
cd /var/www/analytics-dashboard/python-report-service
if python3 -m py_compile app.py 2>/dev/null; then
    echo -e "${GREEN}✅ app.py has no syntax errors${NC}"
else
    echo -e "${RED}❌ app.py has syntax errors:${NC}"
    python3 -m py_compile app.py
fi

# 10. Check dependencies
echo ""
echo "🔟 Checking Python Dependencies..."
source /var/www/analytics-dashboard/python-report-service/venv/bin/activate 2>/dev/null
if pip list | grep -E "(flask|pikepdf|reportlab)" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Required Python packages are installed${NC}"
    pip list | grep -E "(flask|pikepdf|reportlab)"
else
    echo -e "${RED}❌ Some Python packages may be missing${NC}"
fi

echo ""
echo "============================================"
echo "🎯 Diagnosis Complete"
echo ""
echo "📋 Next Steps:"
echo "   1. Review the errors above"
echo "   2. Check backend logs: pm2 logs backend"
echo "   3. Check Python logs: journalctl -u report-generator -f"
echo "   4. Try uploading a JSON file first before generating"
