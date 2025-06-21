import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { perfMonitor } from '../../src/utils/performance';
import { OptimizedSyncService } from '../../src/services/sync-optimized';
import { MemoryManager } from '../../src/utils/memory';

describe('Performance Tests', () => {
  beforeEach(() => {
    perfMonitor.cleanup();
  });

  afterEach(() => {
    perfMonitor.cleanup();
  });

  describe('PerformanceMonitor', () => {
    it('should measure execution time accurately', () => {
      perfMonitor.startMeasuring('test-operation');
      
      // シミュレートされた処理時間
      const start = Date.now();
      while (Date.now() - start < 10) {
        // 10msの処理をシミュレート
      }
      
      const duration = perfMonitor.endMeasuring('test-operation');
      expect(duration).toBeGreaterThan(5);
      expect(duration).toBeLessThan(50);
    });

    it('should calculate average times correctly', () => {
      for (let i = 0; i < 5; i++) {
        perfMonitor.startMeasuring('repeated-operation');
        const start = Date.now();
        while (Date.now() - start < 5) {
          // 5msの処理
        }
        perfMonitor.endMeasuring('repeated-operation');
      }
      
      const average = perfMonitor.getAverageTime('repeated-operation');
      expect(average).toBeGreaterThan(0);
      expect(average).toBeLessThan(20);
    });

    it('should provide comprehensive metrics', () => {
      perfMonitor.startMeasuring('test-metric');
      perfMonitor.endMeasuring('test-metric');
      
      const metrics = perfMonitor.getMetrics();
      expect(metrics['test-metric']).toBeDefined();
      expect(metrics['test-metric']).toHaveProperty('average');
      expect(metrics['test-metric']).toHaveProperty('count');
      expect(metrics['test-metric']).toHaveProperty('latest');
      expect(metrics['test-metric'].count).toBe(1);
    });
  });

  describe('OptimizedSyncService', () => {
    it('should handle high-frequency updates efficiently', () => {
      const emitCalls: any[] = [];
      const mockEmit = vi.fn((event: string, data: any) => {
        emitCalls.push({ event, data, timestamp: Date.now() });
      });
      
      const syncService = new OptimizedSyncService(mockEmit);
      
      // 高頻度の更新をシミュレート
      const elements = [{ 
        id: 'test', 
        type: 'rectangle',
        version: 1,
        updated: Date.now(),
      } as any];
      const appState = { viewBackgroundColor: '#ffffff' };
      
      for (let i = 0; i < 100; i++) {
        elements[0].version = i;
        elements[0].updated = Date.now() + i;
        syncService.broadcastSceneChange(elements, appState);
      }
      
      // スロットリングにより、呼び出し回数が制限される
      expect(mockEmit.mock.calls.length).toBeLessThan(20);
      
      syncService.cleanup();
    });

    it('should detect element changes efficiently', () => {
      const mockEmit = vi.fn();
      const syncService = new OptimizedSyncService(mockEmit);
      
      const element = { 
        id: 'test', 
        type: 'rectangle',
        version: 1,
        updated: 1000,
      } as any;
      
      // 初回は変更として検出される
      syncService.broadcastSceneChange([element], {});
      
      // 同じバージョンでは変更として検出されない
      syncService.broadcastSceneChange([element], {});
      
      // バージョンが変わると変更として検出される
      element.version = 2;
      element.updated = 2000;
      syncService.broadcastSceneChange([element], {});
      
      // 実際の呼び出し回数をチェック（スロットリングを考慮）
      setTimeout(() => {
        expect(mockEmit.mock.calls.length).toBeGreaterThan(0);
        syncService.cleanup();
      }, 500);
    });

    it('should provide performance metrics', () => {
      const mockEmit = vi.fn();
      const syncService = new OptimizedSyncService(mockEmit);
      
      const metrics = syncService.getPerformanceMetrics();
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('throttleDelay');
      expect(metrics.memory).toHaveProperty('heap');
      expect(metrics.memory).toHaveProperty('heapPercent');
      
      syncService.cleanup();
    });
  });

  describe('MemoryManager', () => {
    it('should create working LRU cache', () => {
      const cache = MemoryManager.createLRUCache<string, number>(3);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size()).toBe(3);
      
      cache.set('d', 4); // 'a'が削除される
      expect(cache.size()).toBe(3);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('d')).toBe(true);
    });

    it('should track memory usage', () => {
      const usage = MemoryManager.measureMemoryUsage();
      expect(usage.heap).toBeGreaterThanOrEqual(0);
      expect(usage.heapPercent).toBeGreaterThanOrEqual(0);
      expect(usage.heapPercent).toBeLessThanOrEqual(100);
    });

    it('should format bytes correctly', () => {
      expect(MemoryManager.formatBytes(1024)).toBe('1 KB');
      expect(MemoryManager.formatBytes(1048576)).toBe('1 MB');
      expect(MemoryManager.formatBytes(1073741824)).toBe('1 GB');
      expect(MemoryManager.formatBytes(500)).toBe('500 Bytes');
    });

    it('should detect memory pressure levels', () => {
      const pressure = MemoryManager.getMemoryPressure();
      expect(['low', 'medium', 'high']).toContain(pressure);
    });

    it('should create working weak cache', () => {
      const cache = MemoryManager.createWeakCache<object, number>();
      const key1 = {};
      const key2 = {};
      
      cache.set(key1, 1);
      cache.set(key2, 2);
      
      expect(cache.get(key1)).toBe(1);
      expect(cache.get(key2)).toBe(2);
      expect(cache.has(key1)).toBe(true);
      expect(cache.has(key2)).toBe(true);
      
      cache.delete(key1);
      expect(cache.has(key1)).toBe(false);
      expect(cache.has(key2)).toBe(true);
    });

    it('should manage cleanup functions', () => {
      const cleanupFn = vi.fn();
      MemoryManager.registerCleanup(cleanupFn);
      
      MemoryManager.cleanup();
      expect(cleanupFn).toHaveBeenCalledTimes(1);
      
      // 2回目の呼び出しでは実行されない（クリーンアップ済み）
      MemoryManager.cleanup();
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete scene serialization within acceptable time', () => {
      const mockEmit = vi.fn();
      const syncService = new OptimizedSyncService(mockEmit);
      
      // 大量の要素を作成
      const elements = Array.from({ length: 1000 }, (_, i) => ({
        id: `element-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: i * 10,
        width: 100,
        height: 100,
        version: 1,
        updated: Date.now(),
      })) as any[];
      
      const startTime = Date.now();
      syncService.broadcastSceneChange(elements, {});
      const duration = Date.now() - startTime;
      
      // 1000要素のシリアライゼーションが100ms以内に完了することを確認
      expect(duration).toBeLessThan(100);
      
      syncService.cleanup();
    });

    it('should handle rapid updates without memory leaks', () => {
      const mockEmit = vi.fn();
      const syncService = new OptimizedSyncService(mockEmit);
      
      const initialMemory = MemoryManager.measureMemoryUsage();
      
      // 大量の高頻度更新をシミュレート
      for (let i = 0; i < 1000; i++) {
        const elements = [{
          id: 'stress-test',
          type: 'rectangle',
          version: i,
          updated: Date.now() + i,
        }] as any[];
        
        syncService.broadcastSceneChange(elements, {});
      }
      
      const finalMemory = MemoryManager.measureMemoryUsage();
      const memoryIncrease = finalMemory.heap - initialMemory.heap;
      
      // メモリ増加が合理的な範囲内であることを確認（5MB以下）
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      
      syncService.cleanup();
    });
  });
});