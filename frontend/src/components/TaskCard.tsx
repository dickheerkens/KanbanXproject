import React from 'react';
import { Task } from '../types';

interface Props {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
}

const TaskCard: React.FC<Props> = ({ task, onClick }) => {
  return (
    <div
      className="task-card"
      data-status={task.status}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(task); } }}
    >
      <div className="task-title">{task.title}</div>
      {task.description && <div className="task-desc ellipsis-2">{task.description}</div>}
      <div className="task-meta">
        <span className={`svc svc-${task.service_class.toLowerCase()}`}>{task.service_class}</span>
        {task.ai_eligible ? <span className="badge ai">AI</span> : null}
      </div>
      <div className="tags">
        {(Array.isArray(task.tags) ? task.tags : []).slice(0,4).map(t => <span key={t} className="tag">{t}</span>)}
        {(Array.isArray(task.tags) ? task.tags : []).length > 4 && <span className="tag more">+{(Array.isArray(task.tags) ? task.tags : []).length - 4}</span>}
      </div>
    </div>
  );
};

export default TaskCard;
