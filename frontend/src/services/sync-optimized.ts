import type { ExcalidrawElement, AppState } from '../types/excalidraw';
import { throttle, debounce } from '../utils/throttle';
import { perfMonitor } from '../utils/performance';
import { MemoryManager } from '../utils/memory';

export class OptimizedSyncService {
  private emit: (event: string, data: any) => void;
  private lastBroadcastedScene: string = '';
  private lastBroadcastTime = 0;
  private pendingUpdates = new Map<string, any>();
  private elementCache = MemoryManager.createLRUCache<string, any>(1000);
  
  // アダプティブスロットリング
  private throttleDelay = 100;
  private minThrottleDelay = 50;
  private maxThrottleDelay = 500;
  
  private throttledBroadcastScene: ReturnType<typeof throttle>;
  private debouncedBatchUpdate: ReturnType<typeof debounce>;

  constructor(emit: (event: string, data: any) => void) {
    this.emit = emit;
    this.setupAdaptiveThrottling();
    
    this.throttledBroadcastScene = throttle(
      this.broadcastSceneChangeInternal.bind(this),
      this.throttleDelay
    );
    
    this.debouncedBatchUpdate = debounce(
      this.sendBatchUpdates.bind(this),
      200
    );

    // メモリ管理のクリーンアップ登録
    MemoryManager.registerCleanup(() => this.cleanup());
  }

  broadcastSceneChange(
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>
  ): void {
    perfMonitor.startMeasuring('scene-serialization');
    
    // メモリプレッシャーをチェック
    const memoryPressure = MemoryManager.getMemoryPressure();
    if (memoryPressure === 'high') {
      // 高負荷時はより強くスロットル
      this.throttleDelay = Math.min(this.maxThrottleDelay, this.throttleDelay * 1.5);
    } else if (memoryPressure === 'low') {
      // 低負荷時はレスポンス重視
      this.throttleDelay = Math.max(this.minThrottleDelay, this.throttleDelay * 0.8);
    }
    
    // 変更のあった要素のみを抽出（差分更新）
    const changedElements = this.getChangedElements(elements);
    
    if (changedElements.length === 0) {
      perfMonitor.endMeasuring('scene-serialization');
      return;
    }

    const sceneData = {
      elements: changedElements.map(el => this.serializeElement(el)),
      appState: this.serializeAppState(appState),
      timestamp: Date.now(),
    };
    
    perfMonitor.endMeasuring('scene-serialization');
    
    this.throttledBroadcastScene(sceneData);
  }

  broadcastPointerMovement(pointer: { x: number; y: number; username: string }): void {
    // ポインター移動は軽量なので頻度を高く
    const throttledPointer = throttle((data: any) => {
      this.emit('pointer-update', data);
    }, 50);
    
    throttledPointer(pointer);
  }

  private getChangedElements(elements: readonly ExcalidrawElement[]): ExcalidrawElement[] {
    const changedElements: ExcalidrawElement[] = [];
    
    for (const element of elements) {
      const cacheKey = element.id;
      const cached = this.elementCache.get(cacheKey);
      
      // 簡単な変更検出（version基準）
      if (!cached || cached.version !== element.version || cached.updated !== element.updated) {
        changedElements.push(element);
        this.elementCache.set(cacheKey, {
          version: element.version,
          updated: element.updated,
        });
      }
    }
    
    return changedElements;
  }

  private setupAdaptiveThrottling(): void {
    // ネットワーク状態に応じてスロットル遅延を調整
    const connection = (navigator as any).connection;
    if (connection) {
      const updateThrottleDelay = () => {
        const effectiveType = connection.effectiveType;
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            this.throttleDelay = this.maxThrottleDelay;
            break;
          case '3g':
            this.throttleDelay = 200;
            break;
          case '4g':
          default:
            this.throttleDelay = this.minThrottleDelay;
            break;
        }
        
        console.log(`Network type: ${effectiveType}, throttle delay: ${this.throttleDelay}ms`);
      };
      
      updateThrottleDelay();
      connection.addEventListener('change', updateThrottleDelay);
    }
  }

  private broadcastSceneChangeInternal(sceneData: any): void {
    perfMonitor.startMeasuring('scene-broadcast');
    
    const now = Date.now();
    const timeSinceLastBroadcast = now - this.lastBroadcastTime;
    
    // 高頻度更新の場合はバッチ更新を使用
    if (timeSinceLastBroadcast < 50) {
      this.pendingUpdates.set('scene', sceneData);
      this.debouncedBatchUpdate();
      return;
    }
    
    // シーンデータをJSON文字列化して重複チェック
    const serializedScene = JSON.stringify(sceneData);
    if (serializedScene === this.lastBroadcastedScene) {
      perfMonitor.endMeasuring('scene-broadcast');
      return;
    }
    
    this.emit('scene-update', sceneData);
    this.lastBroadcastedScene = serializedScene;
    this.lastBroadcastTime = now;
    
    perfMonitor.endMeasuring('scene-broadcast');
  }

  private sendBatchUpdates(): void {
    if (this.pendingUpdates.size === 0) return;
    
    perfMonitor.startMeasuring('batch-update');
    
    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();
    
    this.emit('batch-update', {
      updates: updates.map(([type, data]) => ({ type, data })),
      timestamp: Date.now(),
    });
    
    perfMonitor.endMeasuring('batch-update');
  }

  // メモリ最適化されたシリアライゼーション
  private serializeElement(element: ExcalidrawElement): any {
    const {
      boundElements,
      // 不要なプロパティを除外してメモリ使用量を削減
      ...serializable
    } = element as any;
    
    // 必要なプロパティのみを選択的にシリアライズ
    return {
      id: serializable.id,
      type: serializable.type,
      x: Math.round(serializable.x * 100) / 100, // 精度を下げてサイズ削減
      y: Math.round(serializable.y * 100) / 100,
      width: Math.round(serializable.width * 100) / 100,
      height: Math.round(serializable.height * 100) / 100,
      angle: serializable.angle,
      strokeColor: serializable.strokeColor,
      backgroundColor: serializable.backgroundColor,
      fillStyle: serializable.fillStyle,
      strokeWidth: serializable.strokeWidth,
      strokeStyle: serializable.strokeStyle,
      roughness: serializable.roughness,
      opacity: serializable.opacity,
      version: serializable.version,
      updated: serializable.updated,
    };
  }

  private serializeAppState(appState: Partial<AppState>): any {
    // コラボレーションに必要な状態のみを選択
    return {
      viewBackgroundColor: appState.viewBackgroundColor,
      currentItemStrokeColor: appState.currentItemStrokeColor,
      currentItemBackgroundColor: appState.currentItemBackgroundColor,
      currentItemFillStyle: appState.currentItemFillStyle,
      currentItemStrokeWidth: appState.currentItemStrokeWidth,
      currentItemStrokeStyle: appState.currentItemStrokeStyle,
      currentItemRoughness: appState.currentItemRoughness,
      currentItemOpacity: appState.currentItemOpacity,
    };
  }

  getPerformanceMetrics(): any {
    return {
      ...perfMonitor.getMetrics(),
      memory: MemoryManager.measureMemoryUsage(),
      cacheSize: this.elementCache.size(),
      throttleDelay: this.throttleDelay,
    };
  }

  cleanup(): void {
    this.throttledBroadcastScene.cancel?.();
    this.debouncedBatchUpdate.cancel?.();
    this.pendingUpdates.clear();
    this.elementCache.clear();
  }
}