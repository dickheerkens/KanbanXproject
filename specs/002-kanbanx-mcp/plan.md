# Technical Implementation Plan: KanbanX AI-Augmented Kanban System

## Stack Decisions

### Backend Technology
- **Framework**: Node.js + Express (team familiarity, extensive ecosystem)
- **Language**: TypeScript (type safety, better developer experience)
- **Database**: SQLite for development, PostgreSQL-compatible schema for production
- **Authentication**: JWT tokens for humans, Bearer tokens for agents
- **API Documentation**: OpenAPI v3 for both `/api/*` and `/mcp/*` endpoints
- **Real-time**: Server-Sent Events (SSE) for board updates

### Frontend Technology
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development, optimized builds)
- **Styling**: Tailwind CSS (utility-first, consistent design system)
- **State Management**: React Context + useReducer (avoid complexity of Redux for MVP)
- **HTTP Client**: Fetch API with custom wrapper for error handling

### Development Environment
- **Containerization**: Docker Compose for local development
- **Database**: SQLite volume mount for persistence
- **Process Management**: Nodemon for backend hot reload
- **Package Management**: npm workspaces for monorepo structure

### Agent Framework
- **Placeholder Architecture**: Simple REST clients in Python and Node.js
- **Authentication**: Bearer token-based with role scoping
- **Future Migration**: LangGraph-compatible interface design
- **Orchestration**: Lease-based task claiming with timeout mechanisms

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │────│  Express Backend │────│   SQLite DB     │
│   (Port 5173)   │    │   (Port 3000)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ├── /api/*     (Human UI endpoints)
                              ├── /mcp/*     (Agent MCP endpoints)
                              └── /webhooks/* (GitHub/CI integration)
                              
┌─────────────────┐    ┌──────────────────┐
│  Agent Stubs    │────│   MCP Endpoints  │
│  (Python/Node)  │    │   (Auth + RBAC)  │
└─────────────────┘    └──────────────────┘
```

## Database Schema Design

### Core Tables
```sql
-- Users (Human actors)
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- uuid v4
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,   -- bcrypt
  role TEXT DEFAULT 'user',     -- user, admin
  created_at TEXT NOT NULL,     -- ISO 8601
  updated_at TEXT NOT NULL
);

-- Agents (AI actors)
CREATE TABLE agents (
  id TEXT PRIMARY KEY,           -- uuid v4
  name TEXT NOT NULL,
  role TEXT NOT NULL,           -- triage, prep, review, merge
  token_hash TEXT NOT NULL,     -- hashed bearer token
  capabilities TEXT NOT NULL,    -- JSON array of allowed actions
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_active TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Tasks (Core work items)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,           -- uuid v4
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,         -- backlog, todo, ai_prep, in_progress, verify, done
  owner_type TEXT,              -- Human, Agent
  owner_id TEXT,                -- references users.id or agents.id
  service_class TEXT NOT NULL,  -- Linear, Intangible, MustDoNow, FixedDate
  ai_eligible BOOLEAN DEFAULT false,
  tags TEXT,                    -- JSON array
  links TEXT,                   -- JSON array of URLs
  parent_task_id TEXT,          -- for subtasks
  created_by TEXT NOT NULL,     -- references users.id
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);

-- Audit Trail (Immutable log)
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  actor_type TEXT NOT NULL,     -- Human, Agent
  actor_id TEXT NOT NULL,       -- user or agent id
  action TEXT NOT NULL,         -- create, update, move, comment, assign
  before_state TEXT,            -- JSON snapshot
  after_state TEXT,             -- JSON snapshot
  note TEXT,                    -- optional human-readable note
  timestamp TEXT NOT NULL,      -- ISO 8601
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Agent Leases (Task claiming)
CREATE TABLE agent_leases (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  released_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

### Indexes for Performance
```sql
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_owner ON tasks(owner_type, owner_id);
CREATE INDEX idx_tasks_ai_eligible ON tasks(ai_eligible);
CREATE INDEX idx_audit_task_id ON audit(task_id);
CREATE INDEX idx_audit_timestamp ON audit(timestamp);
CREATE INDEX idx_agent_leases_expires ON agent_leases(expires_at);
```

## API Design

### Human UI Endpoints (`/api/*`)
```
GET    /api/tasks              # List tasks with filters
POST   /api/tasks              # Create new task
GET    /api/tasks/:id          # Get task details
PUT    /api/tasks/:id          # Update task
DELETE /api/tasks/:id          # Delete task
POST   /api/tasks/:id/move     # Move task to new status
POST   /api/tasks/:id/comment  # Add comment (stored in audit)
GET    /api/tasks/:id/audit    # Get task audit history

GET    /api/board              # Get complete board state
GET    /api/board/stream       # SSE endpoint for real-time updates

POST   /api/auth/login         # Human authentication
POST   /api/auth/logout        # Invalidate JWT
GET    /api/auth/me            # Get current user info

GET    /api/admin/agents       # List registered agents
POST   /api/admin/agents       # Register new agent
PUT    /api/admin/agents/:id   # Update agent config
DELETE /api/admin/agents/:id   # Deactivate agent
```

### Agent MCP Endpoints (`/mcp/*`)
```
GET    /mcp/tasks              # List tasks (filtered by agent capabilities)
POST   /mcp/tasks              # Create subtask
GET    /mcp/tasks/:id          # Get task details
POST   /mcp/tasks/:id/comment  # Add comment
POST   /mcp/tasks/:id/move     # Move task (subject to role permissions)
POST   /mcp/tasks/:id/subtask  # Create subtask

POST   /mcp/agents/register    # Agent self-registration
POST   /mcp/agents/:id/claim   # Claim task lease
POST   /mcp/agents/:id/release # Release task lease
GET    /mcp/agents/:id/leases  # Get active leases

GET    /mcp/health             # Agent health check
```

### Integration Endpoints (`/webhooks/*`)
```
POST   /webhooks/github        # GitHub webhook handler
POST   /webhooks/ci            # CI pipeline notifications
```

## Major Components & Implementation Strategy

### Phase 1: Core Backend (Weeks 1-2)
1. **Project Setup**
   - Initialize monorepo with backend/frontend directories
   - Configure TypeScript, ESLint, Prettier
   - Set up Docker Compose with SQLite volume

2. **Database Layer**
   - Implement SQLite connection with migration system
   - Create database schema and seed data
   - Build query abstractions for tasks, users, agents, audit

3. **Authentication & Authorization**
   - JWT middleware for human users
   - Bearer token middleware for agents
   - Role-based access control (RBAC) system
   - Password hashing and token generation utilities

4. **Core API Implementation**
   - Express server setup with middleware stack
   - Task CRUD operations with validation
   - Audit logging middleware (automatic for all state changes)
   - Error handling and response normalization

### Phase 2: MCP Agent Framework (Week 3)
1. **MCP Endpoint Implementation**
   - Agent-specific task filtering and permissions
   - Task claiming/lease system with expiration
   - Comment and move operations with audit trails
   - Agent registration and capability management

2. **Policy Enforcement Engine**
   - Business rule validation middleware
   - Human approval requirements for MustDoNow/FixedDate
   - Agent confidence threshold checking
   - Policy violation logging and alerting

3. **Agent Placeholder Framework**
   - Python agent stub for document preparation
   - Node.js agent stub for code review
   - Token-based authentication setup
   - Basic agent workflow testing

### Phase 3: Frontend Implementation (Weeks 4-5)
1. **React Application Setup**
   - Vite configuration with TypeScript
   - Tailwind CSS integration and design system
   - Routing setup with React Router
   - Global state management with Context

2. **Kanban Board UI**
   - Drag-and-drop task cards with react-beautiful-dnd
   - Column-based layout (Backlog → Done)
   - Real-time updates via SSE connection
   - Task filtering and search functionality

3. **Task Management Interface**
   - Task creation/editing modals
   - Rich metadata forms (service class, AI eligibility)
   - Comment system with audit history view
   - User assignment and agent status indicators

4. **Admin Interface**
   - Agent registration and management
   - User role administration
   - System metrics dashboard
   - Audit log viewer with filtering

### Phase 4: Integration & Polish (Week 6)
1. **GitHub Integration**
   - Webhook handler for PR events
   - Task status automation based on PR lifecycle
   - CI pipeline result processing
   - Link association between tasks and PRs

2. **Real-time Features**
   - Server-Sent Events implementation
   - Optimistic UI updates with reconciliation
   - User presence indicators
   - Conflict resolution for concurrent edits

3. **Testing & Documentation**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - End-to-end tests for user workflows
   - OpenAPI documentation generation

## Security & Governance Implementation

### Authentication Flow
```typescript
// Human JWT payload
interface HumanToken {
  sub: string;      // user id
  username: string;
  role: string;     // user, admin
  iat: number;
  exp: number;
}

// Agent token validation
interface AgentToken {
  agentId: string;
  role: string;     // triage, prep, review, merge
  capabilities: string[];
  exp: number;
}
```

### Audit Middleware
```typescript
// Automatic audit logging for all state changes
const auditMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const before = await captureBeforeState(req);
    
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        const after = await captureAfterState(req);
        await logAuditEntry({
          taskId: req.params.id,
          actorType: req.user ? 'Human' : 'Agent',
          actorId: req.user?.id || req.agent?.id,
          action,
          beforeState: before,
          afterState: after,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    next();
  };
};
```

### Policy Enforcement
```typescript
// Business rule validation
const enforcePolicy = async (taskId: string, newStatus: string, actor: Actor) => {
  const task = await getTask(taskId);
  
  // MustDoNow and FixedDate require human approval for Done
  if (newStatus === 'done' && 
      ['MustDoNow', 'FixedDate'].includes(task.serviceClass) &&
      actor.type === 'Agent') {
    throw new PolicyViolationError('Human approval required for critical tasks');
  }
  
  // Agents can only move tasks they have capabilities for
  if (actor.type === 'Agent' && !actor.capabilities.includes('move_' + newStatus)) {
    throw new PermissionError('Agent lacks capability for this action');
  }
};
```

## File Structure

```
kanbanx/
├── docker-compose.yml
├── package.json
├── README.md
├── docs/
│   ├── api.yml                 # OpenAPI specification
│   ├── langgraph-mapping.md    # Agent migration guide
│   └── deployment.md           # Production deployment guide
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.ts              # Express application setup
│   │   ├── server.ts           # Server entry point
│   │   ├── config/
│   │   │   ├── database.ts     # Database connection
│   │   │   └── auth.ts         # JWT configuration
│   │   ├── middleware/
│   │   │   ├── auth.ts         # Authentication middleware
│   │   │   ├── audit.ts        # Audit logging middleware
│   │   │   └── policy.ts       # Policy enforcement
│   │   ├── controllers/
│   │   │   ├── tasks.ts        # Task CRUD operations
│   │   │   ├── mcp.ts          # Agent MCP endpoints
│   │   │   ├── auth.ts         # Human authentication
│   │   │   └── webhooks.ts     # GitHub/CI integration
│   │   ├── models/
│   │   │   ├── Task.ts         # Task data model
│   │   │   ├── User.ts         # User data model
│   │   │   ├── Agent.ts        # Agent data model
│   │   │   └── Audit.ts        # Audit entry model
│   │   ├── services/
│   │   │   ├── TaskService.ts  # Business logic
│   │   │   ├── AuditService.ts # Audit operations
│   │   │   └── AgentService.ts # Agent management
│   │   └── utils/
│   │       ├── validation.ts   # Input validation
│   │       └── errors.ts       # Custom error types
│   └── migrations/
│       └── 001_initial.sql     # Database schema
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Main application component
│   │   ├── components/
│   │   │   ├── KanbanBoard.tsx # Main board interface
│   │   │   ├── TaskCard.tsx    # Individual task cards
│   │   │   ├── TaskModal.tsx   # Task creation/editing
│   │   │   └── AdminPanel.tsx  # Agent management
│   │   ├── hooks/
│   │   │   ├── useSSE.ts       # Server-Sent Events hook
│   │   │   ├── useTasks.ts     # Task management hook
│   │   │   └── useAuth.ts      # Authentication hook
│   │   ├── services/
│   │   │   └── api.ts          # API client wrapper
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript type definitions
│   │   └── utils/
│   │       └── constants.ts    # Application constants
│   └── public/
│       └── index.html
└── agents/
    ├── doc_agent.py            # Python document prep agent
    ├── review_agent.js         # Node.js code review agent
    └── requirements.txt        # Python dependencies
```

## Quality Gates & Testing Strategy

### Backend Testing
- **Unit Tests**: Business logic, utilities, and services
- **Integration Tests**: API endpoints and database operations
- **Contract Tests**: OpenAPI specification compliance
- **Security Tests**: Authentication and authorization flows

### Frontend Testing
- **Component Tests**: React component behavior and rendering
- **Integration Tests**: User workflows and API integration
- **E2E Tests**: Complete user journeys with Playwright
- **Accessibility Tests**: WCAG compliance verification

### Agent Testing
- **Mock API Tests**: Agent behavior with simulated responses
- **Workflow Tests**: Complete agent task processing cycles
- **Error Handling Tests**: Agent behavior under failure conditions
- **Performance Tests**: Agent response times and throughput

## Production Considerations

### Database Migration
- **Development**: SQLite with file-based storage
- **Production**: PostgreSQL with connection pooling
- **Migration Scripts**: Automated schema and data migration
- **Backup Strategy**: Regular database backups and point-in-time recovery

### Security Hardening
- **Token Management**: Short-lived tokens with rotation
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive request sanitization
- **HTTPS Enforcement**: TLS termination and security headers

### Monitoring & Observability
- **Application Metrics**: Task throughput, response times, error rates
- **Agent Metrics**: Success rates, processing times, confidence scores
- **System Metrics**: Database performance, memory usage, CPU utilization
- **Audit Metrics**: Policy compliance, human intervention rates

This implementation plan provides a structured approach to building the KanbanX system with clear phases, technical decisions, and quality gates to ensure successful delivery of the AI-augmented Kanban workflow system.