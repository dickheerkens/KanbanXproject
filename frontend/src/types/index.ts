export type TaskStatus = 'backlog' | 'todo' | 'ai_prep' | 'in_progress' | 'verify' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  service_class: 'Linear' | 'Intangible' | 'MustDoNow' | 'FixedDate';
  ai_eligible: number | boolean;
  tags: string[] | string; // backend might return JSON string
  owner_type?: string | null;
  owner_id?: string | null;
}

export interface BoardState {
  backlog: Task[];
  todo: Task[];
  ai_prep: Task[];
  in_progress: Task[];
  verify: Task[];
  done: Task[];
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      username: string;
      display_name: string;
      role: string;
    };
  };
  error?: string;
}
