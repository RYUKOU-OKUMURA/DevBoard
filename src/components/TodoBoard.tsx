/**
 * TodoBoard component - Kanban-style board for todos
 */

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { Todo, TodoStatus } from '../types';
import { TodoColumn } from './TodoColumn';
import { TodoCard } from './TodoCard';
import { TodoDetail } from './TodoDetail';

interface TodoBoardProps {
  todos: Todo[];
  repoMap?: Map<string, string>;
  onUpdate: (todoId: string, updates: Partial<Todo>) => void;
  onTodoClick?: (todo: Todo) => void;
  onAddTodo?: () => void;
  onCreateIssue?: (todoId: string) => void;
}

export const TodoBoard: React.FC<TodoBoardProps> = ({
  todos,
  repoMap = new Map(),
  onUpdate,
  onTodoClick,
  onAddTodo,
  onCreateIssue,
}) => {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    })
  );

  // Group todos by status
  const todosByStatus = useMemo(() => {
    const groups: Record<TodoStatus, Todo[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const todo of todos) {
      groups[todo.status].push(todo);
    }

    return groups;
  }, [todos]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const todo = todos.find((t) => t.id === active.id);
    setActiveTodo(todo || null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTodo(null);
      return;
    }

    const todoId = active.id as string;
    const newStatus = over.id as TodoStatus;

    // Find the todo being dragged
    const todo = todos.find((t) => t.id === todoId);

    if (todo && todo.status !== newStatus) {
      // Update the todo status
      onUpdate(todoId, { status: newStatus });
    }

    setActiveTodo(null);
  };

  // Handle todo click
  const handleTodoClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setIsDetailOpen(true);

    if (onTodoClick) {
      onTodoClick(todo);
    }
  };

  // Handle detail save
  const handleDetailSave = (todoId: string, updates: Partial<Todo>) => {
    onUpdate(todoId, updates);
    setIsDetailOpen(false);
    setSelectedTodo(null);
  };

  // Handle detail close
  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setSelectedTodo(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Board header */}
      <div className="flex items-center justify-between mb-stack-lg">
        <h2 className="text-title-1 font-bold text-[var(--text-primary)]">
          ToDoボード
        </h2>
        {onAddTodo && (
          <button
            onClick={onAddTodo}
            className={`
              px-4 py-2 rounded-lg
              bg-[var(--accent-green)]
              text-white font-medium
              hover:bg-[var(--accent-green-hover)]
              transition-colors
            `}
          >
            + ToDoを追加
          </button>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-inline-lg h-full">
            <TodoColumn
              status="todo"
              todos={todosByStatus.todo}
              repoMap={repoMap}
              onTodoClick={handleTodoClick}
              onAddTodo={onAddTodo}
            />
            <TodoColumn
              status="in_progress"
              todos={todosByStatus.in_progress}
              repoMap={repoMap}
              onTodoClick={handleTodoClick}
            />
            <TodoColumn
              status="done"
              todos={todosByStatus.done}
              repoMap={repoMap}
              onTodoClick={handleTodoClick}
            />
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTodo && (
              <div className="rotate-3 opacity-90">
                <TodoCard
                  todo={activeTodo}
                  onClick={() => {}}
                  repoName={repoMap.get(activeTodo.repoId)}
                  isDragging={true}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Todo detail modal */}
      <TodoDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        todo={selectedTodo}
        onSave={handleDetailSave}
        onCreateIssue={onCreateIssue}
        repoName={selectedTodo ? repoMap.get(selectedTodo.repoId) : undefined}
      />
    </div>
  );
};
