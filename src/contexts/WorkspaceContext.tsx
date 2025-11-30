/**
 * WorkspaceContext - Manages the selected repository and workspace state
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Repo } from '../types';

export type WorkspaceTab = 'issues' | 'prs' | 'todos' | 'ai-command';

interface WorkspaceState {
  /** Currently selected repository */
  selectedRepo: Repo | null;
  /** Whether the workspace panel is open */
  isOpen: boolean;
  /** Current active tab in the workspace */
  activeTab: WorkspaceTab;
  /** Workspace panel height */
  panelHeight: number;
}

interface WorkspaceContextValue extends WorkspaceState {
  /** Select a repository and open the workspace */
  selectRepo: (repo: Repo) => void;
  /** Clear the selected repository and close the workspace */
  clearSelection: () => void;
  /** Toggle the workspace panel */
  toggleWorkspace: () => void;
  /** Set the active tab */
  setActiveTab: (tab: WorkspaceTab) => void;
  /** Set the panel height */
  setPanelHeight: (height: number) => void;
  /** Open workspace with a specific repo and tab */
  openWorkspace: (repo: Repo, tab?: WorkspaceTab) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const DEFAULT_PANEL_HEIGHT = 350;

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('issues');
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);

  const selectRepo = useCallback((repo: Repo) => {
    setSelectedRepo(repo);
    setIsOpen(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRepo(null);
    setIsOpen(false);
  }, []);

  const toggleWorkspace = useCallback(() => {
    if (selectedRepo) {
      setIsOpen((prev) => !prev);
    }
  }, [selectedRepo]);

  const openWorkspace = useCallback((repo: Repo, tab?: WorkspaceTab) => {
    setSelectedRepo(repo);
    if (tab) {
      setActiveTab(tab);
    }
    setIsOpen(true);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      selectedRepo,
      isOpen,
      activeTab,
      panelHeight,
      selectRepo,
      clearSelection,
      toggleWorkspace,
      setActiveTab,
      setPanelHeight,
      openWorkspace,
    }),
    [
      selectedRepo,
      isOpen,
      activeTab,
      panelHeight,
      selectRepo,
      clearSelection,
      toggleWorkspace,
      openWorkspace,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;

