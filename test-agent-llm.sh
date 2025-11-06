#!/bin/bash

# Test LLM Integration for KanbanX
# This script tests the agent chat endpoint with and without LLM

echo "🧪 Testing KanbanX Agent Chat with LLM Integration"
echo "=================================================="
echo ""

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "❌ Backend is not running on port 3001"
    echo "   Start it with: cd backend && npm run dev"
    exit 1
fi

echo "✅ Backend is running"
echo ""

# Login and get token
echo "🔑 Logging in..."
TOKEN=$(curl -s http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"password"}' | \
    grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Test 1: Simple command (works with or without LLM)
echo "📝 Test 1: Basic command - 'show available tasks'"
echo "---"
RESPONSE1=$(curl -s http://localhost:3001/api/agent/chat \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"show available tasks"}')

echo "$RESPONSE1" | jq -r '.data.content'
echo ""
echo "Actions:"
echo "$RESPONSE1" | jq -r '.data.actions[0] | "  Type: \(.type)\n  Endpoint: \(.endpoint)\n  Method: \(.method)"'
echo ""

# Test 2: Natural language command (enhanced with LLM)
echo "📝 Test 2: Natural language - 'what tasks can I work on?'"
echo "---"
RESPONSE2=$(curl -s http://localhost:3001/api/agent/chat \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"what tasks can I work on?"}')

echo "$RESPONSE2" | jq -r '.data.content'
echo ""

# Test 3: General query (requires LLM)
echo "📝 Test 3: General query - 'how does this system work?'"
echo "---"
RESPONSE3=$(curl -s http://localhost:3001/api/agent/chat \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"how does this kanban system work?"}')

echo "$RESPONSE3" | jq -r '.data.content'
echo ""

# Check if LLM is configured
echo "🔍 Checking LLM Configuration..."
if grep -q "AZURE_OPENAI_API_KEY=your-api-key-here" backend/.env 2>/dev/null || \
   ! grep -q "AZURE_OPENAI_API_KEY=" backend/.env 2>/dev/null; then
    echo "⚠️  LLM not configured - using regex fallback"
    echo "   To enable LLM features:"
    echo "   1. Copy backend/.env.example to backend/.env"
    echo "   2. Add your Gen AI Platform API key"
    echo "   3. Restart the backend"
else
    echo "✅ LLM is configured"
fi

echo ""
echo "=================================================="
echo "✅ All tests completed!"
echo ""
echo "💡 Tips:"
echo "   - Commands work without LLM using regex patterns"
echo "   - With LLM, responses are more natural and flexible"
echo "   - See GEN_AI_SETUP.md for setup instructions"
