#!/bin/bash

set -e

echo "🚀 Setting up Excalidraw Board development environment..."

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command npm
check_command docker
check_command docker-compose

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js $REQUIRED_VERSION or higher."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
else
    echo "⚠️  .env file already exists, skipping..."
fi

# Install dependencies
echo "📦 Installing dependencies..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ Dependencies installed"

# Create data directories
echo "📁 Creating data directories..."
mkdir -p backend/data/rooms
mkdir -p backend/data/files
echo "✅ Data directories created"

# Test Docker setup
echo "🐳 Testing Docker setup..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration is invalid"
    exit 1
fi

# Start services for verification
echo "🔄 Starting services for verification..."
docker-compose up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -sf http://localhost:3002 > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start within 30 seconds"
        docker-compose logs backend
        exit 1
    fi
    sleep 1
done

# Stop the test services
docker-compose down

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📖 Next steps:"
echo "  1. Start the development environment:"
echo "     npm run dev"
echo ""
echo "  2. Or start services individually:"
echo "     npm run dev:backend    # Start backend only"
echo "     npm run dev:frontend   # Start frontend only"
echo ""
echo "  3. Open your browser to:"
echo "     http://localhost:5173"
echo ""
echo "💡 Useful commands:"
echo "  npm run lint           # Run linting"
echo "  npm run typecheck      # Check TypeScript"
echo "  npm run test           # Run tests"
echo "  npm run clean          # Clean dependencies"
echo ""