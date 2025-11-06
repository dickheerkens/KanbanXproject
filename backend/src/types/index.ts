import { Request } from 'express';

// Type definitions for KanbanX system
export interface User {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  role: 'triage' | 'prep' | 'review' | 'merge';
  token_hash: string;
  capabilities: string[];
  created_at: string;
  updated_at: string;
  last_active?: string;
  is_active: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'todo' | 'ai_prep' | 'in_progress' | 'verify' | 'done';
  owner_type?: 'Human' | 'Agent';
  owner_id?: string;
  service_class: 'Linear' | 'Intangible' | 'MustDoNow' | 'FixedDate';
  ai_eligible: boolean;
  tags?: string[];
  links?: string[];
  parent_task_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: number;
  task_id?: string;
  actor_type: 'Human' | 'Agent';
  actor_id: string;
  action: 'create' | 'update' | 'move' | 'comment' | 'assign';
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  note?: string;
  timestamp: string;
}

export interface AgentLease {
  id: string;
  agent_id: string;
  task_id: string;
  claimed_at: string;
  expires_at: string;
  released_at?: string;
}

// JWT payload types
export interface HumanTokenPayload {
  sub: string;      // user id
  username: string;
  role: string;     // user, admin
  iat: number;
  exp: number;
}

export interface AgentTokenPayload {
  agentId: string;
  role: string;     // triage, prep, review, merge
  capabilities: string[];
  exp: number;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: User;
  agent?: Agent;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface BoardState {
  backlog: Task[];
  todo: Task[];
  ai_prep: Task[];
  in_progress: Task[];
  verify: Task[];
  done: Task[];
}

// Agent capabilities
export type AgentCapability = 
  | 'query_tasks'
  | 'comment'
  | 'move'
  | 'create_subtask'
  | 'claim_task'
  | 'release_task';