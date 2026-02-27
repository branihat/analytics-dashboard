#!/bin/bash

echo "🧪 Testing Report Generation End-to-End"
echo "========================================"

# Test data
TEST_JSON='{
  "location": "Test Site",
  "date": "2024-02-27",
  "drone_id": "TEST_DRONE_001",
  "video_link": "https://www.youtube.com/watch?v=test",
  "violations": [
    {
      "type": "Safety Violation",
      "description": "Test violation 1",
      "severity": "High",
      "timestamp": "2024-02-27T10:00:00Z"
    },
    {
      "type": "Equipment Issue",
      "description": "Test violation 2",
      "severity": "Medium",
      "timestamp": "2024-02-27T10:05:00Z"
    }
  ]
}'

echo ""
echo "1️⃣  Testing Python Service Health..."
HEALTH_CHECK=$(curl -s http://127.0.0.1:5000/)
if [ $? -eq 0 ]; then
    echo "✅ Python service is running: $HEALTH_CHECK"
else
    echo "❌ Python service is NOT responding"
    echo "   Starting service..."
    systemctl start report-generator
    sleep 3
fi

echo ""
echo "2️⃣  Uploading Test JSON..."
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5000/upload-json \
  -H "Content-Type: application/json" \
  -d "$TEST_JSON")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ JSON uploaded successfully"
    echo "   Response: $RESPONSE_BODY"
else
    echo "❌ JSON upload failed (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE_BODY"
    exit 1
fi

echo ""
echo "3️⃣  Checking temp_reports directory..."
TEMP_FILES=$(ls -1 /var/www/analytics-dashboard/python-report-service/temp_reports/*.json 2>/dev/null | wc -l)
echo "   Found $TEMP_FILES JSON file(s) in temp_reports"

if [ "$TEMP_FILES" -eq 0 ]; then
    echo "❌ No JSON files found! Upload may have failed."
    exit 1
fi

echo ""
echo "4️⃣  Testing Report Generation..."
echo "   This may take 1-2 minutes..."

GEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5000/generate-report \
  -H "Content-Type: application/json" \
  -d '{"video_link":"https://www.youtube.com/watch?v=test"}' \
  --max-time 180 \
  --output /tmp/test_report.pdf)

HTTP_CODE=$(echo "$GEN_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Report generated successfully"
    
    if [ -f /tmp/test_report.pdf ]; then
        PDF_SIZE=$(du -h /tmp/test_report.pdf | cut -f1)
        echo "   PDF size: $PDF_SIZE"
        
        # Check if PDF is valid
        if file /tmp/test_report.pdf | grep -q "PDF"; then
            echo "✅ PDF file is valid"
        else
            echo "❌ Generated file is not a valid PDF"
        fi
    fi
else
    echo "❌ Report generation failed (HTTP $HTTP_CODE)"
    RESPONSE_BODY=$(echo "$GEN_RESPONSE" | head -n-1)
    echo "   Response: $RESPONSE_BODY"
fi

echo ""
echo "5️⃣  Checking generated reports directory..."
REPORT_FILES=$(ls -lh /var/www/analytics-dashboard/python-report-service/reports/*.pdf 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Reports found:"
    echo "$REPORT_FILES"
else
    echo "⚠️  No reports found in reports directory"
fi

echo ""
echo "6️⃣  Checking Python service logs for errors..."
journalctl -u report-generator -n 30 --no-pager | grep -i "error\|exception\|failed" || echo "   No errors found in recent logs"

echo ""
echo "========================================"
echo "🎯 Test Complete"
echo ""
echo "📋 Summary:"
echo "   - Python service: $(systemctl is-active report-generator)"
echo "   - JSON files in temp: $TEMP_FILES"
echo "   - Test PDF: $([ -f /tmp/test_report.pdf ] && echo 'Generated' || echo 'Not generated')"
echo ""
echo "💡 If generation failed, check:"
echo "   1. Python service logs: journalctl -u report-generator -f"
echo "   2. Memory usage: free -h"
echo "   3. Python errors: python3 /var/www/analytics-dashboard/python-report-service/app.py"
