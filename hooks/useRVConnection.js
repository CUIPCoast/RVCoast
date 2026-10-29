// hooks/useRVConnection.js - Live RV server reachability from config/rvConnection.js
import { useEffect, useState } from 'react';
import { RVConnection } from '../config/rvConnection';

const getStatus = () => {
  if (RVConnection.isOnline()) return 'online';
  if (RVConnection.isKnownOffline()) return 'offline';
  return 'checking';
};

/**
 * @returns {'online' | 'offline' | 'checking'}
 */
export default function useRVConnection() {
  const [status, setStatus] = useState(getStatus);

  useEffect(() => {
    const update = () => setStatus(getStatus());
    RVConnection.on('online', update);
    RVConnection.on('offline', update);
    // The first probe can finish while offline without emitting (online starts false), so re-check
    const timer = setInterval(update, 2000);
    update();
    return () => {
      RVConnection.off('online', update);
      RVConnection.off('offline', update);
      clearInterval(timer);
    };
  }, []);

  return status;
}
