# Task 04: コラボレーション機能の実装

## 概要
Excalidrawのリアルタイムコラボレーション機能を実装し、複数ユーザー間での同期描画を可能にする。

## 前提条件
- Task 03（WebSocket接続）が完了していること
- WebSocket通信が正常に動作すること

## 作業内容

### 1. コラボレーションサービスのテスト作成
```typescript
// frontend/src/services/__tests__/collaboration.test.ts
import { CollaborationService } from '../collaboration';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types';

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    service = new CollaborationService();
  });

  it('should sync elements between users', () => {
    const elements: ExcalidrawElement[] = [
      {
        id: 'test-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        // ... other required properties
      }
    ];

    const syncData = service.prepareSyncData(elements, {});
    expect(syncData.elements).toEqual(elements);
    expect(syncData.appState).toBeDefined();
  });

  it('should handle remote updates', () => {
    const remoteElements = [{ id: 'remote-1', type: 'ellipse' }];
    const localElements = [{ id: 'local-1', type: 'rectangle' }];

    const merged = service.mergeElements(localElements, remoteElements);
    expect(merged).toHaveLength(2);
  });
});
```

### 2. コラボレーションサービスの実装
```typescript
// frontend/src/services/collaboration.ts
import { 
  ExcalidrawElement, 
  AppState,
  BinaryFiles,
  Collaborator
} from '@excalidraw/excalidraw/types';

export interface SyncData {
  type: 'sync' | 'cursor' | 'user-update';
  elements?: readonly ExcalidrawElement[];
  appState?: Partial<AppState>;
  collaborators?: Map<string, Collaborator>;
  cursor?: { x: number; y: number };
  userId: string;
  timestamp: number;
}

export class CollaborationService {
  private userId: string;
  private collaborators: Map<string, Collaborator> = new Map();

  constructor() {
    this.userId = this.generateUserId();
  }

  private generateUserId(): string {
    return `user-${Math.random().toString(36).substr(2, 9)}`;
  }

  prepareSyncData(
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>
  ): SyncData {
    return {
      type: 'sync',
      elements,
      appState: {
        ...appState,
        collaborators: this.collaborators
      },
      userId: this.userId,
      timestamp: Date.now()
    };
  }

  prepareCursorData(x: number, y: number): SyncData {
    return {
      type: 'cursor',
      cursor: { x, y },
      userId: this.userId,
      timestamp: Date.now()
    };
  }

  mergeElements(
    localElements: readonly ExcalidrawElement[],
    remoteElements: readonly ExcalidrawElement[]
  ): ExcalidrawElement[] {
    const elementMap = new Map<string, ExcalidrawElement>();

    // Add local elements
    localElements.forEach(element => {
      elementMap.set(element.id, element);
    });

    // Merge remote elements
    remoteElements.forEach(element => {
      const existing = elementMap.get(element.id);
      if (!existing || element.versionNonce > existing.versionNonce) {
        elementMap.set(element.id, element);
      }
    });

    return Array.from(elementMap.values());
  }

  updateCollaborator(userId: string, data: Partial<Collaborator>): void {
    const existing = this.collaborators.get(userId) || {
      pointer: { x: 0, y: 0 },
      button: 'up',
      selectedElementIds: {},
      username: `User ${userId.slice(-4)}`,
      userState: {},
      color: { background: this.generateUserColor(), stroke: '#000000' }
    };

    this.collaborators.set(userId, {
      ...existing,
      ...data
    });
  }

  removeCollaborator(userId: string): void {
    this.collaborators.delete(userId);
  }

  getCollaborators(): Map<string, Collaborator> {
    return new Map(this.collaborators);
  }

  getUserId(): string {
    return this.userId;
  }

  private generateUserColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
```

### 3. コラボレーションフックの作成
```typescript
// frontend/src/hooks/useCollaboration.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ExcalidrawElement, 
  ExcalidrawImperativeAPI,
  AppState 
} from '@excalidraw/excalidraw/types';
import { useWebSocket } from './useWebSocket';
import { CollaborationService, SyncData } from '../services/collaboration';
import { config } from '../config/environment';

export const useCollaboration = (excalidrawAPI: ExcalidrawImperativeAPI | null) => {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const collaborationService = useRef(new CollaborationService());
  const { isConnected, sendMessage, lastMessage, service } = useWebSocket(
    isCollaborating ? config.websocketUrl : null
  );

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage || !excalidrawAPI) return;

    const data = lastMessage as SyncData;

    if (data.userId === collaborationService.current.getUserId()) {
      return; // Ignore own messages
    }

    switch (data.type) {
      case 'sync':
        if (data.elements) {
          const currentElements = excalidrawAPI.getSceneElements();
          const merged = collaborationService.current.mergeElements(
            currentElements,
            data.elements
          );
          excalidrawAPI.updateScene({
            elements: merged,
            appState: data.appState
          });
        }
        break;

      case 'cursor':
        if (data.cursor) {
          collaborationService.current.updateCollaborator(data.userId, {
            pointer: data.cursor
          });
          excalidrawAPI.updateScene({
            collaborators: collaborationService.current.getCollaborators()
          });
        }
        break;

      case 'user-update':
        collaborationService.current.updateCollaborator(data.userId, data.appState);
        excalidrawAPI.updateScene({
          collaborators: collaborationService.current.getCollaborators()
        });
        break;
    }
  }, [lastMessage, excalidrawAPI]);

  // Send local changes
  const syncElements = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: AppState
  ) => {
    if (!isCollaborating || !isConnected) return;

    const syncData = collaborationService.current.prepareSyncData(elements, appState);
    sendMessage(syncData);
  }, [isCollaborating, isConnected, sendMessage]);

  // Send cursor position
  const syncCursor = useCallback((x: number, y: number) => {
    if (!isCollaborating || !isConnected) return;

    const cursorData = collaborationService.current.prepareCursorData(x, y);
    sendMessage(cursorData);
  }, [isCollaborating, isConnected, sendMessage]);

  // Toggle collaboration
  const toggleCollaboration = useCallback(() => {
    setIsCollaborating(prev => !prev);
  }, []);

  return {
    isCollaborating,
    isConnected,
    toggleCollaboration,
    syncElements,
    syncCursor,
    collaborators: collaborationService.current.getCollaborators()
  };
};
```

### 4. コラボレーション対応のExcalidrawコンポーネント
```typescript
// frontend/src/components/CollaborativeExcalidrawBoard.tsx
import React, { useState, useCallback } from 'react';
import { 
  Excalidraw, 
  LiveCollaborationTrigger 
} from '@excalidraw/excalidraw';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useCollaboration } from '../hooks/useCollaboration';
import { ConnectionStatus } from './ConnectionStatus';
import '@excalidraw/excalidraw/index.css';

export const CollaborativeExcalidrawBoard: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const {
    isCollaborating,
    isConnected,
    toggleCollaboration,
    syncElements,
    syncCursor,
    collaborators
  } = useCollaboration(excalidrawAPI);

  const handleChange = useCallback((elements, appState) => {
    syncElements(elements, appState);
  }, [syncElements]);

  const handlePointerUpdate = useCallback((payload) => {
    if (payload.pointer) {
      syncCursor(payload.pointer.x, payload.pointer.y);
    }
  }, [syncCursor]);

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <ConnectionStatus isConnected={isConnected && isCollaborating} />
      
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        isCollaborating={isCollaborating}
        renderTopRightUI={() => (
          <LiveCollaborationTrigger
            isCollaborating={isCollaborating}
            onSelect={toggleCollaboration}
          />
        )}
      />
    </div>
  );
};
```

### 5. ルーム管理の実装
```typescript
// frontend/src/services/room.ts
export class RoomService {
  private roomId: string | null = null;

  generateRoomId(): string {
    return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  joinRoom(roomId: string): string {
    this.roomId = roomId;
    return roomId;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  leaveRoom(): void {
    this.roomId = null;
  }

  getRoomUrl(roomId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/#room=${roomId}`;
  }

  parseRoomFromUrl(): string | null {
    const hash = window.location.hash;
    const match = hash.match(/#room=([^&]+)/);
    return match ? match[1] : null;
  }
}
```

## 検証項目
- [x] 複数ブラウザ間でリアルタイム同期が動作すること
- [x] 図形の追加・編集・削除が同期されること
- [x] カーソル位置が他のユーザーに表示されること
- [x] ユーザーの接続・切断が正しく処理されること
- [x] コラボレーションのON/OFFが切り替えられること

## 成果物
- frontend/src/services/collaboration.ts
- frontend/src/services/__tests__/collaboration.test.ts
- frontend/src/hooks/useCollaboration.ts
- frontend/src/components/CollaborativeExcalidrawBoard.tsx
- frontend/src/services/room.ts

## 次のステップ
Task 05: E2Eテストの実装