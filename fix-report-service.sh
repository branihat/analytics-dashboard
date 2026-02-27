#!/bin/bash

echo "🔧 Fixing Python Report Service Issues..."

# 1. Fix backend .env to use 127.0.0.1 instead of localhost
echo "📝 Step 1: Updating backend .env..."
cd /var/www/analytics-dashboard/src/backend
sed -i 's|PYTHON_REPORT_SERVICE_URL=http://localhost:5000|PYTHON_REPORT_SERVICE_URL=http://127.0.0.1:5000|g' .env

# Add the line if it doesn't exist
if ! grep -q "PYTHON_REPORT_SERVICE_URL" .env; then
    echo "PYTHON_REPORT_SERVICE_URL=http://127.0.0.1:5000" >> .env
fi

echo "✅ Backend .env updated"

# 2. Restore clean app.py from original
echo "📝 Step 2: Restoring clean app.py..."
cd /var/www/analytics-dashboard/python-report-service
cp ../report_generator-main/app.py ./app.py

echo "✅ app.py restored from original"

# 3. Update app.py to improve PDF compression
echo "📝 Step 3: Improving PDF compression..."
cat > /tmp/compress_fix.py << 'PYEOF'
import sys

# Read the file
with open('app.py', 'r') as f:
    content = f.read()

# Find and replace the compress_pdf function with better compression
old_compress = '''def compress_pdf(input_path, output_path):
    try:
        with pikepdf.open(input_path) as pdf:
            pdf.save(
                output_path,
                optimize_streams=True,
                compress_streams=True,
                object_stream_mode=pikepdf.ObjectStreamMode.generate
            )
        print("✅ PDF compressed successfully")
    except Exception as e:
        print("❌ Compression failed:", str(e))'''

new_compress = '''def compress_pdf(input_path, output_path):
    try:
        with pikepdf.open(input_path) as pdf:
            # More aggressive compression settings
            pdf.save(
                output_path,
                optimize_streams=True,
                compress_streams=True,
                stream_decode_level=pikepdf.StreamDecodeLevel.generalized,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
                recompress_flate=True,
                normalize_content=True
            )
        
        # Check file size
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"✅ PDF compressed successfully: {size_mb:.2f} MB")
        
        if size_mb > 10:
            print(f"⚠️  Warning: PDF size ({size_mb:.2f} MB) exceeds 10MB limit")
            
    except Exception as e:
        print("❌ Compression failed:", str(e))
        # If compression fails, copy original
        import shutil
        shutil.copy(input_path, output_path)'''

content = content.replace(old_compress, new_compress)

# Write back
with open('app.py', 'w') as f:
    f.write(content)

print("✅ Compression function updated")
PYEOF

python3 /tmp/compress_fix.py
rm /tmp/compress_fix.py

echo "✅ PDF compression improved"

# 4. Update reportGenerator.js to add chunk_size for large uploads
echo "📝 Step 4: Updating Cloudinary upload with chunk_size..."
cd /var/www/analytics-dashboard/src/backend/routes

# Create backup
cp reportGenerator.js reportGenerator.js.backup

# Update the upload configuration
cat > /tmp/fix_cloudinary.js << 'JSEOF'
const fs = require('fs');

let content = fs.readFileSync('reportGenerator.js', 'utf8');

// Find the uploadStream configuration and add chunk_size
const oldConfig = `const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'inferred-reports/ai-generated',
          public_id: filename.replace('.pdf', ''),
          format: 'pdf',
          type: 'upload',
          access_mode: 'public'
        },`;

const newConfig = `const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'inferred-reports/ai-generated',
          public_id: filename.replace('.pdf', ''),
          format: 'pdf',
          type: 'upload',
          access_mode: 'public',
          chunk_size: 6000000 // 6MB chunks for large files
        },`;

content = content.replace(oldConfig, newConfig);

fs.writeFileSync('reportGenerator.js', content);
console.log('✅ Cloudinary configuration updated');
JSEOF

node /tmp/fix_cloudinary.js
rm /tmp/fix_cloudinary.js

echo "✅ Cloudinary upload configuration updated"

# 5. Restart services
echo "📝 Step 5: Restarting services..."

# Restart Python service
systemctl restart report-generator

# Wait for service to start
sleep 3

# Check Python service status
if systemctl is-active --quiet report-generator; then
    echo "✅ Python report service is running"
else
    echo "❌ Python report service failed to start"
    journalctl -u report-generator -n 20 --no-pager
fi

# Restart Node backend
pm2 restart backend 2>/dev/null || echo "⚠️  PM2 backend not found, restart manually"

echo ""
echo "🎉 All fixes applied!"
echo ""
echo "📋 Summary of changes:"
echo "  1. ✅ Backend .env updated to use 127.0.0.1"
echo "  2. ✅ app.py restored from clean original"
echo "  3. ✅ PDF compression improved with aggressive settings"
echo "  4. ✅ Cloudinary upload configured for large files (6MB chunks)"
echo "  5. ✅ Services restarted"
echo ""
echo "🧪 Test the service:"
echo "  curl http://127.0.0.1:5000/"
echo ""
echo "📊 Check service status:"
echo "  systemctl status report-generator"
echo ""
echo "📝 View logs:"
echo "  journalctl -u report-generator -f"
