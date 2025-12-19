/**
 * Background sync worker for GitHub Issues
 */

import { getIssueSyncConfig, saveSyncState, getSyncState } from './todoStorage';
import { syncTodosWithIssues } from './issueSync';

/**
 * Sync worker class
 */
export class IssueSyncWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private accountId: string;
  private repos: Map<string, { repoId: string; nameWithOwner: string }> = new Map();

  constructor(accountId: string) {
    this.accountId = accountId;
  }

  /**
   * Register a repository for syncing
   */
  registerRepo(repoId: string, nameWithOwner: string): void {
    this.repos.set(repoId, { repoId, nameWithOwner });
  }

  /**
   * Unregister a repository
   */
  unregisterRepo(repoId: string): void {
    this.repos.delete(repoId);
  }

  /**
   * Start the sync worker
   */
  start(): void {
    // Stop existing worker if any
    this.stop();

    // Get sync config
    const config = getIssueSyncConfig(this.accountId);

    if (!config.enabled) {
      return;
    }

    // Schedule sync
    const intervalMs = config.syncInterval * 60 * 1000; // Convert minutes to milliseconds
    this.intervalId = setInterval(() => {
      this.syncAll();
    }, intervalMs);

    // Run initial sync
    this.syncAll();
  }

  /**
   * Stop the sync worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Sync all registered repositories
   */
  async syncAll(): Promise<void> {
    const config = getIssueSyncConfig(this.accountId);

    if (!config.enabled) {
      return;
    }

    // Check if sync is already in progress
    const syncState = getSyncState(this.accountId);
    if (syncState.syncInProgress) {
      console.log('[IssueSyncWorker] Sync already in progress, skipping');
      return;
    }

    // Mark sync as in progress
    saveSyncState(this.accountId, {
      syncInProgress: true,
    });

    try {
      console.log(`[IssueSyncWorker] Starting sync for ${this.repos.size} repositories`);

      // Sync each repository
      for (const repo of this.repos.values()) {
        try {
          const result = await syncTodosWithIssues(
            this.accountId,
            repo.repoId,
            repo.nameWithOwner
          );

          console.log(
            `[IssueSyncWorker] Synced ${repo.nameWithOwner}: ${result.syncedCount} synced, ${result.importedCount} imported`
          );

          if (result.errors.length > 0) {
            console.error(`[IssueSyncWorker] Errors for ${repo.nameWithOwner}:`, result.errors);
          }
        } catch (error) {
          console.error(`[IssueSyncWorker] Failed to sync ${repo.nameWithOwner}:`, error);
        }
      }

      // Update last sync time
      saveSyncState(this.accountId, {
        lastSyncAt: new Date().toISOString(),
        syncInProgress: false,
      });

      console.log('[IssueSyncWorker] Sync completed');
    } catch (error) {
      console.error('[IssueSyncWorker] Sync failed:', error);

      // Mark sync as complete (failed)
      saveSyncState(this.accountId, {
        syncInProgress: false,
      });
    }
  }

  /**
   * Sync a specific repository immediately
   */
  async syncRepo(repoId: string): Promise<void> {
    const repo = this.repos.get(repoId);
    if (!repo) {
      throw new Error(`Repository ${repoId} not registered`);
    }

    const config = getIssueSyncConfig(this.accountId);
    if (!config.enabled) {
      throw new Error('Sync is disabled');
    }

    console.log(`[IssueSyncWorker] Manually syncing ${repo.nameWithOwner}`);

    const result = await syncTodosWithIssues(
      this.accountId,
      repo.repoId,
      repo.nameWithOwner
    );

    console.log(
      `[IssueSyncWorker] Sync completed for ${repo.nameWithOwner}: ${result.syncedCount} synced, ${result.importedCount} imported`
    );

    // Update last sync time
    saveSyncState(this.accountId, {
      lastSyncAt: new Date().toISOString(),
      syncInProgress: false,
    });

    return;
  }
}

/**
 * Global sync worker instance
 */
let globalSyncWorker: IssueSyncWorker | null = null;

/**
 * Get or create the global sync worker
 */
export function getSyncWorker(accountId: string): IssueSyncWorker {
  if (!globalSyncWorker || globalSyncWorker['accountId'] !== accountId) {
    globalSyncWorker = new IssueSyncWorker(accountId);
  }
  return globalSyncWorker;
}

/**
 * Initialize sync worker for a user
 */
export function initSyncWorker(accountId: string): IssueSyncWorker {
  const worker = getSyncWorker(accountId);
  worker.start();
  return worker;
}

/**
 * Cleanup sync worker
 */
export function cleanupSyncWorker(): void {
  if (globalSyncWorker) {
    globalSyncWorker.stop();
    globalSyncWorker = null;
  }
}
