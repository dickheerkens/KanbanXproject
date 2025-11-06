#!/bin/bash

# KanbanX API Testing Script
# This script demonstrates how to test all the KanbanX endpoints

API_BASE="http://localhost:3001/api"
HEALTH_URL="http://localhost:3001/health"

echo "🧪 KanbanX API Testing Guide"
echo "============================"
echo ""

# Check if server is running
echo "1. 📡 Testing server health..."
if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Server is running!"
    curl -s "$HEALTH_URL" | echo "Response: $(cat)"
else
    echo "❌ Server is not running. Please start it first:"
    echo "   cd backend && npm run dev"
    echo ""
    exit 1
fi

echo ""
echo "2. 🔐 Authentication Test"
echo "========================"
echo ""
echo "Login with default admin credentials:"
echo "curl -X POST $API_BASE/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\": \"admin\", \"password\": \"password\"}'"
echo ""

# Try login
echo "Attempting login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Login successful!"
    TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
    echo "🎫 JWT Token received (first 20 chars): ${TOKEN:0:20}..."
else
    echo "❌ Login failed. Response:"
    echo "$LOGIN_RESPONSE"
    echo ""
    echo "💡 Tip: Make sure the database is migrated:"
    echo "   cd backend && npm run migrate"
    exit 1
fi

echo ""
echo "3. 📋 Task Management Tests"
echo "=========================="
echo ""

if [ -n "$TOKEN" ]; then
    echo "Creating a test task..."
    CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/tasks" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "title": "Test API Task",
        "description": "Created via API test script",
        "service_class": "Linear",
        "ai_eligible": true,
        "tags": ["test", "api"]
      }')
    
    if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
        echo "✅ Task created successfully!"
        TASK_ID=$(echo "$CREATE_RESPONSE" | sed -n 's/.*"taskId":"\([^"]*\)".*/\1/p')
        echo "📝 Task ID: $TASK_ID"
    else
        echo "❌ Task creation failed:"
        echo "$CREATE_RESPONSE"
    fi
    
    echo ""
    echo "Getting all tasks (board view)..."
    TASKS_RESPONSE=$(curl -s -X GET "$API_BASE/tasks" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$TASKS_RESPONSE" | grep -q '"success":true'; then
        echo "✅ Tasks retrieved successfully!"
        echo "📊 Board summary:"
        echo "$TASKS_RESPONSE" | grep -o '"backlog":\[[^]]*\]' | head -1
    else
        echo "❌ Failed to get tasks:"
        echo "$TASKS_RESPONSE"
    fi
fi

echo ""
echo "4. 🤖 MCP Agent Endpoint Tests"
echo "============================="
echo ""
echo "Note: Agent endpoints require Bearer tokens generated for AI agents."
echo "Example agent endpoints:"
echo ""
echo "• Get available tasks for agents:"
echo "  curl -X GET $API_BASE/mcp/tasks/available \\"
echo "    -H 'Authorization: Bearer <agent-token>'"
echo ""
echo "• Claim a task:"
echo "  curl -X POST $API_BASE/mcp/tasks/<task-id>/claim \\"
echo "    -H 'Authorization: Bearer <agent-token>' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"duration_minutes\": 30}'"
echo ""

echo "5. 📚 Full API Documentation"
echo "============================"
echo ""
echo "All available endpoints:"
echo ""
echo "Authentication:"
echo "  POST   $API_BASE/auth/login      - User login"
echo "  POST   $API_BASE/auth/register   - Create user (admin only)"
echo "  GET    $API_BASE/auth/profile    - Get user profile"
echo "  PUT    $API_BASE/auth/profile    - Update user profile"
echo ""
echo "Task Management:"
echo "  GET    $API_BASE/tasks           - Get all tasks (board view)"
echo "  POST   $API_BASE/tasks           - Create new task"
echo "  PUT    $API_BASE/tasks/:id       - Update task"
echo "  PATCH  $API_BASE/tasks/:id/move  - Move task to different column"
echo ""
echo "MCP Agent Endpoints:"
echo "  GET    $API_BASE/mcp/tasks/available        - Get tasks for agents"
echo "  POST   $API_BASE/mcp/tasks/:id/claim        - Claim task"
echo "  POST   $API_BASE/mcp/tasks/:id/release      - Release task"
echo "  PATCH  $API_BASE/mcp/tasks/:id/status       - Update task status"
echo "  POST   $API_BASE/mcp/tasks/:id/comment      - Add comment"
echo "  GET    $API_BASE/mcp/tasks/:id              - Get task details"
echo "  POST   $API_BASE/mcp/tasks/:id/subtask      - Create subtask"
echo ""

echo "6. 🔧 Development Tools"
echo "======================"
echo ""
echo "Database management:"
echo "  npm run migrate    - Run database migrations"
echo "  npm run build      - Build TypeScript"
echo "  npm run dev        - Start development server"
echo ""
echo "Server URLs:"
echo "  Health check: $HEALTH_URL"
echo "  API base:     $API_BASE"
echo ""

echo "🎉 Testing complete! Your KanbanX backend is ready for:"
echo "   • Frontend integration"
echo "   • AI agent connections"
echo "   • Production deployment"