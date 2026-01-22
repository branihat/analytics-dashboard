# 🚀 How to Start the Application on Localhost

## Prerequisites
- **Node.js** (v16 or higher): [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

## Quick Start Guide

### Step 1: Setup Backend Environment

1. Navigate to the backend directory:
   ```powershell
   cd src\backend
   ```

2. Copy the `env` file to `.env` (if it doesn't exist):
   ```powershell
   copy ..\..\env .env
   ```

3. Install backend dependencies:
   ```powershell
   npm install
   ```

4. Start the backend server:
   ```powershell
   npm start
   ```
   
   The backend will run on: **http://localhost:8080**

### Step 2: Setup Frontend (Open a NEW Terminal)

1. Navigate to the frontend directory:
   ```powershell
   cd src\frontend
   ```

2. Install frontend dependencies:
   ```powershell
   npm install
   ```

3. Start the frontend development server:
   ```powershell
   npm start
   ```
   
   The frontend will automatically open in your browser at: **http://localhost:3000**

## Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **Health Check**: http://localhost:8080/api/health

## Development Mode

For auto-reload during development:

**Backend** (in `src/backend`):
```powershell
npm run dev
```
(Requires nodemon - install with `npm install -g nodemon` or it's in devDependencies)

**Frontend**:
```powershell
npm start
```
(Already has hot-reload enabled)

## Troubleshooting

### Port Already in Use
If port 8080 or 3000 is already in use:
- **Backend**: Change `PORT` in `.env` file
- **Frontend**: React will ask to use a different port automatically

### Missing Dependencies
If you see module errors:
```powershell
# In backend directory
npm install

# In frontend directory  
npm install
```

### Database Issues
The database (SQLite) will be created automatically on first run in `src/backend/data/violations.db`

### Environment Variables
Make sure you have a `.env` file in `src/backend/` with at least:
```
PORT=8080
NODE_ENV=development
JWT_SECRET=your-secret-key-here
```

## Testing the Admin Site Feature

1. Login as an admin user
2. Navigate to the **Sites** page
3. Click the **"Add Site"** button
4. Enter a site name and optional description
5. Click **"Add Site"** to save

Only admin users can add, edit, or delete sites!
