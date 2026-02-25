# AI Report Generator Integration Guide

## Overview
The AI Report Generator feature allows admins to upload multiple JSON files containing violation data and generate comprehensive PDF reports with analytics, charts, and evidence images.

## Architecture

```
Frontend (React) → Backend (Node.js) → Python Service (Flask/Render)
```

The system works by:
1. Frontend uploads JSON files to the Node.js backend
2. Backend forwards JSON data to the Python Flask service
3. Python service stores JSONs temporarily
4. When "Generate Report" is clicked, Python service:
   - Combines all JSON data
   - Generates PDF with analytics and charts
   - Downloads images from URLs
   - Compresses the PDF
   - Returns the PDF file
   - Cleans up temporary JSON files

## Setup Instructions

### 1. Deploy Python Service to Render

Your Python Flask service (`report_generator-main`) needs to be deployed to Render or any hosting platform.

**Steps:**
1. Create a new Web Service on Render
2. Connect your GitHub repository containing the Python code
3. Set the following:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --workers 1 --timeout 180 --bind 0.0.0.0:$PORT`
4. Add environment variables (if needed for email):
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail app password
5. Deploy and note the URL (e.g., `https://your-app.onrender.com`)

### 2. Configure Backend Environment

Add the Python service URL to your backend `.env` file:

```env
PYTHON_REPORT_SERVICE_URL=https://your-app.onrender.com
```

### 3. Install Dependencies

In the backend directory:

```bash
cd src/backend
npm install
```

This will install the `axios` package needed to communicate with the Python service.

### 4. Restart Your Application

Restart both frontend and backend servers to apply the changes.

## Usage

### For Admins:

1. **Navigate to Report Generator**
   - Click "Report Generator" in the sidebar (admin-only)

2. **Upload JSON Files**
   - Click the upload area or drag & drop JSON files
   - You can upload multiple JSON files at once
   - Each JSON should contain violation data in this format:

```json
{
  "location": "Site Name",
  "date": "2026-02-09",
  "drone_id": "DRONE_X",
  "violations": [
    {
      "id": "violation_001",
      "type": "stagnant_water",
      "image_url": "https://drive.google.com/...",
      "latitude": "23.1234",
      "longitude": "85.5678",
      "timestamp": "2026-02-09 10:30:00"
    }
  ]
}
```

3. **Add Video Link**
   - Enter the Google Drive link or direct video URL

4. **Generate Report**
   - Click "Generate Report"
   - Wait for the PDF to be generated (may take 1-3 minutes)
   - The PDF will automatically download

## JSON Format Requirements

### Required Fields:
- `location`: Site name (string)
- `date`: Report date in YYYY-MM-DD format
- `drone_id`: Drone identifier (string)
- `violations`: Array of violation objects

### Violation Object Fields:
- `id`: Unique violation ID (string)
- `type`: Violation type (must match predefined types)
- `image_url`: URL to violation image (Google Drive or direct link)
- `latitude`: GPS latitude (string)
- `longitude`: GPS longitude (string)
- `timestamp`: When violation was detected (string)

### Supported Violation Types:
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

## Generated Report Contents

The PDF report includes:

1. **Cover Page**
   - Executive summary
   - Site metadata
   - Total violations count
   - Video evidence link

2. **Analytics Page**
   - Violation frequency chart
   - Category-wise breakdown table
   - Risk level assessment

3. **Evidence Pages**
   - Category-wise violation images
   - GPS coordinates
   - Timestamps
   - Alert IDs

4. **Conclusion Page**
   - Summary and recommendations
   - Statutory remarks
   - Disclaimer

## Troubleshooting

### "Report generation service is unavailable"
- Check if the Python service is running on Render
- Verify the `PYTHON_REPORT_SERVICE_URL` in your `.env` file
- Test the service health at `/api/report-generator/health`

### "Failed to upload JSON"
- Ensure JSON files are valid (use a JSON validator)
- Check file size (should be reasonable, < 5MB per file)
- Verify the JSON structure matches the required format

### "Report generation timed out"
- Large reports with many images may take longer
- The timeout is set to 3 minutes
- Consider reducing the number of violations or optimizing images

### Images not showing in PDF
- Ensure image URLs are publicly accessible
- For Google Drive links, make sure files are set to "Anyone with the link can view"
- Direct image URLs work best

## API Endpoints

### Upload JSON
```
POST /api/report-generator/upload-json
Authorization: Bearer <token>
Content-Type: application/json

Body: { ...violation data... }
```

### Generate Report
```
POST /api/report-generator/generate
Authorization: Bearer <token>
Content-Type: application/json

Body: { "video_link": "https://..." }

Response: PDF file (application/pdf)
```

### Health Check
```
GET /api/report-generator/health
Authorization: Bearer <token>

Response: { "status": "connected", "serviceUrl": "..." }
```

## Security Notes

- Only admins can access the Report Generator
- All requests require authentication
- JSON files are temporarily stored on the Python service
- Files are automatically deleted after report generation
- No sensitive data should be included in JSON files

## Performance Considerations

- Each JSON file is uploaded sequentially
- Report generation can take 1-3 minutes depending on:
  - Number of violations
  - Number of images to download
  - Image sizes
  - Network speed
- The Python service uses image caching to improve performance
- PDFs are automatically compressed before download

## Future Enhancements

Potential improvements:
- Batch upload progress indicator
- Report preview before download
- Custom report templates
- Scheduled report generation
- Email delivery of reports
- Report history and storage
