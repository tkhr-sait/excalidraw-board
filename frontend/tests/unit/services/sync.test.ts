import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../../../src/services/sync';
import type { ExcalidrawElement } from '../../../src/types/excalidraw';

describe('SyncService', () => {
  let syncService: SyncService;
  let mockEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockEmit = vi.fn();
    syncService = new SyncService(mockEmit);
  });

  describe('Scene Synchronization', () => {
    it('should broadcast scene changes', () => {
      const elements: ExcalidrawElement[] = [
        {
          id: 'elem1',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          // ... other properties
        } as ExcalidrawElement,
      ];
      const appState = { viewBackgroundColor: '#ffffff' };

      syncService.broadcastSceneChange(elements, appState);

      expect(mockEmit).toHaveBeenCalledWith('scene-update', {
        elements,
        appState,
      });
    });

    it('should throttle scene updates', async () => {
      const elements: ExcalidrawElement[] = [];
      const appState = {};

      // 高頻度の更新
      for (let i = 0; i < 10; i++) {
        syncService.broadcastSceneChange(elements, appState);
      }

      // スロットリングにより、呼び出し回数が制限される
      expect(mockEmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pointer Synchronization', () => {
    it('should broadcast pointer updates', () => {
      const pointer = { x: 100, y: 200 };
      
      syncService.broadcastPointerUpdate(pointer);
      
      expect(mockEmit).toHaveBeenCalledWith('pointer-update', pointer);
    });

    it('should throttle pointer updates', () => {
      // 高頻度のポインター更新
      for (let i = 0; i < 20; i++) {
        syncService.broadcastPointerUpdate({ x: i, y: i });
      }

      // スロットリングにより、呼び出し回数が制限される
      expect(mockEmit.mock.calls.length).toBeLessThan(20);
    });
  });

  describe('Reconciliation', () => {
    it('should reconcile remote elements with local elements', () => {
      const localElements: ExcalidrawElement[] = [
        { id: 'elem1', version: 1 } as ExcalidrawElement,
        { id: 'elem2', version: 1 } as ExcalidrawElement,
      ];

      const remoteElements: ExcalidrawElement[] = [
        { id: 'elem1', version: 2 } as ExcalidrawElement, // 更新
        { id: 'elem3', version: 1 } as ExcalidrawElement, // 新規
      ];

      const reconciled = syncService.reconcileElements(
        localElements,
        remoteElements
      );

      expect(reconciled).toHaveLength(3);
      expect(reconciled.find(e => e.id === 'elem1')?.version).toBe(2);
      expect(reconciled.find(e => e.id === 'elem3')).toBeDefined();
    });
  });
});