import { BoardState, Task, TaskStatus, LoginResponse } from '../types';

// Safe access to Vite env with TS fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001/api';

function parseTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return [raw]; }
  }
  return [];
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data: LoginResponse = await res.json();
  if (!data.success || !data.data) throw new Error(data.error || 'Login failed');
  return data.data.token;
}

export async function fetchBoard(token: string): Promise<BoardState> {
  const res = await fetch(`${API_BASE}/tasks`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Failed to load tasks');
  const board: BoardState = body.data;
  // Normalize tags
  Object.values(board).forEach((col: Task[]) => col.forEach((t: Task) => { t.tags = parseTags(t.tags); }));
  return board;
}

export async function createTask(token: string, input: { title: string; description?: string; service_class: string; ai_eligible?: boolean; tags?: string[] }) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input)
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Task creation failed');
  return body.data.taskId as string;
}

const statusOrder: TaskStatus[] = ['backlog', 'todo', 'ai_prep', 'in_progress', 'verify', 'done'];

export async function moveTask(token: string, taskId: string, direction: 'forward' | 'backward') {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ direction })
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Move failed');
}

export function nextStatus(current: TaskStatus, direction: 'forward' | 'backward'): TaskStatus | null {
  const idx = statusOrder.indexOf(current);
  if (idx === -1) return null;
  if (direction === 'forward' && idx < statusOrder.length - 1) return statusOrder[idx + 1] as TaskStatus;
  if (direction === 'backward' && idx > 0) return statusOrder[idx - 1] as TaskStatus;
  return null;
}
