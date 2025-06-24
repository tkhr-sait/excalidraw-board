// WebSocket connection helper utilities

/**
 * Get the current device's local IP address (browser-side detection)
 * This is a helper function that returns possible WebSocket URLs based on current location
 */
export function generateWebSocketUrls(): string[] {
  if (typeof window === 'undefined') {
    return ['http://localhost:3002'];
  }

  const { protocol, hostname } = window.location;
  const isSecure = protocol === 'https:';
  const wsProtocol = isSecure ? 'wss:' : 'ws:';
  const httpProtocol = isSecure ? 'https:' : 'http:';
  
  const urls: string[] = [];
  
  // 1. Same host as frontend with WebSocket port
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    urls.push(`${wsProtocol}//${hostname}:3002`);
    urls.push(`${httpProtocol}//${hostname}:3002`);
  }
  
  // 2. Common local network patterns
  if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
    urls.push(`${wsProtocol}//${hostname}:3002`);
    urls.push(`${httpProtocol}//${hostname}:3002`);
  }
  
  // 3. Localhost variations
  urls.push('http://localhost:3002');
  urls.push('ws://localhost:3002');
  urls.push('http://127.0.0.1:3002');
  
  return urls;
}

/**
 * Validate WebSocket URL format
 */
export function isValidWebSocketUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Test WebSocket connection (for diagnostic purposes)
 */
export async function testWebSocketConnection(url: string, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const testSocket = new WebSocket(url.replace(/^http/, 'ws'));
    const timeoutId = setTimeout(() => {
      testSocket.close();
      resolve(false);
    }, timeout);

    testSocket.onopen = () => {
      clearTimeout(timeoutId);
      testSocket.close();
      resolve(true);
    };

    testSocket.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };
  });
}

/**
 * Get connection status message for user display
 */
export function getConnectionStatusMessage(isConnected: boolean, currentUrl?: string): string {
  if (isConnected) {
    return `Connected to ${currentUrl || 'WebSocket server'}`;
  } else {
    return 'Connecting to WebSocket server...';
  }
}