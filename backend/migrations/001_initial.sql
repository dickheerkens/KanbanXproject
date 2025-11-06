-- KanbanX Initial Database Schema
-- Version: 001
-- Description: Core tables for users, agents, tasks, and audit trail

-- Users (Human actors)
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- uuid v4
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,   -- bcrypt hash
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TEXT NOT NULL,     -- ISO 8601 timestamp
  updated_at TEXT NOT NULL
);

-- Agents (AI actors)
CREATE TABLE agents (
  id TEXT PRIMARY KEY,           -- uuid v4
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('triage', 'prep', 'review', 'merge')),
  token_hash TEXT NOT NULL,     -- hashed bearer token
  capabilities TEXT NOT NULL,    -- JSON array of allowed actions
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_active TEXT,
  is_active BOOLEAN DEFAULT 1
);

-- Tasks (Core work items)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,           -- uuid v4
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'ai_prep', 'in_progress', 'verify', 'done')),
  owner_type TEXT CHECK (owner_type IN ('Human', 'Agent')),
  owner_id TEXT,                -- references users.id or agents.id
  service_class TEXT NOT NULL CHECK (service_class IN ('Linear', 'Intangible', 'MustDoNow', 'FixedDate')),
  ai_eligible BOOLEAN DEFAULT 0,
  tags TEXT,                    -- JSON array
  links TEXT,                   -- JSON array of URLs
  parent_task_id TEXT,          -- for subtasks
  created_by TEXT NOT NULL,     -- references users.id
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Audit Trail (Immutable log)
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('Human', 'Agent')),
  actor_id TEXT NOT NULL,       -- user or agent id
  action TEXT NOT NULL,         -- create, update, move, comment, assign
  before_state TEXT,            -- JSON snapshot
  after_state TEXT,             -- JSON snapshot
  note TEXT,                    -- optional human-readable note
  timestamp TEXT NOT NULL,      -- ISO 8601 timestamp
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Agent Leases (Task claiming system)
CREATE TABLE agent_leases (
  id TEXT PRIMARY KEY,          -- uuid v4
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  released_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(agent_id, task_id)
);

-- Performance indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_owner ON tasks(owner_type, owner_id);
CREATE INDEX idx_tasks_ai_eligible ON tasks(ai_eligible);
CREATE INDEX idx_tasks_service_class ON tasks(service_class);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

CREATE INDEX idx_audit_task_id ON audit(task_id);
CREATE INDEX idx_audit_timestamp ON audit(timestamp);
CREATE INDEX idx_audit_actor ON audit(actor_type, actor_id);

CREATE INDEX idx_agent_leases_expires ON agent_leases(expires_at);
CREATE INDEX idx_agent_leases_agent ON agent_leases(agent_id);
CREATE INDEX idx_agent_leases_task ON agent_leases(task_id);

CREATE INDEX idx_agents_active ON agents(is_active);
CREATE INDEX idx_agents_role ON agents(role);

-- Seed data for development
INSERT INTO users (id, username, display_name, password_hash, role, created_at, updated_at) VALUES
  ('user-admin-001', 'admin', 'System Administrator', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', datetime('now'), datetime('now')),
  ('user-alice-001', 'alice', 'Alice Johnson', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', datetime('now'), datetime('now')),
  ('user-bob-001', 'bob', 'Bob Smith', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', datetime('now'), datetime('now'));

INSERT INTO agents (id, name, role, token_hash, capabilities, created_at, updated_at, is_active) VALUES
  ('agent-doc-001', 'DocumentAgent', 'prep', '$2a$10$example-hashed-token-for-doc-agent', '["query_tasks", "comment", "move"]', datetime('now'), datetime('now'), 1),
  ('agent-review-001', 'ReviewAgent', 'review', '$2a$10$example-hashed-token-for-review-agent', '["query_tasks", "comment", "move"]', datetime('now'), datetime('now'), 1);

INSERT INTO tasks (id, title, description, status, owner_type, owner_id, service_class, ai_eligible, tags, created_by, created_at, updated_at) VALUES
  ('task-001', 'Setup KanbanX Authentication', 'Implement JWT authentication for human users and bearer token auth for agents', 'in_progress', 'Human', 'user-alice-001', 'Linear', 1, '["backend", "auth"]', 'user-admin-001', datetime('now'), datetime('now')),
  ('task-002', 'Create MCP Endpoints', 'Build Model Context Protocol compatible REST endpoints for agent integration', 'ai_prep', NULL, NULL, 'Linear', 1, '["backend", "mcp", "agents"]', 'user-admin-001', datetime('now'), datetime('now')),
  ('task-003', 'Design Kanban Board UI', 'Create React components for the six-column Kanban board interface', 'todo', NULL, NULL, 'Linear', 1, '["frontend", "ui"]', 'user-alice-001', datetime('now'), datetime('now')),
  ('task-004', 'Implement Audit System', 'Build comprehensive audit trail for all system actions', 'backlog', NULL, NULL, 'MustDoNow', 0, '["backend", "audit", "compliance"]', 'user-admin-001', datetime('now'), datetime('now'));

-- Record initial audit entries for seed tasks
INSERT INTO audit (task_id, actor_type, actor_id, action, after_state, note, timestamp) VALUES
  ('task-001', 'Human', 'user-admin-001', 'create', '{"status": "in_progress", "owner_type": "Human", "owner_id": "user-alice-001"}', 'Initial task creation', datetime('now')),
  ('task-002', 'Human', 'user-admin-001', 'create', '{"status": "ai_prep", "ai_eligible": true}', 'Initial task creation', datetime('now')),
  ('task-003', 'Human', 'user-alice-001', 'create', '{"status": "todo", "ai_eligible": true}', 'Initial task creation', datetime('now')),
  ('task-004', 'Human', 'user-admin-001', 'create', '{"status": "backlog", "service_class": "MustDoNow"}', 'Initial task creation', datetime('now'));