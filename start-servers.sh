#!/bin/bash

echo "🚀 Starting KanbanX Local Environment"
echo "====================================="
echo ""

# Check if backend is already running
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ Backend already running on port 3001"
else
    echo "🔧 Starting backend..."
    cd backend
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   Backend PID: $BACKEND_PID"
    cd ..
    sleep 3
fi

# Check if frontend is already running
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Frontend already running on port 5173"
else
    echo "🔧 Starting frontend..."
    cd frontend
    npx vite > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   Frontend PID: $FRONTEND_PID"
    cd ..
    sleep 3
fi

echo ""
echo "====================================="
echo "✅ KanbanX is running!"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📋 Login credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   ./stop-servers.sh"
echo "   or: lsof -ti:3001 | xargs kill && lsof -ti:5173 | xargs kill"
echo ""
