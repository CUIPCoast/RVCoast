// config/rvConnection.js - Single source of truth for the RV server connection
import { EventEmitter } from 'events';

export const RV_CONNECTION_CONFIG = {
  // Set to false when you know you're not on the RV network.
  // Nothing will try to connect and no connection errors will be logged.
  enabled: true,

  host: '192.168.8.200',
  port: 3000,

  // How often to check whether the RV server is reachable
  probeIntervalMs: 10000,
  probeTimeoutMs: 3000,
};

const { host, port } = RV_CONNECTION_CONFIG;
export const RV_HTTP_URL = `http://${host}:${port}`;
export const RV_API_URL = `${RV_HTTP_URL}/api`;
export const RV_WS_URL = `ws://${host}:${port}`;

/**
 * Probes the RV server and tells services when it's reachable.
 * Services wait on whenOnline() instead of retrying against a server that isn't there,
 * so they connect automatically once the RV network becomes available.
 */
class RVConnectionMonitor extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.online = false;
    this.checked = false;
    this.probing = false;
    this.probeTimer = null;

    if (RV_CONNECTION_CONFIG.enabled) {
      this.probe();
    } else {
      console.log('RVConnection: Disabled in config/rvConnection.js - not connecting to RV server');
    }
  }

  isEnabled() {
    return RV_CONNECTION_CONFIG.enabled;
  }

  isOnline() {
    return RV_CONNECTION_CONFIG.enabled && this.online;
  }

  // True once we know the server can't be reached (disabled, or a probe has failed)
  isKnownOffline() {
    return !RV_CONNECTION_CONFIG.enabled || (this.checked && !this.online);
  }

  async probe() {
    if (!RV_CONNECTION_CONFIG.enabled || this.probing) return;
    this.probing = true;
    clearTimeout(this.probeTimer);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RV_CONNECTION_CONFIG.probeTimeoutMs);
    let reachable = false;

    try {
      // Any HTTP response means the server is up
      await fetch(`${RV_API_URL}/status`, { signal: controller.signal });
      reachable = true;
    } catch (error) {
      reachable = false;
    } finally {
      clearTimeout(timeout);
    }

    this.probing = false;
    this.checked = true;
    this.setOnline(reachable);
    this.probeTimer = setTimeout(() => this.probe(), RV_CONNECTION_CONFIG.probeIntervalMs);
  }

  setOnline(online) {
    if (online === this.online) return;
    this.online = online;

    if (online) {
      console.log(`RVConnection: RV server reachable at ${RV_HTTP_URL}`);
      this.emit('online');
    } else {
      console.log('RVConnection: RV server not reachable - will connect automatically when available');
      this.emit('offline');
    }
  }

  // Called by services when a request or socket fails, so everyone backs off until the next probe succeeds
  reportFailure() {
    if (this.online) {
      this.setOnline(false);
    }
  }

  /**
   * Run callback as soon as the server is reachable (immediately if it already is).
   * @returns {Function} cancel function
   */
  whenOnline(callback) {
    if (this.isOnline()) {
      callback();
      return () => {};
    }
    if (!RV_CONNECTION_CONFIG.enabled) {
      return () => {};
    }
    this.once('online', callback);
    return () => this.off('online', callback);
  }
}

export const RVConnection = new RVConnectionMonitor();

/**
 * Only log connection errors while the server is supposed to be reachable.
 */
export function logRVError(...args) {
  if (!RVConnection.isKnownOffline()) {
    console.error(...args);
  }
}

/**
 * Axios interceptors: fail fast on background reads (GET polling) while the server is known
 * offline instead of waiting for the full timeout, and mark the server offline when a request
 * gets no response. Commands (POST etc.) are always sent - a stale "offline" flag must never
 * swallow a button press.
 */
export function attachRVConnectionInterceptors(axiosInstance) {
  axiosInstance.interceptors.request.use((config) => {
    const isRead = (config.method || 'get').toLowerCase() === 'get';
    if (isRead && RVConnection.isKnownOffline()) {
      const error = new Error('RV server not reachable');
      error.isRVOffline = true;
      return Promise.reject(error);
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      // Any response proves the server is reachable - don't wait for the next probe
      RVConnection.setOnline(true);
      return response;
    },
    (error) => {
      if (error.response) {
        RVConnection.setOnline(true);
      } else if (!error.isRVOffline) {
        RVConnection.reportFailure();
      }
      return Promise.reject(error);
    }
  );
}
