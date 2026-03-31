#!/bin/bash
# CuentaCorriente — Setup script
set -e

echo "🚀 Setting up CuentaCorriente..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

# Check for .env
if [ ! -f ".env" ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ .env created — please edit it with your configuration before continuing"
  echo ""
  echo "Required environment variables:"
  echo "  DATABASE_URL    — PostgreSQL connection string"
  echo "  NEXTAUTH_SECRET — Random secret (generate with: openssl rand -base64 32)"
  echo ""
  read -p "Press Enter once you've configured .env to continue, or Ctrl+C to stop..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "🗄️  Pushing schema to database..."
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start the development server:"
echo "  npm run dev"
echo ""
echo "Open: http://localhost:3000"
echo "Login with the email/password in your .env (ADMIN_EMAIL / ADMIN_PASSWORD)"
