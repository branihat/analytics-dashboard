#!/bin/bash

echo "Starting Analytics Dashboard Application..."
echo ""

echo "Starting Backend Server..."
cd src/backend
gnome-terminal --title="Backend Server" -- bash -c "npm start; exec bash" &

echo "Waiting for backend to initialize..."
sleep 5

echo "Starting Frontend Application..."
cd ../frontend
gnome-terminal --title="Frontend App" -- bash -c "npm start; exec bash" &

echo ""
echo "========================================"
echo "   Analytics Dashboard Started!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Login Credentials:"
echo "Admin: admin1@ccl.com / Aerovania_grhns@2002"
echo ""
echo "Press Enter to continue..."
read