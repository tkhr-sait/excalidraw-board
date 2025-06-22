/**
 * Test fixtures and data management for E2E tests
 */

export interface TestShape {
  type: 'rectangle' | 'ellipse' | 'arrow' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
}

export const testShapes = {
  rectangle: {
    type: 'rectangle' as const,
    x: 100,
    y: 100,
    width: 200,
    height: 150,
  },
  smallRectangle: {
    type: 'rectangle' as const,
    x: 50,
    y: 50,
    width: 100,
    height: 80,
  },
  ellipse: {
    type: 'ellipse' as const,
    x: 350,
    y: 100,
    width: 150,
    height: 150,
  },
  arrow: {
    type: 'arrow' as const,
    x: 100,
    y: 300,
    endX: 300,
    endY: 400,
  },
  line: {
    type: 'line' as const,
    x: 200,
    y: 200,
    endX: 400,
    endY: 200,
  },
} as const;

export const testRooms = {
  getUniqueRoomId: (prefix: string = 'test'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  },
  
  basicRoom: 'integration-basic-test',
  collaborationRoom: 'integration-collab-test',
  performanceRoom: 'integration-perf-test',
  errorHandlingRoom: 'integration-error-test',
} as const;

export const testUsers = {
  user1: {
    name: 'TestUser1',
    color: '#ff0000',
    id: 'test-user-1',
  },
  user2: {
    name: 'TestUser2',
    color: '#00ff00',
    id: 'test-user-2',
  },
  user3: {
    name: 'TestUser3',
    color: '#0000ff',
    id: 'test-user-3',
  },
} as const;

export const performanceTestData = {
  // Generate multiple shapes for performance testing
  generateShapes: (count: number): TestShape[] => {
    const shapes: TestShape[] = [];
    const shapeTypes: TestShape['type'][] = ['rectangle', 'ellipse'];
    
    for (let i = 0; i < count; i++) {
      const type = shapeTypes[i % shapeTypes.length];
      const row = Math.floor(i / 10);
      const col = i % 10;
      
      shapes.push({
        type,
        x: col * 60 + 50,
        y: row * 60 + 50,
        width: 50,
        height: 50,
      });
    }
    
    return shapes;
  },
  
  // Stress test configurations
  lightLoad: { shapeCount: 10, userCount: 2 },
  mediumLoad: { shapeCount: 50, userCount: 3 },
  heavyLoad: { shapeCount: 100, userCount: 5 },
} as const;

export const testScenarios = {
  // Basic drawing workflow
  basicDrawing: {
    name: 'Basic Drawing Workflow',
    steps: [
      { action: 'navigate', roomId: 'basic-drawing' },
      { action: 'waitForConnection' },
      { action: 'draw', shape: testShapes.rectangle },
      { action: 'draw', shape: testShapes.ellipse },
      { action: 'screenshot', name: 'basic-drawing-complete' },
    ],
  },
  
  // Collaboration workflow
  collaboration: {
    name: 'Real-time Collaboration',
    userCount: 2,
    steps: [
      { action: 'navigate', roomId: 'collaboration-test' },
      { action: 'waitForAllUsers' },
      { action: 'user1Draw', shape: testShapes.rectangle },
      { action: 'waitForSync' },
      { action: 'user2Draw', shape: testShapes.ellipse },
      { action: 'waitForSync' },
      { action: 'screenshotAll', name: 'collaboration-complete' },
    ],
  },
  
  // Error recovery workflow
  errorRecovery: {
    name: 'Error Recovery',
    steps: [
      { action: 'navigate', roomId: 'error-recovery' },
      { action: 'waitForConnection' },
      { action: 'draw', shape: testShapes.rectangle },
      { action: 'simulateDisconnection' },
      { action: 'waitForOfflineIndicator' },
      { action: 'draw', shape: testShapes.ellipse }, // Should work offline
      { action: 'restoreConnection' },
      { action: 'waitForReconnection' },
      { action: 'screenshot', name: 'error-recovery-complete' },
    ],
  },
} as const;

export const testTimeouts = {
  connection: 10000,
  sync: 5000,
  drawing: 3000,
  pageLoad: 15000,
  animation: 1000,
  networkSimulation: 2000,
} as const;

export const testAssertion = {
  // Common assertions
  shouldBeConnected: async (page: any) => {
    await page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', {
      timeout: testTimeouts.connection,
    });
  },
  
  shouldShowUserCount: async (page: any, count: number) => {
    await page.waitForSelector(`[data-testid="user-count"]:has-text("${count}")`, {
      timeout: testTimeouts.sync,
    });
  },
  
  shouldHaveCanvas: async (page: any) => {
    await page.waitForSelector('canvas', { timeout: testTimeouts.pageLoad });
  },
} as const;

export class TestDataManager {
  private static usedRoomIds = new Set<string>();
  
  static getCleanRoomId(prefix: string = 'test'): string {
    let roomId: string;
    do {
      roomId = testRooms.getUniqueRoomId(prefix);
    } while (this.usedRoomIds.has(roomId));
    
    this.usedRoomIds.add(roomId);
    return roomId;
  }
  
  static cleanup(): void {
    this.usedRoomIds.clear();
  }
  
  static generateTestReport(testName: string, results: any): string {
    return JSON.stringify({
      testName,
      timestamp: new Date().toISOString(),
      results,
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      },
    }, null, 2);
  }
}