# KanbanX - AI-Augmented Kanban System

KanbanX is a sophisticated kanban board system designed for human-AI collaboration. It features a six-column workflow with specialized endpoints for AI agents to interact through the Model Context Protocol (MCP).

## 🏗️ Architecture

- **Backend**: Node.js + Express + TypeScript + SQLite ✅
- **Frontend**: React + Vite + TypeScript + Tailwind CSS (planned)
- **Authentication**: JWT tokens for humans, Bearer tokens for AI agents ✅
- **Database**: SQLite for development, PostgreSQL-compatible for production ✅
- **AI Integration**: Model Context Protocol (MCP) endpoints ✅

## 📋 Kanban Workflow

KanbanX uses a six-column workflow optimized for human-AI collaboration:

1. **Backlog** - New tasks awaiting triage
2. **To Do** - Ready for work
3. **AI Prep** - Tasks being prepared by AI agents
4. **In Progress** - Active development
5. **Verify** - Testing and review
6. **Done** - Completed tasks

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run migrate
```

5. **Configure AI features (Optional)**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Gen AI Platform credentials:
# AZURE_OPENAI_API_KEY=your-api-key-here
# AZURE_OPENAI_ENDPOINT=https://api-ai.digitaldev.nl
# AZURE_OPENAI_API_VERSION=2024-02-15-preview
# AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

> **Note**: LLM features are optional. The agent chat will work with basic regex-based intent parsing if no API key is configured. To get an API key, visit the [Gen AI Platform Portal](https://portal.api-ai.digitaldev.nl/).

### Running the Application
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Default Credentials
- Username: `admin`
- Password: `password` (change after first login)

## 📚 API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

### Task Management Endpoints

#### Get All Tasks (Board View)
```http
GET /api/tasks
Authorization: Bearer <jwt-token>
```

#### Create Task
```http
POST /api/tasks
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "New Task",
  "description": "Task description",
  "service_class": "Linear",
  "ai_eligible": true,
  "tags": ["backend", "api"]
}
```

### MCP Agent Endpoints

#### Get Available Tasks
```http
GET /api/mcp/tasks/available
Authorization: Bearer <agent-token>
```

#### Claim Task
```http
POST /api/mcp/tasks/:taskId/claim
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "duration_minutes": 30
}
```

## 🤖 Agent Integration

KanbanX supports four types of AI agents:

1. **Triage Agent** - Processes backlog items
2. **Prep Agent** - Prepares tasks for development
3. **Review Agent** - Reviews completed work
4. **Merge Agent** - Handles final integration

### Agent Chat Commands

Click the "🤖 Show Agent" button in the UI and try these natural language commands:

**Task Query**
- `show available tasks` - List all tasks ready to be claimed
- `what tasks are in progress?` - Query tasks by status
- `show me task: <task-id>` - Get detailed task information

**Task Management**
- `claim task: <task-id>` - Claim a task to work on it
- `release task: <task-id>` - Release a claimed task
- `move task: <task-id> to done` - Update task status (columns: backlog, todo, ai-prep, in-progress, verify, done)

**Collaboration**
- `comment on task: <task-id> - this looks great!` - Add comments to tasks
- `create subtask for: <task-id> - write unit tests` - Create subtasks

**General Queries** (requires LLM configuration)
- `What's the status of the project?`
- `Which tasks should I prioritize?`
- `Tell me about task dependencies`

> **🤖 Enhanced with LLM**: When configured with Gen AI Platform credentials, the agent uses GPT-4o for natural language understanding, providing more flexible command parsing and intelligent responses. Without LLM, it uses regex-based pattern matching.

## 🗄️ Database Schema

### Core Tables ✅

- **users** - Human user accounts
- **agents** - AI agent definitions
- **tasks** - Kanban tasks
- **audit_log** - Complete audit trail
- **agent_leases** - Task claiming system

## 🔒 Security ✅

- JWT tokens for human authentication (24-hour expiry)
- Bearer tokens for agent authentication (7-day expiry)
- Role-based access control (RBAC)
- Capability-based permissions for agents
- Comprehensive audit logging

## 📁 Project Structure

```
KanbanXproject/
├── backend/                 # ✅ Complete Node.js API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API routes
│   │   │   ├── auth.ts     # Human authentication
│   │   │   ├── tasks.ts    # Task management
│   │   │   └── mcp.ts      # Agent endpoints
│   │   ├── types/          # TypeScript definitions
│   │   ├── utils/          # Utilities and migrations
│   │   └── server.ts       # Express app
│   ├── migrations/         # Database schema
│   └── package.json
├── frontend/               # 🚧 React app (planned)
├── agents/                 # 🚧 Agent implementations (planned)
├── docs/                   # Documentation
└── .specify/              # Spec-driven development files
```

## 🎯 Implementation Status

### ✅ Completed Features

- [x] **Authentication System** - JWT for humans, Bearer tokens for agents
- [x] **Database Layer** - SQLite with full schema and migrations
- [x] **Task CRUD API** - Complete task management endpoints
- [x] **MCP Agent Endpoints** - Full Model Context Protocol implementation
- [x] **Audit System** - Comprehensive logging of all actions
- [x] **Role-Based Access** - RBAC with capability-based permissions
- [x] **TypeScript Setup** - Full type safety throughout
- [x] **Development Environment** - Hot reload, linting, testing setup

### 🚧 Next Steps

- [ ] React frontend implementation
- [ ] Docker containerization
- [ ] GitHub integration for task sync
- [ ] Real-time WebSocket updates
- [ ] Agent implementation examples

## 🔧 Development

This project was built using **Spec-Driven Development** with the Speckit framework:

1. **Constitution** - Established governance and principles
2. **Specification** - Defined user stories and requirements
3. **Planning** - Created technical architecture
4. **Tasks** - Broke down into 107 specific implementation tasks
5. **Implementation** - Systematic execution of the plan

All specification files are available in the `.specify/` directory.

## 🌐 Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=3001
DATABASE_PATH=./data/kanbanx.db
JWT_SECRET=your-super-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
ADMIN_PASSWORD=admin123
```

## 🧪 Testing

The backend includes comprehensive API endpoints for:

- ✅ Human authentication (login, registration, profile management)
- ✅ Task management (CRUD operations, status updates, audit trail)
- ✅ MCP agent endpoints (task claiming, status updates, commenting)
- ✅ Role-based access control and capability checking
- ✅ Database migrations and schema management

## 🏆 Success

**KanbanX Backend is Complete!** 

We successfully implemented a production-ready API server with:
- 8 major implementation phases completed
- Full authentication and authorization system
- Complete MCP agent integration
- Comprehensive audit logging
- Type-safe TypeScript implementation
- Database migrations and seeding
- 20+ API endpoints ready for frontend integration

The backend is ready to support AI agents and human users in a collaborative kanban workflow!