#!/bin/bash

# Quick Deployment Script for Hostinger VPS
# This script downloads and runs the complete deployment

echo "🚀 Analytics Dashboard - Quick Deployment"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root"
    echo "   Create a non-root user first:"
    echo "   adduser deploy"
    echo "   usermod -aG sudo deploy"
    echo "   su - deploy"
    exit 1
fi

# Check sudo access
if ! sudo -n true 2>/dev/null; then
    echo "❌ This script requires sudo privileges"
    echo "   Please ensure your user has sudo access"
    exit 1
fi

echo "📥 Downloading deployment script..."

# Download the complete deployment script
if curl -fsSL https://raw.githubusercontent.com/branihat/analytics-dashboard/main/deploy-hostinger-complete.sh -o deploy-hostinger-complete.sh; then
    echo "✅ Deployment script downloaded successfully"
else
    echo "❌ Failed to download deployment script"
    echo "   Please check your internet connection"
    exit 1
fi

# Make it executable
chmod +x deploy-hostinger-complete.sh

echo ""
echo "🎯 Configuration:"
echo "- Repository: https://github.com/branihat/analytics-dashboard.git"
echo "- Domain: aiminesanalytics.com"
echo "- Database: PostgreSQL (local)"
echo ""

read -p "Ready to start deployment? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Run the deployment script
./deploy-hostinger-complete.sh

echo ""
echo "🎉 Quick deployment completed!"
echo "Check the output above for any issues or next steps."