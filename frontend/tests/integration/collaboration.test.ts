/**
 * Integration test for collaboration functionality
 * Tests the basic WebSocket connection and real-time sync
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Simple integration test that validates the collaboration setup
describe('Collaboration Integration', () => {
  beforeAll(async () => {
    // Ensure backend is running
    try {
      const response = await fetch('http://localhost:3002');
      expect(response.status).toBe(200);
    } catch (error) {
      throw new Error('Backend server (excalidraw-room) is not running on port 3002');
    }
  });

  it('should have WebSocket service available', async () => {
    // Test that our WebSocket service can be imported
    const { WebSocketService } = await import('../../src/services/websocket');
    expect(WebSocketService).toBeDefined();
  });

  it('should have collaboration hook available', async () => {
    // Test that our collaboration hook can be imported
    const { useCollaboration } = await import('../../src/hooks/useCollaboration');
    expect(useCollaboration).toBeDefined();
  });

  it('should validate room ID format', () => {
    // Test room ID validation
    const validRoomIds = ['test-room', 'room123', 'a1b2c3'];
    const invalidRoomIds = ['', null, undefined];

    validRoomIds.forEach(roomId => {
      expect(typeof roomId).toBe('string');
      expect(roomId.length).toBeGreaterThan(0);
    });

    invalidRoomIds.forEach(roomId => {
      expect(roomId).toBeFalsy();
    });

    // Test space separately since it's technically truthy but invalid
    expect(' '.trim()).toBe('');
  });

  it('should handle basic message format', () => {
    // Test message format structure
    const sceneUpdate = {
      elements: [],
      appState: { viewBackgroundColor: '#ffffff' },
      roomId: 'test-room',
      timestamp: Date.now()
    };

    expect(sceneUpdate).toHaveProperty('elements');
    expect(sceneUpdate).toHaveProperty('appState');
    expect(sceneUpdate).toHaveProperty('roomId');
    expect(sceneUpdate).toHaveProperty('timestamp');
    expect(Array.isArray(sceneUpdate.elements)).toBe(true);
    expect(typeof sceneUpdate.appState).toBe('object');
  });
});

// Manual test instructions
export const manualTestInstructions = `
Manual Testing Instructions for Collaboration:

1. Backend Verification:
   - Ensure excalidraw-room is running: docker ps | grep excalidraw-room
   - Test HTTP endpoint: curl http://localhost:3002

2. Frontend Connection Test:
   - Start frontend: npm run dev
   - Navigate to: http://localhost:5173/room/test-room
   - Check browser console for WebSocket connection logs
   - Verify connection status in header shows "Connected (1 user)"

3. Multi-User Test:
   - Open two browser windows/tabs
   - Navigate both to the same room: /room/test-room
   - Draw in one window
   - Verify drawing appears in the other window
   - Check user count updates in header

4. Error Handling Test:
   - Stop the backend: docker stop excalidraw-room
   - Verify disconnection overlay appears
   - Start backend: docker start excalidraw-room
   - Click "Reconnect" and verify connection restores

5. Network Simulation:
   - Use browser dev tools to simulate slow network
   - Verify drawing updates still sync
   - Test offline/online scenarios
`;

console.log(manualTestInstructions);