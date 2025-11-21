#!/bin/bash
# ALMANIK PMS SIMPLE - SETUP AUTOMÁTICO

echo "🏨 ALMANIK PMS ULTRA SIMPLE - SETUP"
echo "=================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
else
    echo "✅ PostgreSQL found"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first"
    exit 1
else
    echo "✅ Node.js found: $(node --version)"
fi

# Setup database
echo "📊 Setting up database..."
sudo -u postgres createdb almanik_simple 2>/dev/null || echo "Database already exists"
sudo -u postgres psql almanik_simple < database.sql

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "⚛️ Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "🚀 SETUP COMPLETED!"
echo "==================="
echo ""
echo "📊 To start the system:"
echo "1. Backend:  npm start"
echo "2. Frontend: cd frontend && npm start"
echo ""
echo "🌐 Access: http://localhost:3001"
echo "🔑 Login: admin / admin123"
echo ""
echo "💡 Read README-SIMPLE.md for full instructions"