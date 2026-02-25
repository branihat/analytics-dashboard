#!/bin/bash

# ============================================
# Python Report Generator VPS Deployment Script
# ============================================

set -e  # Exit on error

echo "🚀 Starting Python Report Generator Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PYTHON_SERVICE_DIR="python-report-service"
SERVICE_NAME="report-generator"
PYTHON_PORT=5000

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root. Run as your regular user with sudo privileges."
    exit 1
fi

# Get current directory
CURRENT_DIR=$(pwd)
print_info "Current directory: $CURRENT_DIR"

# Step 1: Check Python installation
print_info "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed. Installing..."
    sudo apt update
    sudo apt install -y python3 python3-pip python3-venv
    print_success "Python3 installed"
else
    PYTHON_VERSION=$(python3 --version)
    print_success "Python3 is installed: $PYTHON_VERSION"
fi

# Step 2: Install system dependencies
print_info "Installing system dependencies..."
sudo apt install -y libpng-dev libjpeg-dev libfreetype6-dev libssl-dev libffi-dev
print_success "System dependencies installed"

# Step 3: Create Python service directory
print_info "Creating Python service directory..."
if [ ! -d "$PYTHON_SERVICE_DIR" ]; then
    mkdir -p "$PYTHON_SERVICE_DIR"
    print_success "Directory created: $PYTHON_SERVICE_DIR"
else
    print_info "Directory already exists: $PYTHON_SERVICE_DIR"
fi

cd "$PYTHON_SERVICE_DIR"

# Step 4: Copy Python files
print_info "Copying Python service files..."

# Check if report_generator-main exists
if [ -d "../report_generator-main" ]; then
    cp ../report_generator-main/app.py . 2>/dev/null || true
    cp ../report_generator-main/report.py . 2>/dev/null || true
    cp ../report_generator-main/requirements.txt . 2>/dev/null || true
    print_success "Python files copied"
else
    print_error "report_generator-main directory not found!"
    print_info "Please ensure the Python service files are in the parent directory"
    exit 1
fi

# Step 5: Create virtual environment
print_info "Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_info "Virtual environment already exists"
fi

# Step 6: Install Python dependencies
print_info "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
print_success "Python dependencies installed"

# Step 7: Create necessary directories
print_info "Creating working directories..."
mkdir -p temp_reports reports image_cache
print_success "Working directories created"

# Step 8: Create systemd service file
print_info "Creating systemd service..."

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
WORKING_DIR="$CURRENT_DIR/$PYTHON_SERVICE_DIR"
VENV_PATH="$WORKING_DIR/venv/bin"
CURRENT_USER=$(whoami)

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Python Report Generator Service
After=network.target

[Service]
Type=notify
User=$CURRENT_USER
Group=$CURRENT_USER
WorkingDirectory=$WORKING_DIR
Environment="PATH=$VENV_PATH"
ExecStart=$VENV_PATH/gunicorn --workers 2 --timeout 180 --bind 127.0.0.1:$PYTHON_PORT app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

print_success "Systemd service file created"

# Step 9: Reload systemd and enable service
print_info "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

# Wait a moment for service to start
sleep 2

# Check service status
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    print_success "Service is running!"
else
    print_error "Service failed to start. Checking logs..."
    sudo journalctl -u "$SERVICE_NAME" -n 20
    exit 1
fi

# Step 10: Test the service
print_info "Testing Python service..."
if curl -s http://localhost:$PYTHON_PORT/ | grep -q "Running"; then
    print_success "Python service is responding correctly!"
else
    print_error "Python service is not responding as expected"
    exit 1
fi

# Step 11: Update backend .env file
print_info "Updating backend .env file..."
cd "$CURRENT_DIR"

BACKEND_ENV="src/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
    # Check if PYTHON_REPORT_SERVICE_URL already exists
    if grep -q "PYTHON_REPORT_SERVICE_URL" "$BACKEND_ENV"; then
        # Update existing line
        sed -i "s|PYTHON_REPORT_SERVICE_URL=.*|PYTHON_REPORT_SERVICE_URL=http://localhost:$PYTHON_PORT|" "$BACKEND_ENV"
        print_success "Updated PYTHON_REPORT_SERVICE_URL in .env"
    else
        # Add new line
        echo "" >> "$BACKEND_ENV"
        echo "# Python Report Generator Service" >> "$BACKEND_ENV"
        echo "PYTHON_REPORT_SERVICE_URL=http://localhost:$PYTHON_PORT" >> "$BACKEND_ENV"
        print_success "Added PYTHON_REPORT_SERVICE_URL to .env"
    fi
else
    print_error "Backend .env file not found at $BACKEND_ENV"
    print_info "Please manually add: PYTHON_REPORT_SERVICE_URL=http://localhost:$PYTHON_PORT"
fi

# Step 12: Display Nginx configuration suggestion
print_info "Nginx configuration needed!"
echo ""
echo "Add this to your Nginx configuration:"
echo ""
echo "location /python-api/ {"
echo "    proxy_pass http://localhost:$PYTHON_PORT/;"
echo "    proxy_http_version 1.1;"
echo "    proxy_set_header Host \$host;"
echo "    proxy_set_header X-Real-IP \$remote_addr;"
echo "    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "    proxy_set_header X-Forwarded-Proto \$scheme;"
echo "    proxy_read_timeout 180s;"
echo "    proxy_connect_timeout 180s;"
echo "    proxy_send_timeout 180s;"
echo "}"
echo ""
print_info "After adding, run: sudo nginx -t && sudo systemctl reload nginx"

# Final summary
echo ""
echo "=========================================="
print_success "Deployment Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
sudo systemctl status "$SERVICE_NAME" --no-pager -l
echo ""
echo "Useful Commands:"
echo "  View logs:    sudo journalctl -u $SERVICE_NAME -f"
echo "  Restart:      sudo systemctl restart $SERVICE_NAME"
echo "  Stop:         sudo systemctl stop $SERVICE_NAME"
echo "  Status:       sudo systemctl status $SERVICE_NAME"
echo ""
echo "Next Steps:"
echo "  1. Configure Nginx (see above)"
echo "  2. Restart your Node.js application"
echo "  3. Test the Report Generator in your app"
echo ""
print_success "Python Report Generator is ready to use!"
