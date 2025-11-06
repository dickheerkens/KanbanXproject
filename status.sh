#!/bin/bash

echo "📊 KanbanX Status Check"
echo "======================="
echo ""

# Check Backend
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ Backend: RUNNING (port 3001)"
    BACKEND_STATUS=$(curl -s http://localhost:3001/health 2>&1)
    if [[ $BACKEND_STATUS == *"status"* ]]; then
        echo "   Health: OK"
        echo "   URL: http://localhost:3001"
    else
        echo "   Health: ERROR - not responding properly"
    fi
else
    echo "❌ Backend: NOT RUNNING"
    echo "   Start with: cd backend && npm run dev"
fi

echo ""

# Check Frontend
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Frontend: RUNNING (port 5173)"
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>&1)
    if [[ $FRONTEND_STATUS == "200" ]]; then
        echo "   Health: OK"
        echo "   URL: http://localhost:5173"
    else
        echo "   Health: ERROR - HTTP $FRONTEND_STATUS"
    fi
else
    echo "❌ Frontend: NOT RUNNING"
    echo "   Start with: cd frontend && npx vite"
fi

echo ""

# Check Database
if [ -f "backend/data/kanbanx.db" ]; then
    DB_SIZE=$(du -h backend/data/kanbanx.db | cut -f1)
    echo "✅ Database: EXISTS"
    echo "   Location: backend/data/kanbanx.db"
    echo "   Size: $DB_SIZE"
else
    echo "❌ Database: NOT FOUND"
    echo "   Initialize with: cd backend && npm run migrate"
fi

echo ""
echo "======================="
echo ""

# Quick start instructions
if ! lsof -i :3001 > /dev/null 2>&1 || ! lsof -i :5173 > /dev/null 2>&1; then
    echo "💡 Quick Start:"
    echo "   ./start-servers.sh"
    echo ""
fi
