import express from 'express';
import { authenticateAgent, requireCapability } from '../middleware/auth';
import { AuthenticatedRequest, ApiResponse, Task } from '../types';
import { getDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// MCP Endpoint: List available tasks for agents
router.get('/tasks/available', authenticateAgent, requireCapability('query_tasks'), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const agent = authReq.agent!;
    
    const db = getDatabase();
    
    // Get tasks that are AI eligible and available for the agent's role
    let statusFilter = '';
    switch (agent.role) {
      case 'triage':
        statusFilter = "status = 'backlog'";
        break;
      case 'prep':
        statusFilter = "status IN ('todo', 'ai_prep')";
        break;
      case 'review':
        statusFilter = "status = 'verify'";
        break;
      case 'merge':
        statusFilter = "status = 'verify'";
        break;
      default:
        statusFilter = "status IN ('todo', 'ai_prep')";
    }

    const tasks = await db.all<Task>(
      `SELECT id, title, description, status, service_class, ai_eligible, 
              tags, links, created_at, updated_at, created_by
       FROM tasks 
       WHERE ai_eligible = 1 AND ${statusFilter}
       AND id NOT IN (
         SELECT task_id FROM agent_leases 
         WHERE expires_at > datetime('now') AND released_at IS NULL
       )
       ORDER BY 
         CASE service_class 
           WHEN 'MustDoNow' THEN 1
           WHEN 'FixedDate' THEN 2
           WHEN 'Linear' THEN 3
           WHEN 'Intangible' THEN 4
         END,
         created_at ASC
       LIMIT 50`
    );

    const response: ApiResponse<Task[]> = {
      success: true,
      data: tasks.map(task => ({
        ...task,
        tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags || [],
        links: typeof task.links === 'string' ? JSON.parse(task.links) : task.links || []
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('MCP get available tasks error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// MCP Endpoint: Claim a task (create lease)
router.post('/tasks/:taskId/claim', authenticateAgent, requireCapability('claim_task'), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const agent = authReq.agent!;
    const { taskId } = req.params;
    const { duration_minutes = 30 } = req.body; // Default 30 minute lease

    const db = getDatabase();
    
    // Check if task exists and is available
    const task = await db.get<Task>(
      'SELECT id, status, ai_eligible FROM tasks WHERE id = ?',
      [taskId]
    );

    if (!task) {
      res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
      return;
    }

    if (!task.ai_eligible) {
      res.status(400).json({ 
        success: false, 
        error: 'Task is not AI eligible' 
      });
      return;
    }

    // Check if task is already claimed
    const existingLease = await db.get(
      'SELECT id FROM agent_leases WHERE task_id = ? AND expires_at > datetime("now") AND released_at IS NULL',
      [taskId]
    );

    if (existingLease) {
      res.status(409).json({ 
        success: false, 
        error: 'Task is already claimed by another agent' 
      });
      return;
    }

    // Create lease
    const leaseId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_minutes * 60 * 1000);

    await db.run(
      `INSERT INTO agent_leases (id, agent_id, task_id, claimed_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [leaseId, agent.id, taskId, now.toISOString(), expiresAt.toISOString()]
    );

    // Update task ownership
    await db.run(
      'UPDATE tasks SET owner_type = ?, owner_id = ?, updated_at = ? WHERE id = ?',
      ['Agent', agent.id, now.toISOString(), taskId]
    );

    // Create audit entry
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, after_state, note, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        'Agent',
        agent.id,
        'assign',
        JSON.stringify({ owner_type: 'Agent', owner_id: agent.id }),
        `Task claimed by agent ${agent.name}`,
        now.toISOString()
      ]
    );

    const response: ApiResponse<{ leaseId: string; expiresAt: string }> = {
      success: true,
      data: { leaseId, expiresAt: expiresAt.toISOString() },
      message: 'Task claimed successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('MCP claim task error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// MCP Endpoint: Release a task lease
router.post('/tasks/:taskId/release', authenticateAgent, requireCapability('release_task'), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const agent = authReq.agent!;
    const { taskId } = req.params;
    const { reason = 'Released by agent' } = req.body;

    const db = getDatabase();
    const now = new Date().toISOString();

    // Find and release the lease
    const lease = await db.get<{ id: string }>(
      'SELECT id FROM agent_leases WHERE agent_id = ? AND task_id = ? AND expires_at > datetime("now") AND released_at IS NULL',
      [agent.id, taskId]
    );

    if (!lease) {
      res.status(404).json({ 
        success: false, 
        error: 'No active lease found for this task' 
      });
      return;
    }

    await db.run(
      'UPDATE agent_leases SET released_at = ? WHERE id = ?',
      [now, lease.id]
    );

    // Clear task ownership
    await db.run(
      'UPDATE tasks SET owner_type = NULL, owner_id = NULL, updated_at = ? WHERE id = ?',
      [now, taskId]
    );

    // Create audit entry
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, before_state, note, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        'Agent',
        agent.id,
        'assign',
        JSON.stringify({ owner_type: 'Agent', owner_id: agent.id }),
        `Task released: ${reason}`,
        now
      ]
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      message: 'Task released successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('MCP release task error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// MCP Endpoint: Update task status
router.patch('/tasks/:taskId/status', authenticateAgent, requireCapability('move'), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const agent = authReq.agent!;
    const { taskId } = req.params;
    const { status, note } = req.body;

    if (!['backlog', 'todo', 'ai_prep', 'in_progress', 'verify', 'done'].includes(status)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
      return;
    }

    const db = getDatabase();
    
    // Verify agent has an active lease on this task
    const lease = await db.get(
      'SELECT id FROM agent_leases WHERE agent_id = ? AND task_id = ? AND expires_at > datetime("now") AND released_at IS NULL',
      [agent.id, taskId]
    );

    if (!lease) {
      res.status(403).json({ 
        success: false, 
        error: 'Agent does not have an active lease on this task' 
      });
      return;
    }

    // Get current task state for audit
    const currentTask = await db.get<Task>(
      'SELECT status FROM tasks WHERE id = ?',
      [taskId]
    );

    if (!currentTask) {
      res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
      return;
    }

    const now = new Date().toISOString();

    // Update task status
    await db.run(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, taskId]
    );

    // Create audit entry
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, before_state, after_state, note, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        'Agent',
        agent.id,
        'move',
        JSON.stringify({ status: currentTask.status }),
        JSON.stringify({ status }),
        note || `Status changed by ${agent.name}`,
        now
      ]
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      message: 'Task status updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('MCP update task status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// MCP Endpoint: Add comment to task
router.post('/tasks/:taskId/comment', authenticateAgent, requireCapability('comment'), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const agent = authReq.agent!;
    const { taskId } = req.params;
    const { comment } = req.body;

    if (!comment) {
      res.status(400).json({ 
        success: false, 
        error: 'Comment is required' 
      });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // Verify task exists
    const task = await db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
      return;
    }

    // Create audit entry for comment
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, note, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [taskId, 'Agent', agent.id, 'comment', comment, now]
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      message: 'Comment added successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('MCP add comment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// MCP Endpoint: Get task details
router.get('/tasks/:taskId', authenticateAgent, requireCapability('query_tasks'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const db = getDatabase();

    const task = await db.get<Task>(
      `SELECT id, title, description, status, owner_type, owner_id, service_class, 
              ai_eligible, tags, links, parent_task_id, created_by, created_at, updated_at
       FROM tasks WHERE id = ?`,
      [taskId]
    );

    if (!task) {
      res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
      return;
    }

    // Get task history
    const history = await db.all(
      `SELECT actor_type, actor_id, action, before_state, after_state, note, timestamp
       FROM audit WHERE task_id = ? ORDER BY timestamp DESC LIMIT 10`,
      [taskId]
    );

    const response: ApiResponse<Task & { history: typeof history }> = {
      success: true,
      data: {
        ...task,
        tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags || [],
        links: typeof task.links === 'string' ? JSON.parse(task.links) : task.links || [],
        history
      }
    };

    res.json(response);
  } catch (error) {
    console.error('MCP get task details error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// MCP Endpoint: Create subtask
router.post('/tasks/:taskId/subtask', authenticateAgent, requireCapability('create_subtask'), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const agent = authReq.agent!;
    const { taskId } = req.params;
    const { title, description, service_class = 'Linear' } = req.body;

    if (!title) {
      res.status(400).json({ 
        success: false, 
        error: 'Title is required' 
      });
      return;
    }

    const db = getDatabase();
    
    // Verify parent task exists
    const parentTask = await db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!parentTask) {
      res.status(404).json({ 
        success: false, 
        error: 'Parent task not found' 
      });
      return;
    }

    const subtaskId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO tasks (
        id, title, description, status, service_class, ai_eligible, 
        parent_task_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subtaskId,
        title,
        description || null,
        'backlog',
        service_class,
        1, // AI eligible by default for agent-created subtasks
        taskId,
        'agent-' + agent.id, // Special created_by for agent-created tasks
        now,
        now
      ]
    );

    // Create audit entry
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, after_state, note, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subtaskId,
        'Agent',
        agent.id,
        'create',
        JSON.stringify({ title, parent_task_id: taskId }),
        `Subtask created by ${agent.name}`,
        now
      ]
    );

    const response: ApiResponse<{ subtaskId: string }> = {
      success: true,
      data: { subtaskId },
      message: 'Subtask created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('MCP create subtask error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;