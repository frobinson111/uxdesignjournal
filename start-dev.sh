#!/bin/bash

# Kill any existing processes on ports 4000 and 3001
echo "Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

# Start backend (PORT=4000 matches backend/.env and frontend .env.local proxy)
echo "Starting backend on port 4000..."
cd "/Users/frankrobinson/Desktop/UX Design Journal/desktop app website files/backend"
node index.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend failed to start!"
    exit 1
fi

echo "Backend started with PID $BACKEND_PID"

# Start frontend
echo "Starting frontend on port 3001..."
cd "/Users/frankrobinson/Desktop/UX Design Journal/desktop app website files/ux-design-journal"
PORT=3001 npm run dev &
FRONTEND_PID=$!

echo "Frontend started with PID $FRONTEND_PID"
echo ""
echo "======================================"
echo "Both servers running!"
echo "Backend:  http://localhost:4000"
echo "Frontend: http://localhost:3001"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for either process to exit
wait
