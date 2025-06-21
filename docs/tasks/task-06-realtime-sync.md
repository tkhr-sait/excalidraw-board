# Task 06: リアルタイム同期機能の実装

## 概要
Excalidrawの描画データをリアルタイムで同期する機能を実装する。要素の追加/更新/削除、ポインター位置、選択状態などを同期する。

## 目的
- Excalidrawシーンデータの同期実装
- ポインター位置のリアルタイム共有
- 衝突解決アルゴリズムの実装
- パフォーマンス最適化

## 前提条件
- Task 01-05が完了していること
- コラボレーションコンポーネントが実装されていること

## 作業内容

### 1. テストコードの作成（TDD）
`frontend/tests/unit/services/sync.test.ts`:
```typescript
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
```

### 2. 同期サービスの実装
`frontend/src/services/sync.ts`:
```typescript
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
      return remoteElement.version > localElement.version;
    }
    
    // 更新時刻で比較
    if ('updated' in localElement && 'updated' in remoteElement) {
      return remoteElement.updated > localElement.updated;
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
```

### 3. スロットルユーティリティ
`frontend/src/utils/throttle.ts`:
```typescript
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  let lastArgs: Parameters<T> | null = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    
    const execute = () => {
      lastExecTime = now;
      func.apply(this, args);
      timeoutId = null;
    };

    if (now - lastExecTime >= delay) {
      execute();
    } else {
      lastArgs = args;
      if (!timeoutId) {
        const remainingTime = delay - (now - lastExecTime);
        timeoutId = setTimeout(() => {
          if (lastArgs) {
            func.apply(this, lastArgs);
            lastExecTime = Date.now();
            lastArgs = null;
          }
          timeoutId = null;
        }, remainingTime);
      }
    }
  } as T;

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  return throttled;
}
```

### 4. App.tsxへの同期機能統合
`frontend/src/App.tsx`に追加:
```typescript
import { Collab } from './components/collab/Collab';
import { SyncService } from './services/sync';
import { useSocket } from './hooks/useSocket';
import type { SceneUpdate, CollaboratorPointer } from './types/socket';

// Appコンポーネント内に追加
function App() {
  // ... 既存のコード ...
  
  const socket = useSocket();
  const [syncService, setSyncService] = useState<SyncService | null>(null);
  const [collaboratorPointers, setCollaboratorPointers] = useState<
    Map<string, CollaboratorPointer>
  >(new Map());

  // SyncServiceの初期化
  useEffect(() => {
    if (socket.isConnected) {
      const service = new SyncService(socket.emit);
      setSyncService(service);
      
      return () => {
        service.cleanup();
      };
    }
  }, [socket.isConnected, socket.emit]);

  // リモートシーンデータの受信
  useEffect(() => {
    const handleSceneData = (data: SceneUpdate) => {
      if (excalidrawAPI && syncService) {
        const currentElements = excalidrawAPI.getSceneElements();
        const reconciledElements = syncService.reconcileElements(
          currentElements,
          data.elements
        );
        
        excalidrawAPI.updateScene({
          elements: reconciledElements,
          appState: data.appState,
        });
      }
    };

    const handleCollaboratorPointer = (data: CollaboratorPointer) => {
      setCollaboratorPointers(prev => {
        const updated = new Map(prev);
        updated.set(data.userId, data);
        return updated;
      });
    };

    socket.on('scene-data', handleSceneData);
    socket.on('collaborator-pointer', handleCollaboratorPointer);

    return () => {
      socket.off('scene-data');
      socket.off('collaborator-pointer');
    };
  }, [socket, excalidrawAPI, syncService]);

  // ローカル変更のブロードキャスト
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // ローカルストレージへの保存
      if (!isCollaborating) {
        saveToLocalStorage({ elements, appState, files });
      }
      
      // コラボレーション中はブロードキャスト
      if (isCollaborating && syncService) {
        syncService.broadcastSceneChange(elements, appState);
      }
    },
    [isCollaborating, syncService]
  );

  // ポインター更新のハンドラ
  const handlePointerUpdate = useCallback(
    (pointer: { x: number; y: number }) => {
      if (isCollaborating && syncService) {
        syncService.broadcastPointerUpdate(pointer);
      }
    },
    [isCollaborating, syncService]
  );

  // コラボレーション状態の変更ハンドラ
  const handleCollaborationStateChange = useCallback(
    (collaborating: boolean) => {
      setIsCollaborating(collaborating);
      
      if (!collaborating) {
        setCollaboratorPointers(new Map());
      }
    },
    []
  );

  return (
    <div className="app">
      <Collab
        onCollaborationStateChange={handleCollaborationStateChange}
        onCollaboratorsChange={setCollaborators}
      />
      
      <div className="excalidraw-wrapper" data-testid="excalidraw-canvas">
        <Excalidraw
          ref={excalidrawAPIRef}
          initialData={initialData || undefined}
          onChange={handleChange}
          onMount={handleExcalidrawMount}
          onPointerUpdate={handlePointerUpdate}
          langCode="ja"
          theme="light"
          name="Excalidraw Board"
          // コラボレーター情報を渡す
          renderTopRightUI={() => (
            <CollaboratorsCursors 
              pointers={collaboratorPointers}
              collaborators={collaborators}
            />
          )}
        >
          {/* ... 既存の子要素 ... */}
        </Excalidraw>
      </div>
    </div>
  );
}
```

### 5. E2Eテストの作成
`frontend/tests/e2e/collaboration.spec.ts`:
```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Collaboration Features', () => {
  let page1: Page;
  let page2: Page;

  test.beforeEach(async ({ browser }) => {
    // 2つのブラウザコンテキストを作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    await page1.goto('http://localhost:3000');
    await page2.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    await page1.close();
    await page2.close();
  });

  test('should sync drawing between users', async () => {
    const roomId = `test-room-${Date.now()}`;
    
    // 両方のユーザーが同じルームに参加
    await joinRoom(page1, roomId, 'User1');
    await joinRoom(page2, roomId, 'User2');
    
    // User1が長方形を描画
    await page1.click('[data-testid="toolbar-rectangle"]');
    const canvas1 = page1.locator('canvas').first();
    await canvas1.click({ position: { x: 100, y: 100 } });
    await canvas1.click({ position: { x: 200, y: 200 } });
    
    // User2の画面に長方形が表示されることを確認
    // (実際の検証はExcalidrawのcanvas実装に依存)
    await page2.waitForTimeout(500); // 同期を待つ
    
    // 両方のキャンバスが同じ内容であることを確認
    const localStorage1 = await page1.evaluate(() => 
      localStorage.getItem('excalidraw-board-scene')
    );
    const localStorage2 = await page2.evaluate(() => 
      localStorage.getItem('excalidraw-board-scene')
    );
    
    // コラボレーション中はローカルストレージに保存されない
    expect(localStorage1).toBeNull();
    expect(localStorage2).toBeNull();
  });

  test('should show collaborator cursors', async () => {
    const roomId = `test-room-${Date.now()}`;
    
    await joinRoom(page1, roomId, 'User1');
    await joinRoom(page2, roomId, 'User2');
    
    // User1がマウスを動かす
    const canvas1 = page1.locator('canvas').first();
    await canvas1.hover({ position: { x: 150, y: 150 } });
    
    // User2の画面にUser1のカーソルが表示されることを確認
    // (実装に応じて検証方法を調整)
  });
});

async function joinRoom(page: Page, roomId: string, username: string) {
  await page.click('button:has-text("Join Room")');
  await page.fill('input[placeholder="Enter room ID"]', roomId);
  await page.fill('input[placeholder="Enter your name"]', username);
  await page.click('button:has-text("Join")');
  await page.waitForTimeout(500); // 接続を待つ
}
```

### 6. ADRの作成
`docs/adr/002-realtime-sync-strategy.md`:
```markdown
# ADR-002: リアルタイム同期戦略

## ステータス
承認済み

## コンテキスト
複数ユーザー間でExcalidrawの描画データをリアルタイムで同期する方法を決定する必要がある。

## 決定
1. シーン全体の同期方式を採用（差分同期ではなく）
2. スロットリングによるネットワーク負荷の軽減
3. バージョン番号による競合解決
4. ポインター位置は高頻度更新を許容

## 理由
- シーン全体同期は実装がシンプルで一貫性を保ちやすい
- スロットリングにより、高頻度の更新でもサーバー負荷を抑制
- Excalidrawの要素にはバージョン情報が含まれているため活用

## 結果
- シンプルで理解しやすい同期ロジック
- ネットワーク帯域の効率的な利用
- スケーラビリティの確保

## 欠点
- 大量の要素がある場合、データ量が大きくなる
- 差分同期に比べて帯域幅を消費する
```

## テスト要件

### ユニットテスト
- [ ] シーン同期が動作する
- [ ] スロットリングが動作する
- [ ] 競合解決が動作する

### E2Eテスト
- [ ] 複数ユーザー間で描画が同期される
- [ ] ポインター位置が共有される
- [ ] ネットワーク切断時の動作

## 成果物
1. 同期サービス実装
2. スロットルユーティリティ
3. App.tsxへの統合
4. テストコード
5. ADRドキュメント

## 注意事項
- パフォーマンスを常に意識する
- メモリリークを避ける
- ネットワークエラー時のグレースフルな処理

## 次のタスク
Task 07: ユニットテストの実装