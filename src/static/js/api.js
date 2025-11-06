// API Client for KanbanX
class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    async request(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(`${this.baseUrl}${url}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Task operations
    async getTasks() {
        return this.request('/api/tasks');
    }

    async createTask(task) {
        return this.request('/api/tasks', {
            method: 'POST',
            body: task,
        });
    }

    async updateTask(taskId, task) {
        return this.request(`/api/tasks/${taskId}`, {
            method: 'PUT',
            body: task,
        });
    }

    async deleteTask(taskId) {
        return this.request(`/api/tasks/${taskId}`, {
            method: 'DELETE',
        });
    }

    async moveTask(taskId, status, position) {
        return this.request(`/api/tasks/${taskId}/move`, {
            method: 'PATCH',
            body: { status, position },
        });
    }

    // Board operations
    async getBoard() {
        return this.request('/api/board');
    }
}

// Global API client instance
window.api = new ApiClient();