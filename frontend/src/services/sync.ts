import type { ExcalidrawElement, AppState } from '../types/excalidraw';
import { throttle } from '../utils/throttle';

export class SyncService {
  private emit: (event: string, data: any) => void;
  private lastBroadcastedScene: string = '';
  
  // スロットルされた関数
  private throttledBroadcastScene: ReturnType<typeof throttle>;
  private throttledBroadcastPointer: ReturnType<typeof throttle>;

  constructor(emit: (event: string, data: any) => void) {
    this.emit = emit;
    
    // シーン更新は100msごとにスロットル
    this.throttledBroadcastScene = throttle(
      this.broadcastSceneChangeInternal.bind(this),
      100
    );
    
    // ポインター更新は50msごとにスロットル
    this.throttledBroadcastPointer = throttle(
      this.broadcastPointerUpdateInternal.bind(this),
      50
    );
  }

  // シーン変更のブロードキャスト
  broadcastSceneChange(
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>
  ): void {
    const sceneData = {
      elements: elements.map(el => this.serializeElement(el)),
      appState: this.serializeAppState(appState),
    };
    
    const serialized = JSON.stringify(sceneData);
    
    // 変更がある場合のみブロードキャスト
    if (serialized !== this.lastBroadcastedScene) {
      this.lastBroadcastedScene = serialized;
      this.throttledBroadcastScene(sceneData);
    }
  }

  private broadcastSceneChangeInternal(sceneData: any): void {
    this.emit('scene-update', sceneData);
  }

  // ポインター位置のブロードキャスト
  broadcastPointerUpdate(pointer: { x: number; y: number }): void {
    this.throttledBroadcastPointer(pointer);
  }

  private broadcastPointerUpdateInternal(pointer: { x: number; y: number }): void {
    this.emit('pointer-update', pointer);
  }

  // ユーザーの表示/非表示状態をブロードキャスト
  broadcastUserVisibility(visible: boolean): void {
    this.emit('user-visibility', { visible });
  }

  // 要素の競合解決
  reconcileElements(
    localElements: readonly ExcalidrawElement[],
    remoteElements: readonly ExcalidrawElement[]
  ): ExcalidrawElement[] {
    const elementMap = new Map<string, ExcalidrawElement>();
    
    // ローカル要素をマップに追加
    localElements.forEach(element => {
      elementMap.set(element.id, element);
    });
    
    // リモート要素をマージ
    remoteElements.forEach(remoteElement => {
      const localElement = elementMap.get(remoteElement.id);
      
      if (!localElement) {
        // 新しい要素
        elementMap.set(remoteElement.id, remoteElement);
      } else if (this.shouldUpdateElement(localElement, remoteElement)) {
        // リモートの方が新しい
        elementMap.set(remoteElement.id, remoteElement);
      }
      // ローカルの方が新しい場合は何もしない
    });
    
    return Array.from(elementMap.values());
  }

  // 要素を更新すべきか判定
  private shouldUpdateElement(
    localElement: ExcalidrawElement,
    remoteElement: ExcalidrawElement
  ): boolean {
    // バージョン番号で比較
    if ('version' in localElement && 'version' in remoteElement) {
      return remoteElement.version! > localElement.version!;
    }
    
    // 更新時刻で比較
    if ('updated' in localElement && 'updated' in remoteElement) {
      return remoteElement.updated! > localElement.updated!;
    }
    
    // デフォルトではリモートを優先
    return true;
  }

  // 要素のシリアライズ（不要なデータを削除）
  private serializeElement(element: ExcalidrawElement): any {
    const { boundElements, ...serializable } = element as any;
    return serializable;
  }

  // AppStateのシリアライズ（同期に必要な部分のみ）
  private serializeAppState(appState: Partial<AppState>): any {
    const {
      viewBackgroundColor,
      currentItemStrokeColor,
      currentItemBackgroundColor,
      currentItemFillStyle,
      currentItemStrokeWidth,
      currentItemStrokeStyle,
      currentItemRoughness,
      currentItemOpacity,
      currentItemFontFamily,
      currentItemFontSize,
      currentItemTextAlign,
      currentItemStartArrowhead,
      currentItemEndArrowhead,
      currentItemLinearStrokeSharpness,
      gridSize,
      // 以下は同期しない
      // collaborators,
      // ...etc
    } = appState;
    
    return {
      viewBackgroundColor,
      currentItemStrokeColor,
      currentItemBackgroundColor,
      currentItemFillStyle,
      currentItemStrokeWidth,
      currentItemStrokeStyle,
      currentItemRoughness,
      currentItemOpacity,
      currentItemFontFamily,
      currentItemFontSize,
      currentItemTextAlign,
      currentItemStartArrowhead,
      currentItemEndArrowhead,
      currentItemLinearStrokeSharpness,
      gridSize,
    };
  }

  // クリーンアップ
  cleanup(): void {
    if (this.throttledBroadcastScene.cancel) {
      this.throttledBroadcastScene.cancel();
    }
    if (this.throttledBroadcastPointer.cancel) {
      this.throttledBroadcastPointer.cancel();
    }
  }
}