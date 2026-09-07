#!/bin/bash
# Publiora Production Deployment Script
# Run this on VPS: root@43.228.213.148

set -e  # Exit on error

echo "======================================"
echo "PUBLIORA PRODUCTION DEPLOYMENT"
echo "Target: qluqhyfwpdknngxolsvi.supabase.co"
echo "======================================"
echo ""

# Navigate to deployment directory
cd /opt/publiora || { echo "❌ Cannot cd /opt/publiora"; exit 1; }

# 1. Pull latest code
echo "📦 Pulling latest code from git..."
git pull origin master

# 2. Verify environment variables
echo ""
echo "🔐 Verifying environment configuration..."
if [ ! -f .env.production ]; then
  echo "⚠️  Warning: .env.production not found at /opt/publiora/"
  echo "   Make sure PayCore secrets are configured!"
fi

# Check Supabase URL
if grep -q "qluqhyfwpdknngxolsvi" .env.production; then
  echo "✅ Using correct production Supabase project"
else
  echo "❌ ERROR: Not pointing to production Supabase!"
  echo "   Expected: qluqhyfwpdknngxolsvi.supabase.co"
  exit 1
fi

# 3. Build Docker image
echo ""
echo "🏗️  Building Next.js production image..."
docker build -t publiora-web:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://qluqhyfwpdknngxolsvi.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  --build-arg NEXT_PUBLIC_USE_MOCK_API=false \
  --build-arg NEXT_PUBLIC_DEMO_LOGIN=false \
  --build-arg NEXT_PUBLIC_MARKETING_URL="https://publiora.biz.id" \
  --build-arg NEXT_PUBLIC_APP_URL="https://app.publiora.biz.id" \
  --build-arg NEXT_PUBLIC_READER_URL="https://baca.publiora.biz.id" \
  -f Dockerfile .

# 4. Stop and remove old container
echo ""
echo "🛑 Stopping old container..."
docker stop publiora-web 2>/dev/null || true
docker rm publiora-web 2>/dev/null || true

# 5. Start new container
echo "🚀 Starting NEW container with PR #4 migrations..."
docker run -d \
  --name publiora-web \
  --network wacrm_edge \
  -p 5300:5300 \
  --restart unless-stopped \
  publiora-web:latest

# Give it a moment to start
sleep 5

# 6. Health check
echo ""
echo "🏥 Running health checks..."

# Check container is running
if docker ps | grep -q "publiora-web"; then
  echo "✅ Container started successfully"
else
  echo "❌ Container failed to start!"
  docker logs publiora-web --tail 50
  exit 1
fi

# Wait for server readiness
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
  if curl -sk https://localhost:5300 > /dev/null 2>&1; then
    echo "✅ Server responding at port 5300"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Server did not respond within 30 seconds"
    docker logs publiora-web --tail 100
    exit 1
  fi
  sleep 1
done

# Test HTTPS endpoints
echo ""
echo "🌐 Testing production endpoints..."
ENDPOINTS=(
  "https://publiora.biz.id"
  "https://app.publiora.biz.id/login"
  "https://baca.publiora.biz.id"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo -n "Testing $endpoint... "
  response=$(curl -skL -w "%{http_code}" -o /dev/null "$endpoint" 2>/dev/null)
  if [ "$response" = "200" ]; then
    echo "✅ HTTP 200"
  else
    echo "⚠️  Response: $response (might need DNS propagation)"
  fi
done

# 7. Log tail for monitoring
echo ""
echo "📋 Application logs (last 20 lines):"
docker logs --tail 20 publiora-web

echo ""
echo "======================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "======================================"
echo ""
echo "Service running at:"
echo "  • Main:    https://publiora.biz.id"
echo "  • App:     https://app.publiora.biz.id"
echo "  • Reader:  https://baca.publiora.biz.id"
echo ""
echo "Monitor logs: docker logs -f publiora-web"
echo "Restart:      docker restart publiora-web"
echo "Rollback:     git checkout <previous-commit> && re-run script"
echo ""
