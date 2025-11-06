import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { BoardState, TaskStatus, Task } from '../types';
import { fetchBoard, createTask } from '../services/api';
import Column from './Column';
import AgentChat from './AgentChat';
import TaskModal from './TaskModal';

interface Props { token: string; }

const Board: React.FC<Props> = ({ token }) => {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const openTask = useCallback((id: string) => {
    setSelectedTaskId(id);
  }, []);

  const closeTask = useCallback(() => setSelectedTaskId(null), []);

  function findTask(id: string, b: BoardState): Task | null {
    for (const col of Object.values(b)) {
      const t = (col as Task[]).find(task => task.id === id);
      if (t) return t;
    }
    return null;
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await fetchBoard(token);
      setBoard(data);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const payload: { title: string; description?: string; service_class: string; ai_eligible?: boolean; tags?: string[] } = {
        title: newTitle.trim(),
        service_class: 'Linear',
        ai_eligible: true,
        tags: ['web']
      };
      if (newDesc.trim()) payload.description = newDesc.trim();
      await createTask(token, payload);
      setNewTitle(''); setNewDesc('');
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally { setCreating(false); }
  }

  async function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination || !board) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = source.droppableId as TaskStatus;
    const destCol = destination.droppableId as TaskStatus;

    // Optimistic update
    const newBoard = { ...board };
    const [movedTask] = newBoard[sourceCol].splice(source.index, 1);
    if (!movedTask) return;
    movedTask.status = destCol;
    newBoard[destCol].splice(destination.index, 0, movedTask);
    setBoard(newBoard);

    // Call backend to persist the move
    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: destCol })
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error || 'Update failed');
    } catch (e: any) {
      alert(e.message);
      await load(); // Revert on failure
    }
  }

  return (
    <div className="board-wrapper">
      <div className="top-bar">
        <h1>KanbanX Board</h1>
        <div className="top-actions">
          <button onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          <button className="agent-toggle" onClick={() => setChatOpen(!chatOpen)}>
            🤖 {chatOpen ? 'Hide' : 'Show'} Agent
          </button>
        </div>
      </div>

      <form className="create-task" onSubmit={handleCreate}>
        <input placeholder="Task title" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
        <input placeholder="Description" value={newDesc} onChange={e=>setNewDesc(e.target.value)} />
        <button disabled={creating || !newTitle.trim()}>{creating ? 'Creating...' : 'Add Task'}</button>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="board-container">
        {!board && !loading && <div>Loading board...</div>}
        {board && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="board-grid">
              <Column title="Backlog" status="backlog" tasks={board.backlog} onTaskClick={(t)=>openTask(t.id)} />
              <Column title="To Do" status="todo" tasks={board.todo} onTaskClick={(t)=>openTask(t.id)} />
              <Column title="AI Prep" status="ai_prep" tasks={board.ai_prep} onTaskClick={(t)=>openTask(t.id)} />
              <Column title="In Progress" status="in_progress" tasks={board.in_progress} onTaskClick={(t)=>openTask(t.id)} />
              <Column title="Verify" status="verify" tasks={board.verify} onTaskClick={(t)=>openTask(t.id)} />
              <Column title="Done" status="done" tasks={board.done} onTaskClick={(t)=>openTask(t.id)} />
            </div>
          </DragDropContext>
        )}

        {chatOpen && <AgentChat token={token} onClose={() => setChatOpen(false)} />}
        {selectedTaskId && board && (
          <TaskModal
            onClose={closeTask}
            task={findTask(selectedTaskId, board)}
          />
        )}
      </div>
    </div>
  );
};

export default Board;
