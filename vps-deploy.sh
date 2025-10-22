#!/bin/bash
# StudentLens VPS Deployment Script
# Run this script on your VPS after cloning the repository

set -e  # Exit on error

echo "======================================"
echo "StudentLens VPS Deployment Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Use a regular user with sudo privileges."
    exit 1
fi

print_info "Step 1: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed successfully"
else
    print_success "Docker already installed"
fi

print_info "Step 2: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose already installed"
fi

print_info "Step 3: Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt update
    sudo apt install git -y
    print_success "Git installed successfully"
else
    print_success "Git already installed"
fi

print_info "Step 4: Configuring Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable 2>/dev/null || true
print_success "Firewall configured"

print_info "Step 5: Environment Configuration..."
echo ""
read -p "Enter your domain name (or press Enter to use VPS IP): " DOMAIN

if [ -z "$DOMAIN" ]; then
    # Get VPS public IP
    DOMAIN=$(curl -s ifconfig.me || curl -s icanhazip.com)
    PROTOCOL="http"
    print_info "Using VPS IP: $DOMAIN"
else
    PROTOCOL="https"
    print_info "Using domain: $DOMAIN"
fi

# Check if .env files exist
if [ ! -f ".env" ]; then
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env
        print_success "Created frontend .env from example"
    fi
    echo "VITE_API_BASE_URL=$PROTOCOL://$DOMAIN/api" > .env
    echo "VITE_BACKEND_URL=$PROTOCOL://$DOMAIN" >> .env
    print_success "Frontend environment configured"
else
    print_info "Frontend .env already exists, skipping..."
fi

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.production.example" ]; then
        cp backend/.env.production.example backend/.env
        print_success "Created backend .env from example"
    fi
    # Update CLIENT_URL in backend/.env
    if [ -f "backend/.env" ]; then
        sed -i "s|CLIENT_URL=.*|CLIENT_URL=\"$PROTOCOL://$DOMAIN\"|g" backend/.env
        sed -i "s|GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=\"$PROTOCOL://$DOMAIN/api/auth/google/callback\"|g" backend/.env
        print_success "Backend environment configured"
    fi
else
    print_info "Backend .env already exists, skipping..."
fi

# Update nginx config
print_info "Updating nginx configuration..."
if [ -f "nginx.conf" ]; then
    sed -i "s/server_name localhost;/server_name $DOMAIN;/g" nginx.conf
    print_success "Nginx configuration updated"
fi

print_info "Step 6: Generating secure secrets..."
if command -v node &> /dev/null; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    if [ -f "backend/.env" ]; then
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/g" backend/.env
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/g" backend/.env
        print_success "Secure secrets generated"
    fi
else
    print_info "Node.js not found, skipping secret generation (will be done in Docker)"
fi

print_info "Step 7: Building and starting application..."
echo ""
echo "This may take several minutes on first run..."
docker-compose --profile production up -d --build

print_success "Application started successfully!"

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Your application is accessible at:"
echo "  → $PROTOCOL://$DOMAIN"
echo ""
echo "Health check:"
echo "  → $PROTOCOL://$DOMAIN/health"
echo ""
echo "Important Next Steps:"
echo "  1. Edit backend/.env and add your Appwrite credentials:"
echo "     - APPWRITE_PROJECT_ID"
echo "     - APPWRITE_API_KEY"
echo "     - APPWRITE_DATABASE_ID"
echo ""
echo "  2. If using Google OAuth, add your credentials:"
echo "     - GOOGLE_CLIENT_ID"
echo "     - GOOGLE_CLIENT_SECRET"
echo ""
if [ "$PROTOCOL" = "https" ]; then
    echo "  3. Setup SSL certificate:"
    echo "     docker-compose stop nginx"
    echo "     sudo apt install certbot -y"
    echo "     sudo certbot certonly --standalone -d $DOMAIN"
    echo "     mkdir -p ssl"
    echo "     sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/"
    echo "     sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/"
    echo "     sudo chmod 644 ssl/*.pem"
    echo "     # Then update nginx.conf to enable HTTPS"
    echo "     docker-compose --profile production up -d"
    echo ""
fi
echo "  4. Restart application after configuration changes:"
echo "     docker-compose restart"
echo ""
echo "Useful Commands:"
echo "  docker-compose logs -f           # View logs"
echo "  docker-compose ps                # Check status"
echo "  docker-compose restart           # Restart services"
echo "  docker-compose down              # Stop services"
echo "  docker stats                     # Resource usage"
echo ""
echo "======================================"

# Check if new Docker group membership requires re-login
if groups $USER | grep -q docker; then
    print_success "You're all set!"
else
    print_info "Note: You may need to log out and back in for Docker group changes to take effect."
fi
