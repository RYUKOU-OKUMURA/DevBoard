/**
 * Unit tests for todoStorage utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTodos,
  saveTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getTodoById,
  getTodosByRepo,
  getTodoStats,
  getOverdueTodos,
  bulkUpdateTodos,
  clearCompletedTodos,
} from '../todoStorage';
import type { Todo } from '../../types/todo';

// Mock localStorage (Node環境用に window をポリフィル)
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

const globalAny = globalThis as unknown as {
  window?: {
    localStorage?: typeof localStorageMock;
  };
  localStorage?: typeof localStorageMock;
};

if (!globalAny.window) {
  globalAny.window = {};
}

Object.defineProperty(globalAny.window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(globalAny, 'localStorage', {
  value: localStorageMock,
});

describe('todoStorage', () => {
  const testAccountId = 'test-account-123';
  const testRepoId = 'repo-456';

  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getTodos and saveTodos', () => {
    it('should return empty array when no todos exist', () => {
      const todos = getTodos(testAccountId);
      expect(todos).toEqual([]);
    });

    it('should save and retrieve todos', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test description',
          repoId: testRepoId,
          status: 'todo',
          priority: 'high',
          labels: ['bug'],
          syncEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      saveTodos(testAccountId, testTodos);
      const retrieved = getTodos(testAccountId);

      expect(retrieved).toEqual(testTodos);
    });
  });

  describe('createTodo', () => {
    it('should create a new todo with auto-generated fields', () => {
      const todoData = {
        title: 'New Todo',
        description: 'Description',
        repoId: testRepoId,
        status: 'todo' as const,
        priority: 'medium' as const,
        labels: [],
        syncEnabled: false,
      };

      const created = createTodo(testAccountId, todoData);

      expect(created.id).toBeDefined();
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
      expect(created.title).toBe(todoData.title);
      expect(created.description).toBe(todoData.description);
    });

    it('should add todo to storage', () => {
      const todoData = {
        title: 'Test Todo',
        repoId: testRepoId,
        status: 'todo' as const,
        priority: 'low' as const,
        labels: [],
        syncEnabled: false,
      };

      createTodo(testAccountId, todoData);
      const todos = getTodos(testAccountId);

      expect(todos).toHaveLength(1);
      expect(todos[0]!.title).toBe(todoData.title);
    });
  });

  describe('updateTodo', () => {
    it('should update existing todo', () => {
      const todo = createTodo(testAccountId, {
        title: 'Original Title',
        repoId: testRepoId,
        status: 'todo',
        priority: 'medium',
        labels: [],
        syncEnabled: false,
      });

      const updated = updateTodo(testAccountId, todo.id, {
        title: 'Updated Title',
        status: 'in_progress',
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.status).toBe('in_progress');
      expect(updated?.updatedAt).not.toBe(todo.updatedAt);
    });

    it('should set completedAt when status changes to done', () => {
      const todo = createTodo(testAccountId, {
        title: 'Test',
        repoId: testRepoId,
        status: 'in_progress',
        priority: 'high',
        labels: [],
        syncEnabled: false,
      });

      const updated = updateTodo(testAccountId, todo.id, { status: 'done' });

      expect(updated?.completedAt).toBeDefined();
    });

    it('should return null for non-existent todo', () => {
      const result = updateTodo(testAccountId, 'non-existent-id', { title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTodo', () => {
    it('should delete existing todo', () => {
      const todo = createTodo(testAccountId, {
        title: 'To Delete',
        repoId: testRepoId,
        status: 'todo',
        priority: 'low',
        labels: [],
        syncEnabled: false,
      });

      const result = deleteTodo(testAccountId, todo.id);
      expect(result).toBe(true);

      const todos = getTodos(testAccountId);
      expect(todos).toHaveLength(0);
    });

    it('should return false for non-existent todo', () => {
      const result = deleteTodo(testAccountId, 'non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getTodoById', () => {
    it('should retrieve todo by id', () => {
      const todo = createTodo(testAccountId, {
        title: 'Find Me',
        repoId: testRepoId,
        status: 'todo',
        priority: 'high',
        labels: [],
        syncEnabled: false,
      });

      const found = getTodoById(testAccountId, todo.id);
      expect(found).toEqual(todo);
    });

    it('should return null for non-existent id', () => {
      const result = getTodoById(testAccountId, 'non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getTodosByRepo', () => {
    it('should filter todos by repository', () => {
      const repo1 = 'repo-1';
      const repo2 = 'repo-2';

      createTodo(testAccountId, {
        title: 'Repo 1 Todo',
        repoId: repo1,
        status: 'todo',
        priority: 'medium',
        labels: [],
        syncEnabled: false,
      });

      createTodo(testAccountId, {
        title: 'Repo 2 Todo',
        repoId: repo2,
        status: 'todo',
        priority: 'medium',
        labels: [],
        syncEnabled: false,
      });

      const repo1Todos = getTodosByRepo(testAccountId, repo1);
      expect(repo1Todos).toHaveLength(1);
      expect(repo1Todos[0]!.title).toBe('Repo 1 Todo');
    });
  });

  describe('getTodoStats', () => {
    it('should calculate correct statistics', () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);

      // Create todos with different statuses and due dates
      createTodo(testAccountId, {
        title: 'Todo 1',
        repoId: testRepoId,
        status: 'todo',
        priority: 'high',
        labels: [],
        syncEnabled: false,
        dueDate: yesterday.toISOString(), // Overdue
      });

      createTodo(testAccountId, {
        title: 'Todo 2',
        repoId: testRepoId,
        status: 'in_progress',
        priority: 'medium',
        labels: [],
        syncEnabled: false,
        dueDate: tomorrow.toISOString(),
      });

      createTodo(testAccountId, {
        title: 'Todo 3',
        repoId: testRepoId,
        status: 'done',
        priority: 'low',
        labels: [],
        syncEnabled: false,
      });

      const stats = getTodoStats(testAccountId);

      expect(stats.total).toBe(3);
      expect(stats.todo).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getOverdueTodos', () => {
    it('should return only overdue todos', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      createTodo(testAccountId, {
        title: 'Overdue',
        repoId: testRepoId,
        status: 'todo',
        priority: 'high',
        labels: [],
        syncEnabled: false,
        dueDate: yesterday.toISOString(),
      });

      createTodo(testAccountId, {
        title: 'Not Overdue',
        repoId: testRepoId,
        status: 'todo',
        priority: 'medium',
        labels: [],
        syncEnabled: false,
        dueDate: tomorrow.toISOString(),
      });

      const overdue = getOverdueTodos(testAccountId);
      expect(overdue).toHaveLength(1);
      expect(overdue[0]!.title).toBe('Overdue');
    });

    it('should not include completed todos', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      createTodo(testAccountId, {
        title: 'Completed Overdue',
        repoId: testRepoId,
        status: 'done',
        priority: 'high',
        labels: [],
        syncEnabled: false,
        dueDate: yesterday.toISOString(),
      });

      const overdue = getOverdueTodos(testAccountId);
      expect(overdue).toHaveLength(0);
    });
  });

  describe('bulkUpdateTodos', () => {
    it('should update multiple todos at once', () => {
      const todo1 = createTodo(testAccountId, {
        title: 'Todo 1',
        repoId: testRepoId,
        status: 'todo',
        priority: 'low',
        labels: [],
        syncEnabled: false,
      });

      const todo2 = createTodo(testAccountId, {
        title: 'Todo 2',
        repoId: testRepoId,
        status: 'todo',
        priority: 'low',
        labels: [],
        syncEnabled: false,
      });

      const updated = bulkUpdateTodos(testAccountId, [todo1.id, todo2.id], {
        priority: 'high',
      });

      expect(updated).toHaveLength(2);
      expect(updated[0]!.priority).toBe('high');
      expect(updated[1]!.priority).toBe('high');
    });
  });

  describe('clearCompletedTodos', () => {
    it('should remove all completed todos', () => {
      createTodo(testAccountId, {
        title: 'Active',
        repoId: testRepoId,
        status: 'todo',
        priority: 'medium',
        labels: [],
        syncEnabled: false,
      });

      createTodo(testAccountId, {
        title: 'Done 1',
        repoId: testRepoId,
        status: 'done',
        priority: 'low',
        labels: [],
        syncEnabled: false,
      });

      createTodo(testAccountId, {
        title: 'Done 2',
        repoId: testRepoId,
        status: 'done',
        priority: 'low',
        labels: [],
        syncEnabled: false,
      });

      clearCompletedTodos(testAccountId);
      const todos = getTodos(testAccountId);

      expect(todos).toHaveLength(1);
      expect(todos[0]!.title).toBe('Active');
    });
  });
});
