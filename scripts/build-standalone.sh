#!/bin/bash
set -e

VERSION=$(node -p "require('./package.json').version")
echo "🚀 Building OpenTicket Standalone Release v$VERSION..."

# 1. Clean previous builds
rm -rf .next
rm -rf release-standalone

# 2. Build Next.js
echo "📦 Running Next.js Build..."
npm run build

# 3. Prepare Standalone Directory
echo "📂 Preparing standalone artifacts..."
mkdir -p release-standalone/openticket
cp -r .next.nosync/standalone/* release-standalone/openticket/

# Copy static assets (standalone doesn't copy these by default)
cp -r public release-standalone/openticket/
mkdir -p release-standalone/openticket/.next/static
cp -r .next.nosync/static/* release-standalone/openticket/.next/static/

# Copy Prisma schema and engine for DB migrations
cp -r prisma release-standalone/openticket/
# Ensure package.json is there to run prisma commands
cp package.json release-standalone/openticket/

# 4. Compress
echo "🗜️ Compressing standalone package..."
cd release-standalone
tar -czvf openticket-standalone-v$VERSION.tar.gz openticket/
cd ..

echo "✅ Standalone package created at: release-standalone/openticket-standalone-v$VERSION.tar.gz"
echo ""
echo "📝 Instructions for users to run this package:"
echo "1. tar -xzvf openticket-standalone-v$VERSION.tar.gz"
echo "2. cd openticket"
echo "3. npm install prisma --no-save (If they need to migrate DB)"
echo "4. npx prisma migrate deploy"
echo "5. node server.js"
