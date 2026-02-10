#!/bin/bash

# marronMerge Setup Script for Linux/Mac

echo ""
echo "╔════════════════════════════════════╗"
echo "║   marronMerge Setup Script         ║"
echo "║   PDF Merger Build Setup           ║"
echo "╚════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please download and install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found:"
node --version

echo ""
echo "⏳ Installing backend dependencies..."
cd backend
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "   1. Run the server:"
echo "      npm start"
echo ""
echo "   2. Open in browser:"
echo "      http://localhost:3000"
echo ""
echo "   3. See QUICKSTART.md for more info"
echo ""
