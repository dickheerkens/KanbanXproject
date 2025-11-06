import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { updateTask } from '../services/api';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  token?: string;
  onSaved?: () => void;
}
const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, token, onSaved }) => {
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
  const [desc, setDesc] = useState<string>(task.description || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!token || !task) return;
    setSaving(true); setSaveError(null);
    try {
      await updateTask(token, task.id, { description: desc });
      if (onSaved) onSaved();
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

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
          <div className="description-edit">
            <span className="label">Description:</span>
            <textarea
              className="description-editor"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Add a detailed description..."
              rows={8}
            />
            {saveError && <div className="error-text">{saveError}</div>}
            <div className="edit-actions">
              <button onClick={handleSave} disabled={saving || !token || desc === (task.description || '')}>{saving ? 'Saving...' : 'Save Description'}</button>
            </div>
          </div>
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
