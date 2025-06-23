export const config = {
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3002',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};