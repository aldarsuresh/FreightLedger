import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useSyncStore } from '../store/syncStore';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const { setStatus } = useSyncStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(!!connected);
      setStatus(connected ? 'idle' : 'offline');
    });
    return () => unsubscribe();
  }, [setStatus]);

  return { isConnected };
}
