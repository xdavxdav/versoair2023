#!/bin/bash
# 🚀 Verso Air Production Deployment Script
# This script automates the production deployment process

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Main deployment script
main() {
    echo ""
    echo "=================================="
    echo "🚀 VERSO AIR PRODUCTION DEPLOYMENT"
    echo "=================================="
    echo ""

    # Step 1: Check prerequisites
    echo "Step 1: Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_info "Node.js $(node --version) found"

    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_info "npm $(npm --version) found"

    # Step 2: Check .env file
    echo ""
    echo "Step 2: Checking environment configuration..."
    
    if [ ! -f .env ]; then
        log_warn ".env file not found"
        echo "Creating .env from template..."
        if [ -f .env.production.template ]; then
            cp .env.production.template .env
            log_info ".env created from template"
            log_warn "Please update .env with your production values before proceeding"
            exit 1
        else
            log_error ".env.production.template not found"
            exit 1
        fi
    else
        log_info ".env file exists"
    fi

    # Step 3: Check for production secrets
    if grep -q "GENERATE_NEW_RANDOM_VALUE" .env; then
        log_error "Production secrets not set in .env"
        log_warn "Please set SESSION_SECRET and JWT_SECRET with: openssl rand -hex 32"
        exit 1
    fi
    log_info "Production secrets appear to be configured"

    # Step 4: Install dependencies
    echo ""
    echo "Step 3: Installing dependencies..."
    if [ -d "node_modules" ]; then
        log_info "node_modules already exists, skipping npm install"
    else
        log_info "Running npm install..."
        npm install
    fi

    # Step 5: TypeScript check
    echo ""
    echo "Step 4: Running TypeScript type check..."
    if npm run check 2>&1 | grep -q "error"; then
        log_error "TypeScript compilation errors detected"
        npm run check
        exit 1
    fi
    log_info "TypeScript check passed"

    # Step 6: Build production bundle
    echo ""
    echo "Step 5: Building production bundle..."
    log_info "This may take a minute..."
    if npm run build; then
        log_info "Production build completed successfully"
    else
        log_error "Build failed"
        exit 1
    fi

    # Step 7: Verify build output
    echo ""
    echo "Step 6: Verifying build output..."
    if [ -f "dist/index.js" ]; then
        log_info "Backend bundle: dist/index.js ($(du -h dist/index.js | cut -f1))"
    else
        log_error "Backend bundle not found"
        exit 1
    fi

    if [ -f "dist/public/index.html" ]; then
        log_info "Frontend bundle: dist/public/index.html"
    else
        log_error "Frontend bundle not found"
        exit 1
    fi

    # Step 8: Database check
    echo ""
    echo "Step 7: Verifying database configuration..."
    if grep -q "DATABASE_URL" .env; then
        log_info "DATABASE_URL is configured"
    else
        log_error "DATABASE_URL not found in .env"
        exit 1
    fi

    # Step 9: Summary
    echo ""
    echo "=================================="
    echo "✅ DEPLOYMENT PREPARATION COMPLETE"
    echo "=================================="
    echo ""
    echo "Build artifacts ready in: dist/"
    echo ""
    echo "Next steps:"
    echo "1. Transfer dist/ folder to your production server"
    echo "2. Copy .env file to production server (securely)"
    echo "3. Run: NODE_ENV=production node dist/index.js"
    echo ""
    echo "Or with PM2:"
    echo "  pm2 start dist/index.js --name 'verso-air'"
    echo "  pm2 startup"
    echo "  pm2 save"
    echo ""
    echo "Or with Docker:"
    echo "  docker build -t verso-air:latest ."
    echo "  docker run -e DATABASE_URL=... -p 5003:5003 verso-air:latest"
    echo ""
    echo "For detailed instructions, see PRODUCTION_READY_DEPLOYMENT.md"
    echo ""
}

# Run main function
main

exit 0
