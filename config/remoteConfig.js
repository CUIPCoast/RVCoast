// config/remoteConfig.js
export const RemoteConfig = {
  
  CLOUDFLARE_URL: 'https://rv-control.yourdomain.com', 
  
  // For WebSocket connections
  CLOUDFLARE_WS_URL: 'wss://rv-control.yourdomain.com', 
  
  // Optional
  CLOUDFLARE_AUTH_TOKEN: '', 
  
  // app's auth token (for your server)
  APP_AUTH_TOKEN: 'your-secure-app-token-here',
  
  // Flag to enable/disable remote access
  USE_REMOTE_ACCESS: true,
  
  // Local network config (as fallback)
  LOCAL_API_URL: 'http://192.168.8.200:3000',
  LOCAL_WS_URL: 'ws://192.168.8.200:3000'
};