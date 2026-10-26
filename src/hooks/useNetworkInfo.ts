import { useEffect, useState } from 'react';
import { NetworkInfo } from '../types/mcp';

export function useNetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    port: 3000,
    appUrl: window.location.origin,
    addresses: [{ iface: 'lo', address: '127.0.0.1', family: 'IPv4', isLocal: true }],
    platform: 'android',
    androidEmulatorHost: '10.0.2.2:3000',
    localhost: '127.0.0.1:3000',
  });
  const [loading, setLoading] = useState(true);

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
      }
    } catch {
      // Fallback in case of direct static preview
      setNetworkInfo((prev) => ({
        ...prev,
        appUrl: window.location.origin,
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkInfo();
  }, []);

  return { networkInfo, refresh: fetchNetworkInfo, loading };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
