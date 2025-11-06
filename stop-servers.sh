#!/bin/bash

echo "🛑 Stopping KanbanX Local Environment"
echo "====================================="
echo ""

# Stop backend (port 3001)
if lsof -ti:3001 > /dev/null 2>&1; then
    echo "Stopping backend..."
    lsof -ti:3001 | xargs kill
    echo "✅ Backend stopped"
else
    echo "⚠️  Backend not running"
fi

# Stop frontend (port 5173)
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "Stopping frontend..."
    lsof -ti:5173 | xargs kill
    echo "✅ Frontend stopped"
else
    echo "⚠️  Frontend not running"
fi

echo ""
echo "====================================="
echo "✅ All servers stopped"
