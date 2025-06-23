import '@testing-library/jest-dom'
import React from 'react'

// Mock Excalidraw
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: ({ children, ...props }: any) => 
    React.createElement('div', { 'data-testid': 'excalidraw-mock', ...props }, children),
}));

// Mock WebSocket for testing
global.WebSocket = class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    
    // Simulate async connection
    setTimeout(() => {
      if (url.includes('invalid')) {
        this.readyState = MockWebSocket.CLOSED;
        this.onerror?.(new Event('error'));
      } else {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.(new Event('open'));
        
        // Send test message
        setTimeout(() => {
          this.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify({ type: 'test-response', payload: {} })
          }));
        }, 10);
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState === MockWebSocket.OPEN) {
      // Echo back the message
      setTimeout(() => {
        this.onmessage?.(new MessageEvent('message', {
          data: data
        }));
      }, 10);
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
} as any;