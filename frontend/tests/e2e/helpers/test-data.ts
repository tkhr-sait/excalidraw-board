/**
 * Test data and utilities for E2E tests
 */

export const TestRoomIds = {
  BASIC: 'test-basic-room',
  COLLABORATION: 'test-collab-room',
  PERFORMANCE: 'test-perf-room',
  ERROR_HANDLING: 'test-error-room',
} as const;

export const TestShapes = {
  RECTANGLE: {
    x: 100,
    y: 100,
    width: 200,
    height: 150,
  },
  CIRCLE: {
    x: 300,
    y: 100,
    radius: 75,
  },
  SMALL_RECTANGLE: {
    x: 50,
    y: 50,
    width: 100,
    height: 80,
  },
} as const;

export const TestTimeouts = {
  CONNECTION: 10000,
  SYNC: 5000,
  LOAD: 15000,
  ANIMATION: 1000,
} as const;

export const TestSelectors = {
  EXCALIDRAW_CONTAINER: '.excalidraw',
  CANVAS: 'canvas',
  TOOLBAR_RECTANGLE: '[data-testid="toolbar-rectangle"]',
  TOOLBAR_ELLIPSE: '[data-testid="toolbar-ellipse"]',
  TOOLBAR_ARROW: '[data-testid="toolbar-arrow"]',
  TOOLBAR_TEXT: '[data-testid="toolbar-text"]',
  TOOLBAR_SELECTION: '[data-testid="toolbar-selection"]',
} as const;

export const TestUsers = {
  USER_1: {
    name: 'Alice',
    color: '#ff0000',
  },
  USER_2: {
    name: 'Bob',
    color: '#00ff00',
  },
  USER_3: {
    name: 'Charlie',
    color: '#0000ff',
  },
} as const;

/**
 * Utility functions for test data generation
 */
export class TestDataUtils {
  /**
   * Generates a random room ID with optional prefix
   */
  static generateRoomId(prefix: string = 'test'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generates random coordinates within canvas bounds
   */
  static generateRandomCoordinates(
    canvasWidth: number = 800,
    canvasHeight: number = 600,
    margin: number = 50
  ): { x: number; y: number } {
    return {
      x: margin + Math.random() * (canvasWidth - 2 * margin),
      y: margin + Math.random() * (canvasHeight - 2 * margin),
    };
  }

  /**
   * Generates random shape dimensions
   */
  static generateRandomShapeDimensions(): { width: number; height: number; radius: number } {
    return {
      width: 50 + Math.random() * 200,
      height: 50 + Math.random() * 200,
      radius: 25 + Math.random() * 100,
    };
  }

  /**
   * Creates test data for performance testing
   */
  static generatePerformanceTestData(shapeCount: number = 100) {
    const shapes = [];
    
    for (let i = 0; i < shapeCount; i++) {
      const coords = this.generateRandomCoordinates();
      const dimensions = this.generateRandomShapeDimensions();
      
      shapes.push({
        type: i % 2 === 0 ? 'rectangle' : 'circle',
        ...coords,
        ...dimensions,
        id: `perf-shape-${i}`,
      });
    }
    
    return shapes;
  }

  /**
   * Waits for a specific condition with timeout
   */
  static async waitForCondition(
    conditionFn: () => Promise<boolean>,
    timeoutMs: number = 5000,
    checkIntervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await conditionFn()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }
}