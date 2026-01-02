#!/bin/bash

# Movie Mimic - Quick Start Script
# This script sets up and runs the application

set -e

echo "🎬 Movie Mimic - Quick Start"
echo "================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✓ npm version: $(npm -v)"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg is not installed"
    echo "Video processing will not work without FFmpeg"
    echo ""
    echo "Install FFmpeg:"
    echo "  Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
    echo ""
    read -p "Continue without FFmpeg? (y/N): " -n 1 -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ FFmpeg version: $(ffmpeg -version | head -1)"
fi

# Create .env if not exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
fi

# Create uploads directories
mkdir -p uploads/videos uploads/subtitles uploads/recordings uploads/exports uploads/thumbnails uploads/temp
mkdir -p data logs

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Starting application..."
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start both services
npm run dev
