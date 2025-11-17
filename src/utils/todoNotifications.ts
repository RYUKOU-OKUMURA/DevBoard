/**
 * Browser notification utilities for TODO due dates
 */

import type { Todo } from '../types/todo';

// Permission states
export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Check if notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show a browser notification for a TODO
 */
export function showTodoNotification(
  todo: Todo,
  options: {
    title: string;
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
): Notification | null {
  if (!canShowNotifications()) {
    return null;
  }

  const notification = new Notification(options.title, {
    body: options.body || todo.title,
    icon: options.icon || '/icon-192x192.png',
    tag: options.tag || `todo-${todo.id}`,
    requireInteraction: false,
    silent: false,
  });

  if (options.onClick) {
    notification.onclick = () => {
      options.onClick!();
      notification.close();
      window.focus();
    };
  }

  return notification;
}

/**
 * Show notification for overdue TODO
 */
export function notifyOverdue(todo: Todo, repoName: string, onClick?: () => void): void {
  showTodoNotification(todo, {
    title: '⚠️ TODO Overdue',
    body: `"${todo.title}" in ${repoName} is overdue!`,
    tag: `overdue-${todo.id}`,
    onClick,
  });
}

/**
 * Show notification for TODO due today
 */
export function notifyDueToday(todo: Todo, repoName: string, onClick?: () => void): void {
  showTodoNotification(todo, {
    title: '📅 TODO Due Today',
    body: `"${todo.title}" in ${repoName} is due today`,
    tag: `due-today-${todo.id}`,
    onClick,
  });
}

/**
 * Show notification for TODO due soon (1 hour before)
 */
export function notifyDueSoon(todo: Todo, repoName: string, onClick?: () => void): void {
  showTodoNotification(todo, {
    title: '⏰ TODO Due Soon',
    body: `"${todo.title}" in ${repoName} is due in 1 hour`,
    tag: `due-soon-${todo.id}`,
    onClick,
  });
}

/**
 * Check TODOs and show notifications for due items
 */
export function checkAndNotifyDueTodos(
  todos: Todo[],
  repoMap: Map<string, string>,
  onTodoClick?: (todo: Todo) => void
): void {
  if (!canShowNotifications()) {
    return;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  todos.forEach((todo) => {
    // Skip completed todos
    if (todo.status === 'done' || !todo.dueDate) {
      return;
    }

    const dueDate = new Date(todo.dueDate);
    const repoName = repoMap.get(todo.repoId) || 'Unknown Repository';
    const onClick = onTodoClick ? () => onTodoClick(todo) : undefined;

    // Check if overdue
    if (dueDate < now) {
      notifyOverdue(todo, repoName, onClick);
    }
    // Check if due in the next hour
    else if (dueDate <= oneHourFromNow && dueDate > now) {
      notifyDueSoon(todo, repoName, onClick);
    }
    // Check if due today (9am notification)
    else if (dueDate >= today && dueDate < tomorrow && now.getHours() === 9 && now.getMinutes() === 0) {
      notifyDueToday(todo, repoName, onClick);
    }
  });
}

/**
 * Schedule periodic checks for due TODOs
 * Returns a cleanup function to stop the checks
 */
export function scheduleDueTodoChecks(
  getTodos: () => Todo[],
  repoMap: Map<string, string>,
  onTodoClick?: (todo: Todo) => void,
  intervalMinutes: number = 15
): () => void {
  // Initial check
  checkAndNotifyDueTodos(getTodos(), repoMap, onTodoClick);

  // Schedule periodic checks
  const intervalId = setInterval(() => {
    checkAndNotifyDueTodos(getTodos(), repoMap, onTodoClick);
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Storage key for notification settings
 */
const NOTIFICATION_SETTINGS_KEY = 'github-dashboard-todo-notifications';

/**
 * Notification settings
 */
export interface TodoNotificationSettings {
  enabled: boolean;
  checkInterval: number; // minutes
  notifyOverdue: boolean;
  notifyDueToday: boolean;
  notifyDueSoon: boolean; // 1 hour before
}

/**
 * Get notification settings from localStorage
 */
export function getNotificationSettings(): TodoNotificationSettings {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load notification settings:', error);
  }

  // Default settings
  return {
    enabled: false,
    checkInterval: 15,
    notifyOverdue: true,
    notifyDueToday: true,
    notifyDueSoon: true,
  };
}

/**
 * Save notification settings to localStorage
 */
export function saveNotificationSettings(settings: TodoNotificationSettings): boolean {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to save notification settings:', error);
    return false;
  }
}
