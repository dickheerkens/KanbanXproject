# 🧪 KanbanX API Testing Guide

Your KanbanX backend is complete and ready to test! Here are all the ways you can test and interact with it:

## 🚀 Start the Server

First, make sure the server is running:

```bash
cd backend
npm run dev
```

You should see:
```
🚀 KanbanX API server running on port 3001
📊 Health check: http://localhost:3001/health
```

## 🎯 Testing Options

### 1. **Quick Test Script** (Recommended)

I've created a comprehensive test script for you:

```bash
# Run the automated test script
./test-api.sh
```

This script will:
- ✅ Check server health
- 🔐 Test admin login
- 📋 Create and retrieve tasks  
- 🤖 Show MCP agent endpoints
- 📚 Display full API documentation

### 2. **Manual cURL Testing**

#### Test Health Endpoint
```bash
curl http://localhost:3001/health
```

#### Login as Admin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

#### Create a Task (use token from login)
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My First Task",
    "description": "Testing the API",
    "service_class": "Linear",
    "ai_eligible": true,
    "tags": ["test"]
  }'
```

#### Get All Tasks (Board View)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/tasks
```

### 3. **Postman/Insomnia Testing**

Import these endpoints into Postman or Insomnia:

**Base URL**: `http://localhost:3001/api`

**Collections**:
- Authentication: `/auth/login`, `/auth/register`, `/auth/profile`
- Tasks: `/tasks` (GET, POST, PUT, PATCH)
- MCP Agents: `/mcp/tasks/*` (various endpoints)

### 4. **Browser Testing**

You can test some endpoints directly in the browser:

- **Health Check**: http://localhost:3001/health
- **API Endpoints**: Use browser dev tools or extensions like REST Client

### 5. **Database Inspection**

Check what's in your database:

```bash
cd backend
sqlite3 data/kanbanx.db

# SQLite commands:
.tables                 # Show all tables
SELECT * FROM users;    # See all users
SELECT * FROM tasks;    # See all tasks
SELECT * FROM audit_log; # See audit trail
.quit                   # Exit SQLite
```

## 🔐 Default Test Credentials

The system comes with pre-seeded data:

**Admin User**:
- Username: `admin`
- Password: `password`

**Sample Users** (from migration):
- Username: `alice`, Password: `password`  
- Username: `bob`, Password: `password`

**Sample Tasks**: The database includes 4 pre-created tasks in different statuses

## 🤖 Testing AI Agent Endpoints

For MCP agent endpoints, you'll need to generate agent tokens. Here's how:

1. **In Node.js console** (while server is running):
```javascript
// Connect to running server via another terminal
node -e "
const { AuthService } = require('./dist/middleware/auth');
const authService = AuthService.getInstance();
const token = authService.generateAgentToken({
  id: 'test-agent-001',
  role: 'prep',
  capabilities: ['query_tasks', 'claim_task', 'move', 'comment']
});
console.log('Agent Token:', token);
"
```

2. **Use the agent token** to test MCP endpoints:
```bash
curl -H "Authorization: Bearer AGENT_TOKEN" \
  http://localhost:3001/api/mcp/tasks/available
```

## 📊 Expected Response Formats

### Successful Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description"
}
```

### Board View Response
```json
{
  "success": true,
  "data": {
    "backlog": [...],
    "todo": [...],
    "ai_prep": [...],
    "in_progress": [...],
    "verify": [...],
    "done": [...]
  }
}
```

## 🔍 Monitoring & Debugging

### Server Logs
The server logs all requests and errors. Watch the terminal where you started the server.

### Database Audit Trail
Every action is logged in the `audit_log` table:
```sql
SELECT actor_type, actor_id, action, note, timestamp 
FROM audit_log 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Health Monitoring
- **Health Endpoint**: http://localhost:3001/health
- **Status Codes**: 200 (OK), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)

## 🎉 What You Can Test

### ✅ Completed Features Ready for Testing:

1. **User Authentication & Authorization**
   - Login/logout with JWT tokens
   - Role-based access (user/admin)
   - Profile management

2. **Task Management**
   - Create, read, update tasks
   - Six-column kanban board view
   - Task status transitions
   - Service class categorization

3. **AI Agent Integration**
   - Agent authentication with Bearer tokens
   - Task discovery and filtering
   - Task claiming with lease system
   - Status updates and comments
   - Subtask creation

4. **Security & Compliance**
   - RBAC and capability checking
   - Comprehensive audit trail
   - Input validation and sanitization

5. **Database Operations**
   - CRUD operations with transactions
   - Migration system
   - Seed data

## 🚀 Next Steps

After testing the API, you can:

1. **Build a Frontend** - React app that consumes these endpoints
2. **Create AI Agents** - Implement agents that use the MCP endpoints
3. **Deploy to Production** - The backend is production-ready
4. **Extend Features** - Add more capabilities using the solid foundation

Your KanbanX backend is **fully functional and ready for integration**! 🎉