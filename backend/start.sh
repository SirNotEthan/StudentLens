#!/bin/bash

echo "=========================================="
echo "Starting StudentLens Backend Server"
echo "=========================================="
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo "Working Directory: $(pwd)"
echo "PORT Environment Variable: ${PORT:-'Not set (will use 5000)'}"
echo "NODE_ENV: ${NODE_ENV:-'Not set'}"
echo "=========================================="
echo ""

# Check if server.js exists
if [ ! -f "dist/server.js" ]; then
  echo "❌ ERROR: dist/server.js not found!"
  echo "Current directory contents:"
  ls -la
  exit 1
fi

# Check if frontend files exist
if [ ! -f "dist/public/index.html" ]; then
  echo "⚠️  WARNING: Frontend files not found in dist/public/"
  echo "Server will start but frontend may not work"
fi

echo "🚀 Starting server..."
node dist/server.js
