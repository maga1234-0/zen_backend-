#!/bin/bash

# Setup script for Render deployment
echo "🚀 Setting up Hotel PMS Backend for Render deployment..."

# Check if we're in the server directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the server directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create a new GitHub repository for the backend"
echo "2. Push this directory to the new repository"
echo "3. Follow the deployment guide in DEPLOY_BACKEND_TO_RENDER.md"
echo ""
echo "🌐 Your backend will be available at: https://[your-service-name].onrender.com"
echo "🔧 API endpoints will be at: https://[your-service-name].onrender.com/api"