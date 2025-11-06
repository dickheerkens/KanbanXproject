// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modal controls
    const modal = document.getElementById('taskModal');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const taskForm = document.getElementById('taskForm');

    // Modal event listeners
    addTaskBtn.addEventListener('click', openAddTaskModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    taskForm.addEventListener('submit', handleTaskSubmit);

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    function openAddTaskModal() {
        boardManager.currentEditingTask = null;
        document.getElementById('modalTitle').textContent = 'Add New Task';
        taskForm.reset();
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
        taskForm.reset();
        boardManager.currentEditingTask = null;
    }

    async function handleTaskSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(taskForm);
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignee: formData.get('assignee') || null,
            status: formData.get('status'),
            position: 0
        };

        try {
            boardManager.showLoading(true);
            
            if (boardManager.currentEditingTask) {
                // Update existing task
                await api.updateTask(boardManager.currentEditingTask.id, taskData);
            } else {
                // Create new task
                await api.createTask(taskData);
            }
            
            closeModal();
            await boardManager.loadTasks();
        } catch (error) {
            console.error('Failed to save task:', error);
            alert('Failed to save task. Please try again.');
        } finally {
            boardManager.showLoading(false);
        }
    }

    // Load initial data
    boardManager.loadTasks();

    // Add some helpful keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape key closes modal
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
        
        // Ctrl/Cmd + N opens add task modal
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openAddTaskModal();
        }
    });

    console.log('🔄 KanbanX Board initialized successfully!');
});