import React, { useEffect } from 'react';
import { Task } from '../types';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  // Close on ESC
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!task) return null;

  const tags = Array.isArray(task.tags) ? task.tags : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onClick={e=>e.stopPropagation()}>
        <header className="modal-header">
          <h2 id="task-modal-title">{task.title}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <section className="modal-body">
          <div className="field"><span className="label">ID:</span> <code>{task.id}</code></div>
          <div className="field"><span className="label">Status:</span> <span className={`status-badge st-${task.status}`}>{task.status.replace(/_/g,' ')}</span></div>
          <div className="field"><span className="label">Service Class:</span> {task.service_class}</div>
          {task.description && <div className="description"><span className="label">Description:</span><p>{task.description}</p></div>}
          <div className="field tags-field"><span className="label">Tags:</span> {tags.length ? tags.map(t=> <span key={t} className="tag big">{t}</span>) : <em>None</em>}</div>
          {task.ai_eligible ? <div className="field"><span className="label">AI Eligible:</span> ✅</div> : null}
        </section>
        <footer className="modal-footer">
          <button onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
};

export default TaskModal;
