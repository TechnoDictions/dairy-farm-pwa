'use client';

import { useEffect, useState } from 'react';
import { syncEngine, SyncStatus } from '../services/syncEngine';

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    syncError: null
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(newStatus => {
      setStatus(newStatus);
    });

    // Initial sync trigger on mount if online
    if (navigator.onLine) {
      syncEngine.sync();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = async () => {
    return await syncEngine.sync();
  };

  return {
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    lastSyncedAt: status.lastSyncedAt,
    syncError: status.syncError,
    syncData: triggerSync
  };
}
