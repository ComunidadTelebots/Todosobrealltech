#!/bin/bash

# PocketBase Setup Script
echo "🚀 Setting up PocketBase..."

# Download PocketBase if not already present
if [ ! -f "pocketbase" ]; then
    echo "📦 Downloading PocketBase..."
    
    # Detect OS and architecture
    OS=$(/usr/bin/uname -s | /usr/bin/tr '[:upper:]' '[:lower:]')
    ARCH=$(/usr/bin/uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    
    case $OS in
        darwin) OS="darwin" ;;
        linux) OS="linux" ;;
        *) echo "❌ Unsupported OS: $OS"; exit 1 ;;
    esac
    
    # Download the latest version
    VERSION=$(cat .pocketbase-version)
    DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${OS}_${ARCH}.zip"
    
    echo "📥 Downloading from: $DOWNLOAD_URL"
    curl -L -o pocketbase.zip "$DOWNLOAD_URL"
    
    # Extract
    /usr/bin/unzip pocketbase.zip
    /usr/bin/rm pocketbase.zip
    /usr/bin/rm CHANGELOG.md
    /usr/bin/rm LICENSE.md
    
    echo "✅ PocketBase downloaded successfully!"
else
    echo "✅ PocketBase already exists"
fi

echo "🎉 PocketBase setup complete!"
echo "💡 Run 'npm run dev:pocketbase' to start the development server"
echo "🌐 Admin UI will be available at: http://localhost:8090/_/"
