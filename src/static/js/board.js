// Board Management for KanbanX
class BoardManager {
    constructor() {
        this.tasks = [];
        this.currentEditingTask = null;
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.todoList = document.getElementById('todo-list');
        this.inProgressList = document.getElementById('in_progress-list');
        this.doneList = document.getElementById('done-list');
        this.modal = document.getElementById('taskModal');
        this.taskForm = document.getElementById('taskForm');
        this.loading = document.getElementById('loading');
    }

    initializeEventListeners() {
        // Drag and drop event listeners
        [this.todoList, this.inProgressList, this.doneList].forEach(list => {
            list.addEventListener('dragover', this.handleDragOver.bind(this));
            list.addEventListener('drop', this.handleDrop.bind(this));
            list.addEventListener('dragenter', this.handleDragEnter.bind(this));
            list.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    }

    showLoading(show = true) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    updateTaskCounts() {
        const counts = {
            todo: this.todoList.children.length,
            in_progress: this.inProgressList.children.length,
            done: this.doneList.children.length,
        };

        document.querySelector('[data-status="todo"] .task-count').textContent = counts.todo;
        document.querySelector('[data-status="in_progress"] .task-count').textContent = counts.in_progress;
        document.querySelector('[data-status="done"] .task-count').textContent = counts.done;
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.draggable = true;
        taskElement.dataset.taskId = task.id;

        const assigneeHtml = task.assignee 
            ? `<span class="task-assignee">${task.assignee}</span>`
            : '<span class="task-assignee" style="background: #bdc3c7;">Unassigned</span>';

        const createdDate = new Date(task.created_at).toLocaleDateString();

        taskElement.innerHTML = `
            <h3>${this.escapeHtml(task.title)}</h3>
            ${task.description ? `<p>${this.escapeHtml(task.description)}</p>` : ''}
            <div class="task-meta">
                <small>Created: ${createdDate}</small>
                ${assigneeHtml}
            </div>
            <div class="task-actions">
                <button class="btn btn-secondary" onclick="boardManager.editTask(${task.id})">Edit</button>
                <button class="btn btn-danger" onclick="boardManager.deleteTask(${task.id})">Delete</button>
            </div>
        `;

        // Add drag event listeners
        taskElement.addEventListener('dragstart', this.handleDragStart.bind(this));
        taskElement.addEventListener('dragend', this.handleDragEnd.bind(this));

        return taskElement;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    getListByStatus(status) {
        switch (status) {
            case 'todo': return this.todoList;
            case 'in_progress': return this.inProgressList;
            case 'done': return this.doneList;
            default: return this.todoList;
        }
    }

    async loadTasks() {
        try {
            this.showLoading(true);
            const tasks = await api.getTasks();
            this.tasks = tasks;
            this.renderTasks();
        } catch (error) {
            console.error('Failed to load tasks:', error);
            alert('Failed to load tasks. Please refresh the page.');
        } finally {
            this.showLoading(false);
        }
    }

    renderTasks() {
        // Clear all lists
        this.todoList.innerHTML = '';
        this.inProgressList.innerHTML = '';
        this.doneList.innerHTML = '';

        // Render tasks in their respective columns
        this.tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            const list = this.getListByStatus(task.status);
            list.appendChild(taskElement);
        });

        this.updateTaskCounts();
    }

    async editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentEditingTask = task;
        
        // Populate form
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskAssignee').value = task.assignee || '';
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('modalTitle').textContent = 'Edit Task';
        
        this.modal.style.display = 'block';
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            this.showLoading(true);
            await api.deleteTask(taskId);
            await this.loadTasks(); // Reload to update UI
        } catch (error) {
            console.error('Failed to delete task:', error);
            alert('Failed to delete task. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // Drag and Drop handlers
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDragEnter(e) {
        e.preventDefault();
        if (e.target.classList.contains('task-list')) {
            e.target.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        if (e.target.classList.contains('task-list')) {
            e.target.classList.remove('drag-over');
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        
        if (!e.target.classList.contains('task-list')) return;
        
        e.target.classList.remove('drag-over');
        
        const taskId = parseInt(e.dataTransfer.getData('text/plain'));
        const newStatus = e.target.parentElement.dataset.status;
        
        try {
            this.showLoading(true);
            await api.moveTask(taskId, newStatus, 0);
            await this.loadTasks(); // Reload to update UI
        } catch (error) {
            console.error('Failed to move task:', error);
            alert('Failed to move task. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
}

// Global board manager instance
window.boardManager = new BoardManager();