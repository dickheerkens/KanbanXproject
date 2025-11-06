import React from 'react';
import { Task } from '../types';

interface Props {
  task: Task;
  index: number;
}

const TaskCard: React.FC<Props> = ({ task }) => {
  return (
    <div className="task-card" data-status={task.status}>
      <div className="task-title">{task.title}</div>
      {task.description && <div className="task-desc">{task.description}</div>}
      <div className="task-meta">
        <span className={`svc svc-${task.service_class.toLowerCase()}`}>{task.service_class}</span>
        {task.ai_eligible ? <span className="badge ai">AI</span> : null}
      </div>
      <div className="tags">
        {(Array.isArray(task.tags) ? task.tags : []).map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </div>
  );
};

export default TaskCard;
