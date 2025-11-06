"""Main FastAPI application for KanbanX Project."""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
import json
from pathlib import Path

app = FastAPI(title="KanbanX API", description="A simple Kanban board API", version="0.1.0")

# Serve static files
app.mount("/static", StaticFiles(directory="src/static"), name="static")

# Initialize SQLite database
def init_db():
    """Initialize the SQLite database."""
    conn = sqlite3.connect("kanban.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'todo',
            assignee TEXT,
            position INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    # Insert sample data if table is empty
    cursor.execute("SELECT COUNT(*) FROM tasks")
    if cursor.fetchone()[0] == 0:
        sample_tasks = [
            ("Setup project structure", "Initialize the basic FastAPI project", "done", "Alice", 0),
            ("Create task model", "Define the Task data model", "done", "Bob", 1),
            ("Implement drag and drop", "Add drag and drop functionality to frontend", "in_progress", "Alice", 0),
            ("Add user authentication", "Implement basic user auth system", "todo", None, 0),
            ("Write tests", "Create unit and integration tests", "todo", "Charlie", 1),
        ]
        
        now = datetime.now().isoformat()
        for title, desc, status, assignee, pos in sample_tasks:
            cursor.execute("""
                INSERT INTO tasks (title, description, status, assignee, position, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (title, desc, status, assignee, pos, now, now))
    
    conn.commit()
    conn.close()

# Pydantic models
class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str = "todo"
    assignee: Optional[str] = None
    position: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class TaskMove(BaseModel):
    status: str
    position: int

# Initialize database on startup
init_db()

@app.get("/")
async def read_root():
    """Serve the main application page."""
    return FileResponse("src/static/index.html")

@app.get("/api/tasks", response_model=List[Task])
async def get_tasks():
    """Get all tasks."""
    conn = sqlite3.connect("kanban.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, description, status, assignee, position, created_at, updated_at
        FROM tasks ORDER BY status, position
    """)
    
    tasks = []
    for row in cursor.fetchall():
        tasks.append(Task(
            id=row[0],
            title=row[1],
            description=row[2],
            status=row[3],
            assignee=row[4],
            position=row[5],
            created_at=row[6],
            updated_at=row[7]
        ))
    
    conn.close()
    return tasks

@app.post("/api/tasks", response_model=Task)
async def create_task(task: Task):
    """Create a new task."""
    conn = sqlite3.connect("kanban.db")
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO tasks (title, description, status, assignee, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (task.title, task.description, task.status, task.assignee, task.position, now, now))
    
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    task.id = task_id
    task.created_at = now
    task.updated_at = now
    return task

@app.put("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: int, task: Task):
    """Update an existing task."""
    conn = sqlite3.connect("kanban.db")
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE tasks SET title=?, description=?, status=?, assignee=?, position=?, updated_at=?
        WHERE id=?
    """, (task.title, task.description, task.status, task.assignee, task.position, now, task_id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    
    conn.commit()
    conn.close()
    
    task.id = task_id
    task.updated_at = now
    return task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int):
    """Delete a task."""
    conn = sqlite3.connect("kanban.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Task deleted successfully"}

@app.patch("/api/tasks/{task_id}/move")
async def move_task(task_id: int, move: TaskMove):
    """Move a task to a different status and position."""
    conn = sqlite3.connect("kanban.db")
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE tasks SET status=?, position=?, updated_at=? WHERE id=?
    """, (move.status, move.position, now, task_id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Task moved successfully"}

@app.get("/api/board")
async def get_board():
    """Get the complete board state organized by status."""
    conn = sqlite3.connect("kanban.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, description, status, assignee, position, created_at, updated_at
        FROM tasks ORDER BY status, position
    """)
    
    board = {"todo": [], "in_progress": [], "done": []}
    
    for row in cursor.fetchall():
        task = {
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "status": row[3],
            "assignee": row[4],
            "position": row[5],
            "created_at": row[6],
            "updated_at": row[7]
        }
        
        if task["status"] in board:
            board[task["status"]].append(task)
    
    conn.close()
    return board

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)