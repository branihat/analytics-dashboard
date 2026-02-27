#!/usr/bin/env python3
"""
Script to optimize report.py for smaller PDF file sizes
Run this on VPS if generated PDFs still exceed 10MB after compression
"""

import os
import re

REPORT_PY_PATH = "/var/www/analytics-dashboard/python-report-service/report.py"
BACKUP_PATH = "/var/www/analytics-dashboard/python-report-service/report.py.backup"

def backup_file():
    """Create backup of report.py"""
    if os.path.exists(REPORT_PY_PATH):
        with open(REPORT_PY_PATH, 'r') as f:
            content = f.read()
        with open(BACKUP_PATH, 'w') as f:
            f.write(content)
        print(f"✅ Backup created: {BACKUP_PATH}")
        return content
    else:
        print(f"❌ File not found: {REPORT_PY_PATH}")
        return None

def optimize_images(content):
    """Optimize image handling for smaller file sizes"""
    
    optimizations = []
    
    # 1. Reduce image DPI if present
    if 'dpi=' in content or 'DPI' in content:
        # Lower DPI reduces file size significantly
        content = re.sub(r'dpi=\d+', 'dpi=72', content)
        content = re.sub(r'DPI=\d+', 'DPI=72', content)
        optimizations.append("Reduced image DPI to 72")
    
    # 2. Add image compression if PIL/Pillow is used
    if 'from PIL import Image' in content or 'import PIL' in content:
        # Add compression quality setting
        if 'save(' in content and 'quality=' not in content:
            content = content.replace(
                '.save(',
                '.save(quality=60, optimize=True, '
            )
            optimizations.append("Added image quality=60 and optimize=True")
    
    # 3. Resize large images
    if 'Image.open' in content:
        # Add max size constraint
        resize_code = '''
# Resize large images to reduce PDF size
def resize_image_if_needed(img, max_width=800, max_height=600):
    """Resize image if it exceeds max dimensions"""
    if img.width > max_width or img.height > max_height:
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return img
'''
        if 'def resize_image_if_needed' not in content:
            # Insert after imports
            import_end = content.find('\n\n', content.find('import'))
            if import_end > 0:
                content = content[:import_end] + resize_code + content[import_end:]
                optimizations.append("Added image resize function")
    
    # 4. Convert PNG to JPEG where possible (smaller file size)
    if '.png' in content.lower():
        optimizations.append("Note: Consider converting PNG images to JPEG")
    
    # 5. Reduce font embedding if possible
    if 'embed_fonts' in content:
        content = content.replace('embed_fonts=True', 'embed_fonts=False')
        optimizations.append("Disabled font embedding")
    
    return content, optimizations

def optimize_pdf_settings(content):
    """Optimize PDF generation settings"""
    
    optimizations = []
    
    # 1. Add compression to PDF generation
    if 'canvas.Canvas' in content or 'SimpleDocTemplate' in content:
        # Add compression flag
        if 'compress=' not in content:
            content = content.replace(
                'canvas.Canvas(',
                'canvas.Canvas(compress=True, '
            )
            content = content.replace(
                'SimpleDocTemplate(',
                'SimpleDocTemplate(compress=True, '
            )
            optimizations.append("Added PDF compression flag")
    
    # 2. Reduce page size if using large format
    if 'pagesize=A4' not in content and 'pagesize=' in content:
        optimizations.append("Note: Consider using A4 page size instead of larger formats")
    
    return content, optimizations

def main():
    print("🔧 PDF Size Optimization Script")
    print("=" * 50)
    
    # Backup original file
    content = backup_file()
    if not content:
        return
    
    original_size = len(content)
    print(f"📄 Original file size: {original_size} bytes")
    
    # Apply optimizations
    all_optimizations = []
    
    print("\n🖼️  Optimizing image handling...")
    content, img_opts = optimize_images(content)
    all_optimizations.extend(img_opts)
    
    print("📑 Optimizing PDF settings...")
    content, pdf_opts = optimize_pdf_settings(content)
    all_optimizations.extend(pdf_opts)
    
    # Write optimized file
    with open(REPORT_PY_PATH, 'w') as f:
        f.write(content)
    
    new_size = len(content)
    print(f"\n✅ Optimized file size: {new_size} bytes")
    
    print("\n📋 Applied optimizations:")
    if all_optimizations:
        for i, opt in enumerate(all_optimizations, 1):
            print(f"  {i}. {opt}")
    else:
        print("  No automatic optimizations applied")
        print("  Manual review recommended:")
        print("    - Check image sizes and quality")
        print("    - Reduce embedded images")
        print("    - Use JPEG instead of PNG")
        print("    - Limit number of violations per report")
    
    print("\n🔄 Next steps:")
    print("  1. Restart the service: systemctl restart report-generator")
    print("  2. Test with a small JSON file")
    print("  3. Check generated PDF size")
    print(f"  4. If needed, restore backup: cp {BACKUP_PATH} {REPORT_PY_PATH}")
    
    print("\n💡 Additional tips for reducing PDF size:")
    print("  - Limit violations per report (e.g., max 50)")
    print("  - Reduce image resolution before embedding")
    print("  - Use thumbnails instead of full-size images")
    print("  - Remove unnecessary graphics/logos")
    print("  - Simplify table formatting")

if __name__ == "__main__":
    main()
