// config/remoteConfig.js - Updated for UTC reverse proxy
export const RemoteConfig = {
  
  // UTC Research reverse proxy URL
  REMOTE_API_URL: 'http://roadaware.cuip.research.utc.edu/rv-control',
  REMOTE_WS_URL: 'ws://roadaware.cuip.research.utc.edu/rv-control',
  
  // Local network config (RV WiFi network)
  LOCAL_API_URL: 'http://192.168.8.245:3000',
  LOCAL_WS_URL: 'ws://192.168.8.245:3000',
  
  // Auto-detection logic
  USE_REMOTE_ACCESS: typeof window !== 'undefined' && 
    !window.location.hostname.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/),
  
  // Get the appropriate base URL
  getBaseURL: () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // If accessing via the UTC domain, use relative paths
      if (hostname === 'roadaware.cuip.research.utc.edu') {
        return '/rv-control/api';
      }
      
      // If on local network, use local URL
      if (hostname.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
        return RemoteConfig.LOCAL_API_URL + '/api';
      }
    }
    
    // Default to remote
    return RemoteConfig.REMOTE_API_URL + '/api';
  },
  
  // Get the appropriate WebSocket URL
  getWebSocketURL: () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // If accessing via the UTC domain
      if (hostname === 'roadaware.cuip.research.utc.edu') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${hostname}/rv-control`;
      }
      
      // If on local network
      if (hostname.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
        return RemoteConfig.LOCAL_WS_URL;
      }
    }
    
    // Default to remote
    return RemoteConfig.REMOTE_WS_URL;
  }
};

// Auto-configure based on environment
export const API_CONFIG = {
  baseURL: RemoteConfig.getBaseURL(),
  wsURL: RemoteConfig.getWebSocketURL(),
  timeout: 15000
};