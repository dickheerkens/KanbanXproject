import express from 'express';
import { authenticateHuman, authenticateAgent, requireCapability } from '../middleware/auth';
import { AuthenticatedRequest, ApiResponse, Task, BoardState } from '../types';
import { getDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all tasks (board view)
router.get('/', authenticateHuman, async (_req, res) => {
  try {
    const db = getDatabase();
    
    const tasks = await db.all<Task>(
      `SELECT id, title, description, status, owner_type, owner_id, service_class, 
              ai_eligible, tags, links, parent_task_id, created_by, created_at, updated_at 
       FROM tasks ORDER BY created_at DESC`
    );

    // Group tasks by status
    const boardState: BoardState = {
      backlog: tasks.filter(t => t.status === 'backlog'),
      todo: tasks.filter(t => t.status === 'todo'),
      ai_prep: tasks.filter(t => t.status === 'ai_prep'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      verify: tasks.filter(t => t.status === 'verify'),
      done: tasks.filter(t => t.status === 'done')
    };

    const response: ApiResponse<BoardState> = {
      success: true,
      data: boardState
    };

    res.json(response);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Create new task
router.post('/', authenticateHuman, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user!;
    
    const { 
      title, 
      description, 
      service_class = 'Linear',
      ai_eligible = false,
      tags = [],
      links = [],
      parent_task_id 
    } = req.body;

    if (!title) {
      res.status(400).json({ 
        success: false, 
        error: 'Title is required' 
      });
      return;
    }

    if (!['Linear', 'Intangible', 'MustDoNow', 'FixedDate'].includes(service_class)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid service class' 
      });
      return;
    }

    const db = getDatabase();
    const taskId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO tasks (
        id, title, description, status, service_class, ai_eligible, 
        tags, links, parent_task_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        title,
        description || null,
        'backlog',
        service_class,
        ai_eligible ? 1 : 0,
        JSON.stringify(tags),
        JSON.stringify(links),
        parent_task_id || null,
        user.id,
        now,
        now
      ]
    );

    // Create audit entry
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, after_state, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        'Human',
        user.id,
        'create',
        JSON.stringify({ title, service_class, ai_eligible }),
        now
      ]
    );

    const response: ApiResponse<{ taskId: string }> = {
      success: true,
      data: { taskId },
      message: 'Task created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Update task
router.put('/:taskId', authenticateHuman, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user!;
    const { taskId } = req.params;
    
    const { 
      title, 
      description, 
      status,
      service_class,
      ai_eligible,
      tags,
      links
    } = req.body;

    const db = getDatabase();

    // Get current task for audit
    const currentTask = await db.get<Task>(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    if (!currentTask) {
      res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (status !== undefined) {
      if (!['backlog', 'todo', 'ai_prep', 'in_progress', 'verify', 'done'].includes(status)) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid status' 
        });
        return;
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (service_class !== undefined) {
      if (!['Linear', 'Intangible', 'MustDoNow', 'FixedDate'].includes(service_class)) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid service class' 
        });
        return;
      }
      updates.push('service_class = ?');
      values.push(service_class);
    }

    if (ai_eligible !== undefined) {
      updates.push('ai_eligible = ?');
      values.push(ai_eligible ? 1 : 0);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(tags));
    }

    if (links !== undefined) {
      updates.push('links = ?');
      values.push(JSON.stringify(links));
    }

    if (updates.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'No updates provided' 
      });
      return;
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    values.push(now);
    values.push(taskId);

    await db.run(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Create audit entry
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, before_state, after_state, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        'Human',
        user.id,
        'update',
        JSON.stringify(currentTask),
        JSON.stringify(req.body),
        now
      ]
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      message: 'Task updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Move task (for drag & drop)
router.patch('/:taskId/move', authenticateHuman, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user!;
    const { taskId } = req.params;
    const { status } = req.body;

    if (!['backlog', 'todo', 'ai_prep', 'in_progress', 'verify', 'done'].includes(status)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // Get current task for audit
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

    await db.run(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, taskId]
    );

    // Create audit entry
    await db.run(
      `INSERT INTO audit (task_id, actor_type, actor_id, action, before_state, after_state, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        'Human',
        user.id,
        'move',
        JSON.stringify({ status: currentTask.status }),
        JSON.stringify({ status }),
        now
      ]
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      message: 'Task moved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Agent endpoints
router.get('/agent/available', authenticateAgent, requireCapability('query_tasks'), async (_req, res) => {
  try {
    const db = getDatabase();
    
    // Get tasks that are AI eligible and in appropriate states
    const tasks = await db.all<Task>(
      `SELECT id, title, description, status, service_class, ai_eligible, 
              tags, links, created_at, updated_at
       FROM tasks 
       WHERE ai_eligible = 1 AND status IN ('todo', 'ai_prep')
       ORDER BY created_at ASC`
    );

    const response: ApiResponse<Task[]> = {
      success: true,
      data: tasks
    };

    res.json(response);
  } catch (error) {
    console.error('Agent get available tasks error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;