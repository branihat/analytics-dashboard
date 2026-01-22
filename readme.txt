ANALYTICS DASHBOARD - INSTALLATION & SETUP GUIDE
===============================================

This is a comprehensive drone violation analytics dashboard with real-time monitoring,
data visualization, and automated feature detection capabilities.

🚀 QUICK START OPTIONS
======================

OPTION 1: DOCKER (RECOMMENDED - EASIEST)
----------------------------------------
Prerequisites:
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Docker Compose (included with Docker Desktop)

🔧 INSTALLATION STEPS
---------------------

1. BACKEND SETUP:
   cd Analytics-Dashboard-master/src/backend
   npm install
   npm start

   Backend will run on: http://localhost:5000

2. FRONTEND SETUP (Open new terminal):
   cd Analytics-Dashboard-master/src/frontend
   npm install
   npm start

   Frontend will run on: http://localhost:3000

Commands:
1. Navigate to project directory:
   cd Where_you_copied_this_file/Analytics-Dashboard-master

2. Start the application:
   docker-compose up -d

3. Access the dashboard:
   Frontend: http://localhost:3000
   Backend API: http://localhost:5000

4. Stop the application:
   docker-compose down

OPTION 2: MANUAL INSTALLATION
=============================

📋 PREREQUISITES
----------------
1. Node.js (v16 or higher): https://nodejs.org/en/download/
2. npm (comes with Node.js)
3. Git (optional): https://git-scm.com/downloads

🔧 INSTALLATION STEPS
---------------------

1. BACKEND SETUP:
   cd Analytics-Dashboard-master/src/backend
   npm install
   npm start

   Backend will run on: http://localhost:5000

2. FRONTEND SETUP (Open new terminal):
   cd Analytics-Dashboard-master/src/frontend
   npm install
   npm start

   Frontend will run on: http://localhost:3000

📊 FEATURES
===========
✅ Real-time violation monitoring
✅ Interactive map with violation markers
✅ Analytics dashboard with charts and KPIs
✅ JSON file upload for drone reports
✅ Automatic feature detection from uploaded data
✅ Role-based access control (Admin/User)
✅ Responsive design for all devices

📄 ATR DOCUMENT MANAGEMENT SYSTEM
=================================
✅ Department-based PDF document organization
✅ Cloudinary cloud storage integration
✅ Admin enhancement features with department filtering
✅ Role-based access control (Department isolation)

🔧 ATR ADMIN FEATURES:
- 👑 Admin badge and visual indicators
- 🔍 Department filter dropdown (All Departments + individual departments)
- 🎨 Color-coded department badges:
  * E&T Department: Blue
  * Security Department: Red  
  * Operation Department: Green
  * Survey Department: Orange
  * Safety Department: Purple
- 🔐 Cross-department access and enhanced delete permissions
- 📊 View all departments' documents in one interface

👤 ATR USER FEATURES:
- 📤 Drag-and-drop PDF upload to department folders
- 👁️ View only department-specific documents
- 🗑️ Delete own uploads with confirmation
- 🔒 Department isolation and security
- 📱 Responsive design for mobile devices

📁 FILE UPLOAD FORMAT
=====================
Upload JSON files with this structure:
{
  "report_id": "REPORT_001",
  "drone_id": "DRONE_ZONE_1",
  "date": "2025-01-10",
  "location": "Safety Zone Alpha",
  "violations": [
    {
      "id": "v1",
      "type": "ppe_kit_detection",
      "timestamp": "10:15:30",
      "latitude": 23.74891,
      "longitude": 85.98523,
      "confidence": 0.89,
      "frame_number": 150,
      "image_url": "https://example.com/image.jpg"
    }
  ]
}

🐳 DOCKER COMMANDS REFERENCE
============================

Start services:
docker-compose up -d

View logs:
docker-compose logs -f

Stop services:
docker-compose down

Rebuild containers:
docker-compose up --build -d

Remove all data:
docker-compose down -v

Check service status:
docker-compose ps

Access backend container:
docker-compose exec backend bash

Access frontend container:
docker-compose exec frontend bash

🔗 USEFUL LINKS
===============
- Node.js Download: https://nodejs.org/en/download/
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Docker Compose Docs: https://docs.docker.com/compose/
- WSL2 Installation: https://docs.microsoft.com/en-us/windows/wsl/install
- Git Download: https://git-scm.com/downloads


📝 NOTES
========
- Database is automatically created on first run
- Sample data is included for testing
- All uploaded data persists in SQLite database
- Features are automatically synced from violation data
- Responsive design works on mobile devices

For support or issues, check the logs:
docker-compose logs backend
docker-compose logs frontend