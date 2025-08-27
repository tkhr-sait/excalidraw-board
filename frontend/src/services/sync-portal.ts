import throttle from 'lodash.throttle';
import { SocketService } from './socket';
import { EncryptionUtils } from '../utils/encryption';
import { isSyncableElement } from '../utils/element-sync';
import type { 
  SocketUpdateData
} from '../types/socket';
import { WS_SUBTYPES } from '../types/socket';

export interface SyncableElement {
  id: string;
  version: number;
  [key: string]: any;
}

export class SyncPortal {
  private socketService: SocketService;
  private broadcastedElementVersions: Map<string, number> = new Map();
  private SYNC_FULL_SCENE_INTERVAL_MS = 10000;

  constructor(socketService: SocketService) {
    this.socketService = socketService;
  }

  // Excalidrawのような効率的なシーン同期
  broadcastScene = async (
    updateType: typeof WS_SUBTYPES.INIT | typeof WS_SUBTYPES.UPDATE,
    elements: readonly SyncableElement[],
    syncAll: boolean,
    files?: any,
    replaceAll: boolean = false
  ) => {
    if (updateType === WS_SUBTYPES.INIT && !syncAll) {
      throw new Error('syncAll must be true when sending SCENE.INIT');
    }

    // インクリメンタル同期: 変更された要素のみを送信
    const syncableElements = elements.reduce((acc, element) => {
      if (
        (syncAll ||
          !this.broadcastedElementVersions.has(element.id) ||
          element.version > this.broadcastedElementVersions.get(element.id)!) &&
        isSyncableElement(element as any)
      ) {
        acc.push(element);
      }
      return acc;
    }, [] as SyncableElement[]);

    if (syncableElements.length === 0 && !syncAll) {
      return; // 同期が必要な要素がない場合はスキップ
    }

    const data = {
      type: updateType,
      payload: {
        elements: syncableElements,
        ...(files && { files }),
        ...(replaceAll && { replaceAll }), // Add replaceAll flag when needed
      },
    } as SocketUpdateData;

    // バージョン管理の更新
    for (const syncableElement of syncableElements) {
      this.broadcastedElementVersions.set(
        syncableElement.id,
        syncableElement.version
      );
    }

    await this.socketService.broadcastEncryptedData(data);
  };

  // マウス位置の同期
  broadcastMouseLocation = (payload: {
    pointer: { x: number; y: number };
    button: 'up' | 'down';
    selectedElementIds?: readonly string[];
    username?: string;
  }) => {
    if (!this.socketService.socket?.id) {
      return;
    }

    const data = {
      type: WS_SUBTYPES.MOUSE_LOCATION,
      payload: {
        socketId: this.socketService.socket.id,
        pointer: payload.pointer,
        button: payload.button || 'up',
        selectedElementIds: payload.selectedElementIds || [],
        username: payload.username || '',
      },
    } as SocketUpdateData;

    return this.socketService.broadcastEncryptedData(
      data,
      true // volatile
    );
  };

  // アイドル状態の同期
  broadcastIdleChange = (userState: 'active' | 'idle' | 'away', username: string) => {
    if (!this.socketService.socket?.id) {
      return;
    }

    const data = {
      type: WS_SUBTYPES.IDLE_STATUS,
      payload: {
        socketId: this.socketService.socket.id,
        userState,
        username,
      },
    } as SocketUpdateData;

    return this.socketService.broadcastEncryptedData(
      data,
      true // volatile
    );
  };

  // 可視シーン範囲の同期
  broadcastVisibleSceneBounds = (
    payload: {
      sceneBounds: { x: number; y: number; width: number; height: number };
    },
    roomId: string
  ) => {
    if (!this.socketService.socket?.id) {
      return;
    }

    const data = {
      type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS,
      payload: {
        socketId: this.socketService.socket.id,
        username: '',
        sceneBounds: payload.sceneBounds,
      },
    } as SocketUpdateData;

    return this.socketService.broadcastEncryptedData(
      data,
      true, // volatile
      roomId
    );
  };

  // 全要素のスロットリング再送信
  queueBroadcastAllElements = throttle((elements: readonly SyncableElement[]) => {
    this.broadcastScene(
      WS_SUBTYPES.UPDATE,
      elements,
      true // 全要素を同期
    );
  }, this.SYNC_FULL_SCENE_INTERVAL_MS);


  // 暗号化されたペイロードの復号化
  async decryptPayload(
    iv: Uint8Array,
    encryptedData: ArrayBuffer,
    decryptionKey: string
  ): Promise<SocketUpdateData | null> {
    try {
      const decrypted = await EncryptionUtils.decryptData(iv, encryptedData, decryptionKey);
      const decodedData = new TextDecoder('utf-8').decode(new Uint8Array(decrypted));
      return JSON.parse(decodedData);
    } catch (error) {
      console.error('Failed to decrypt payload:', error);
      return null;
    }
  }

  // バージョン管理のリセット
  clearBroadcastedElements(): void {
    this.broadcastedElementVersions.clear();
  }

  // 要素のバージョン取得
  getLastBroadcastedVersion(elementId: string): number | undefined {
    return this.broadcastedElementVersions.get(elementId);
  }
}