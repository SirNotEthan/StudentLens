#!/bin/bash
set -e  # Exit on error

echo "=========================================="
echo "Starting StudentLens Build Process"
echo "=========================================="

# Build Frontend
echo ""
echo "📦 Step 1: Building Frontend..."
echo "=========================================="
npm ci
npm run build

if [ ! -d "dist" ]; then
  echo "❌ ERROR: Frontend build failed - dist directory not found"
  exit 1
fi

echo "✅ Frontend build complete!"
echo "   Frontend files located in: dist/"
ls -lh dist/ | head -10

# Build Backend
echo ""
echo "📦 Step 2: Building Backend..."
echo "=========================================="
cd backend
npm ci
npm run build

if [ ! -d "dist" ]; then
  echo "❌ ERROR: Backend build failed - dist directory not found"
  exit 1
fi

echo "✅ Backend build complete!"
echo "   Backend files located in: backend/dist/"
ls -lh dist/ | head -10

# Copy Frontend to Backend
echo ""
echo "📦 Step 3: Copying Frontend to Backend..."
echo "=========================================="
mkdir -p dist/public
cp -rv ../dist/* dist/public/

if [ ! -f "dist/public/index.html" ]; then
  echo "❌ ERROR: Frontend copy failed - index.html not found in backend/dist/public"
  exit 1
fi

echo "✅ Frontend files copied to backend/dist/public!"
echo "   Files in backend/dist/public:"
ls -lh dist/public/ | head -10

# Verify Build
echo ""
echo "=========================================="
echo "📋 Build Verification"
echo "=========================================="
echo "✅ Backend server: backend/dist/server.js"
echo "✅ Frontend app: backend/dist/public/index.html"
echo ""
echo "🎉 Build Complete!"
echo "=========================================="
