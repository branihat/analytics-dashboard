@echo off
echo Starting Analytics Dashboard Application...
echo.

echo Starting Backend Server...
cd src\backend
start "Backend Server" cmd /k "npm start"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo Starting Frontend Application...
cd ..\frontend
start "Frontend App" cmd /k "npm start"

echo.
echo ========================================
echo   Analytics Dashboard Started!
echo ========================================
echo.
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo Login Credentials:
echo Admin: admin1@ccl.com / Aerovania_grhns@2002
echo.
echo Press any key to close this window...
pause > nul