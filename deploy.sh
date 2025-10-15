#!/bin/bash
set -e

echo "🚀 Starting StudentLens Production Deployment"

# Check if required environment variables are set
if [ -z "$APPWRITE_PROJECT_ID" ] || [ -z "$APPWRITE_API_KEY" ]; then
    echo "❌ Error: Required environment variables not set"
    echo "Please set APPWRITE_PROJECT_ID and APPWRITE_API_KEY"
    exit 1
fi

# Build for production
echo "📦 Building application for production..."
npm run build
cd backend && npm run build && cd ..

# Create production environment file
echo "⚙️ Creating production environment configuration..."
cat > backend/.env.production << EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
SESSION_SECRET=${SESSION_SECRET:-$(openssl rand -base64 32)}
APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT:-https:
APPWRITE_PROJECT_ID=${APPWRITE_PROJECT_ID}
APPWRITE_API_KEY=${APPWRITE_API_KEY}
APPWRITE_DATABASE_ID=${APPWRITE_DATABASE_ID:-main}
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_POSTS_COLLECTION_ID=posts
APPWRITE_COMMENTS_COLLECTION_ID=comments
APPWRITE_BOOKMARKS_COLLECTION_ID=bookmarks
APPWRITE_APPLICATIONS_COLLECTION_ID=writer_applications
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
CLIENT_URL=${CLIENT_URL:-http:
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=5242880
LOG_FILE_MAX_FILES=5
EOF

# Build and start production containers
echo "🐳 Building and starting Docker containers..."
docker-compose --profile production up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Performing health check..."
if curl -f http:
    echo "✅ Health check passed!"
    echo "🎉 StudentLens is now running in production mode!"
    echo "📍 Access your application at: http:
    echo "📊 API Health: http:
else
    echo "❌ Health check failed!"
    echo "📋 Checking container logs..."
    docker-compose logs app
    exit 1
fi

# Show running containers
echo "📋 Running containers:"
docker-compose ps

echo "🔧 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo "🔄 To restart: docker-compose restart"