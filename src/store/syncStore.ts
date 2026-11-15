import { create } from 'zustand';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';
interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: string | null;
  setStatus: (s: SyncStatus) => void;
  setPendingCount: (c: number) => void;
  setLastSyncAt: (at: string) => void;
}
export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  pendingCount: 0,
  lastSyncAt: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}));
