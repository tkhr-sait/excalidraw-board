export class MemoryManager {
  private static cleanupFunctions: (() => void)[] = [];

  static registerCleanup(fn: () => void): void {
    this.cleanupFunctions.push(fn);
  }

  static cleanup(): void {
    this.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    });
    this.cleanupFunctions = [];
  }

  static measureMemoryUsage(): {
    heap: number;
    heapPercent: number;
  } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        heap: memory.usedJSHeapSize,
        heapPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return { heap: 0, heapPercent: 0 };
  }

  static createWeakCache<K extends object, V>(): {
    get: (key: K) => V | undefined;
    set: (key: K, value: V) => void;
    has: (key: K) => boolean;
    delete: (key: K) => boolean;
  } {
    const cache = new WeakMap<K, V>();
    
    return {
      get: (key: K) => cache.get(key),
      set: (key: K, value: V) => cache.set(key, value),
      has: (key: K) => cache.has(key),
      delete: (key: K) => cache.delete(key),
    };
  }

  static createLRUCache<K, V>(maxSize: number): {
    get: (key: K) => V | undefined;
    set: (key: K, value: V) => void;
    has: (key: K) => boolean;
    delete: (key: K) => boolean;
    clear: () => void;
    size: () => number;
  } {
    const cache = new Map<K, V>();
    
    const moveToEnd = (key: K) => {
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value!);
    };
    
    return {
      get: (key: K) => {
        if (cache.has(key)) {
          moveToEnd(key);
          return cache.get(key);
        }
        return undefined;
      },
      set: (key: K, value: V) => {
        if (cache.has(key)) {
          moveToEnd(key);
        } else {
          if (cache.size >= maxSize) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
              cache.delete(firstKey);
            }
          }
          cache.set(key, value);
        }
      },
      has: (key: K) => cache.has(key),
      delete: (key: K) => cache.delete(key),
      clear: () => cache.clear(),
      size: () => cache.size,
    };
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getMemoryPressure(): 'low' | 'medium' | 'high' {
    const usage = this.measureMemoryUsage();
    if (usage.heapPercent < 50) return 'low';
    if (usage.heapPercent < 80) return 'medium';
    return 'high';
  }
}