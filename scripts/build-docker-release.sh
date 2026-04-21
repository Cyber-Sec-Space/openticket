#!/bin/bash
set -e

VERSION=$(grep '"version"' package.json | sed -E 's/.*"([^"]+)".*/\1/')
echo "🐳 Building OpenTicket Docker Source Archive v$VERSION..."

# Prepare Output Directory
mkdir -p release-docker

# Provide an output path
OUTPUT_FILE="release-docker/openticket-docker-v$VERSION.tar.gz"

echo "📦 Running git archive to extract pure source without build caches/secrets..."
git archive --format=tar.gz --prefix=openticket/ -o "$OUTPUT_FILE" HEAD

echo "✅ Docker Clean Source Archive created at: $OUTPUT_FILE"
echo ""
echo "📝 Instructions for operations to deploying this package:"
echo "1. tar -xzvf openticket-docker-v$VERSION.tar.gz"
echo "2. cd openticket"
echo "3. cp .env.example .env (Edit the secrets inside)"
echo "4. docker-compose up -d --build"
