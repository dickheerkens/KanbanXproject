import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';

interface Props {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const Column: React.FC<Props> = ({ title, status, tasks, onTaskClick }) => {
  return (
    <div className="column">
      <div className="column-header">
        <h3>{title}</h3>
        <span className="count">{tasks.length}</span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            className={`column-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'dragging' : ''}
                  >
                    <TaskCard task={task} index={index} onClick={(t)=>{ if(onTaskClick) onTaskClick(t); }} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {tasks.length === 0 && <div className="empty">No tasks</div>}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default Column;
