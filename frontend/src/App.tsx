import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  LiveCollaborationTrigger,
  reconcileElements,
  restoreElements,
  getSceneVersion,
} from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
} from './types/excalidraw';
import type { RoomUser } from './types/socket';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/storage';
import { getOrCreateUsername, saveUsername } from './utils/random-names';
import {
  getSceneElementsIncludingDeleted,
  RecentlyDeletedElementsTracker,
} from './utils/element-sync';
import { Collab } from './components/collab/Collab';
import type { CollabHandle } from './components/collab/Collab';
import { CollabFooter } from './components/collab/CollabFooter';
import { CollabMobileMenu } from './components/collab/CollabMobileMenu';
import { RoomDialog } from './components/collab/RoomDialog';
import { ShareDialog } from './components/collab/ShareDialog';
import { Minimap } from './components/collab/Minimap';
import { HistoryViewer } from './components/collab/HistoryViewer';
import { HistoryExportDialog } from './components/collab/HistoryExportDialog';
import { RoomHistoryManager } from './components/collab/RoomHistoryManager';
import { useCollaboration } from './hooks/useCollaboration';
import { useSocket } from './hooks/useSocket';
import { throttle } from './utils/throttle';
import debounce from 'lodash.debounce';
import { FeatureFlags } from './utils/feature-flags';
import { CollaborationHistoryService } from './services/collaboration-history';
import type { HistoryEntry } from './types/history';
import './App.css';
import './styles/excalidraw-overrides.css';

function App() {
  const socket = useSocket();
  const collaboration = useCollaboration();

  // Create debounced version of syncElements to reduce network traffic
  const debouncedSyncElements = useMemo(
    () => debounce((elements: any[], files: any) => {
      collaboration.syncElements(elements, files);
    }, 100), // 100ms debounce to batch rapid changes
    [collaboration]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSyncElements.cancel();
    };
  }, [debouncedSyncElements]);
  const [, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
  } | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<RoomUser[]>([]);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [roomDialogError, setRoomDialogError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingUrlJoin, setPendingUrlJoin] = useState<{
    roomId: string;
    username: string;
  } | null>(null);
  // Viewport and cursor data for minimap
  const [cursorData, setCursorData] = useState<
    Map<string, { x: number; y: number; username?: string }>
  >(new Map());
  const [currentElements, setCurrentElements] = useState<
    readonly ExcalidrawElement[]
  >([]);
  const [currentAppState, setCurrentAppState] = useState<Partial<AppState>>({});
  const [historyService] = useState(() => new CollaborationHistoryService());
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  const [showRoomHistoryManager, setShowRoomHistoryManager] = useState(false);
  const [historyExportEntry, setHistoryExportEntry] = useState<HistoryEntry | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [isWaitingForInitialSync, setIsWaitingForInitialSync] = useState(false);

  // Excalidraw APIの参照を保持
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // Collab componentの参照を保持
  const collabRef = useRef<CollabHandle | null>(null);
  // Track last broadcasted/received scene version to prevent echo
  const lastBroadcastedOrReceivedSceneVersionRef = useRef<number>(-1);
  // Track recently deleted elements for proper sync
  const recentlyDeletedTracker = useRef(new RecentlyDeletedElementsTracker());
  const lastElementsRef = useRef<readonly ExcalidrawElement[]>([]);

  // URLパラメータからRoom情報を取得
  useEffect(() => {
    console.log('URL processing effect running...');
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    const usernameFromUrl = urlParams.get('username');

    console.log('URL params:', {
      roomIdFromUrl,
      usernameFromUrl,
      search: window.location.search,
    });

    if (roomIdFromUrl) {
      // Use saved username or generate new one if not provided
      const username = usernameFromUrl || getOrCreateUsername();

      console.log(
        'Setting up URL join for room:',
        roomIdFromUrl,
        'username:',
        username
      );
      // URL経由でRoom参加 - 自動的にルームに参加するためのペンディング状態を設定
      setCurrentRoomId(roomIdFromUrl);
      setCurrentUsername(username);
      setPendingUrlJoin({ roomId: roomIdFromUrl, username: username });

      // URLパラメータをクリア（履歴汚染防止）
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      console.log('No URL parameters found for auto-join');
    }
  }, []);

  // Collab componentが準備できたらペンディング中のURL参加を処理
  useEffect(() => {
    console.log('Pending URL join effect check:', {
      pendingUrlJoin,
      hasCollabRef: !!collabRef.current,
      socketConnected: socket.isConnected,
    });

    if (pendingUrlJoin && collabRef.current && socket.isConnected) {
      console.log('Auto-joining room from URL parameters:', pendingUrlJoin);
      setIsConnecting(true);
      setRoomDialogError(null);

      // Use a timeout to ensure all components are ready
      const timeoutId = setTimeout(() => {
        try {
          if (collabRef.current) {
            collabRef.current.joinRoom({
              roomId: pendingUrlJoin.roomId,
              username: pendingUrlJoin.username,
            });
            console.log('joinRoom called successfully for URL login');
          }
        } catch (error) {
          console.error('Error joining room from URL:', error);
          setRoomDialogError(
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
          setIsConnecting(false);
          setPendingUrlJoin(null);
        }
      }, 100); // Small delay to ensure components are ready

      return () => clearTimeout(timeoutId);
    } else if (pendingUrlJoin && !socket.isConnected) {
      console.log('Socket not connected yet, waiting for connection...');
    }
  }, [pendingUrlJoin, socket.isConnected, isCollaborating]);

  // 初期データの読み込み
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      setInitialData({
        elements: savedData.elements,
        appState: {
          ...savedData.appState,
          collaborators: new Map(),
          // デフォルト値を設定（保存データがある場合でも適用）
          currentItemRoughness: 0, // 0 = architect, 1 = artist, 2 = cartoonist
          currentItemRoundness: 'sharp', // 'sharp' | 'round'
          currentItemFontFamily: 2, // 1 = Virgil, 2 = Helvetica (normal), 3 = Cascadia
        },
      });
    } else {
      setInitialData({
        elements: [],
        appState: {
          collaborators: new Map(),
          // デフォルト値を設定
          currentItemRoughness: 0, // 0 = architect, 1 = artist, 2 = cartoonist
          currentItemRoundness: 'sharp', // 'sharp' | 'round'
          currentItemFontFamily: 2, // 1 = Virgil, 2 = Helvetica (normal), 3 = Cascadia
        },
      });
    }
  }, []);

  // コラボレーション状態の同期
  useEffect(() => {
    setIsCollaborating(collaboration.isCollaborating);
  }, [collaboration.isCollaborating]);

  // デバッグ用: ソケット接続時に collaboration 状態をログ出力
  useEffect(() => {
    console.log('Collaboration state update:', {
      isCollaborating,
      socketConnected: socket.isConnected,
      collaborationState: collaboration.isCollaborating,
    });
  }, [isCollaborating, socket.isConnected, collaboration.isCollaborating]);

  // ウィンドウタイトルの更新
  useEffect(() => {
    let title = 'Excalidraw Board';

    if (currentRoomId && currentUsername && isCollaborating) {
      title = `${title} - ${currentRoomId} - ${currentUsername}`;
    }

    document.title = title;
  }, [currentRoomId, currentUsername, isCollaborating]);

  // Socket events are now handled through encrypted broadcasts in Collab component

  // 公式方式: シンプルなremote scene update処理
  const handleRemoteSceneUpdate = useCallback((elements: any[]) => {
    const excalidrawAPI = excalidrawAPIRef.current;
    if (excalidrawAPI) {
      console.log(
        'Official-style handleRemoteSceneUpdate:',
        elements.length,
        'elements'
      );

      // 公式方式: リモート更新を適用
      excalidrawAPI.updateScene({
        elements: elements as any,
      });

      console.log('Remote scene updated');
    }
  }, []);

  // 公式方式: reconciliation処理
  const _reconcileElements = useCallback(
    (remoteElements: any[]) => {
      const excalidrawAPI = excalidrawAPIRef.current;
      if (!excalidrawAPI) return [];

      console.log(
        'Official-style _reconcileElements:',
        remoteElements.length,
        'remote elements'
      );

      const localElements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const restoredRemoteElements = restoreElements(remoteElements, null);

      console.log(
        `Reconciliation: ${localElements.length} local + ${remoteElements.length} remote`
      );

      const reconciledElements = reconcileElements(
        localElements as any,
        restoredRemoteElements as any,
        appState as any
      );

      console.log(`Reconciled result: ${reconciledElements.length} elements`);

      // 公式方式: reconciliation前にバージョン設定でbroadcast防止
      const newSceneVersion = getSceneVersion(reconciledElements);
      lastBroadcastedOrReceivedSceneVersionRef.current = newSceneVersion;
      collaboration.setLastReceivedSceneVersion(reconciledElements);

      console.log(
        'Set scene version to prevent re-broadcasting:',
        newSceneVersion
      );

      return reconciledElements;
    },
    [collaboration]
  );

  // Collab コンポーネントからの同期データ受信（公式方式採用）
  const handleCollabSceneUpdate = useCallback(
    (data: { elements: any[]; appState: any; replaceAll?: boolean }) => {
      console.log(
        'Received scene update from Collab:',
        data.elements.length,
        'elements',
        data.replaceAll ? '(REPLACE ALL)' : ''
      );

      let finalElements: any[];
      
      if (data.replaceAll || isWaitingForInitialSync) {
        // For replaceAll (e.g., history restore) or initial sync for new room joiners
        console.log(
          data.replaceAll 
            ? 'Direct replacement mode - skipping reconciliation' 
            : 'Initial sync mode - skipping reconciliation for new room joiner'
        );
        finalElements = data.elements;
        handleRemoteSceneUpdate(finalElements);
        
        // Clear the initial sync flag after first data reception
        if (isWaitingForInitialSync) {
          setIsWaitingForInitialSync(false);
          console.log('Initial sync completed, cleared waiting flag');
        }
      } else {
        // 公式方式: reconcile → handleRemoteSceneUpdate の順序
        const reconciledElements = _reconcileElements(data.elements);
        finalElements = reconciledElements;
        if (reconciledElements.length >= 0) {
          // 0でも更新する
          handleRemoteSceneUpdate(reconciledElements);
        }
      }

      // Save history with debounce and update count
      if (isCollaborating && collaboration.roomKey && currentUsername) {
        historyService.saveHistoryEntry(
          collaboration.roomKey,
          currentUsername,
          [...finalElements] as ExcalidrawElement[],
          data.appState,
          excalidrawAPIRef.current?.getFiles(),
          false,
          currentRoomId || undefined
        );
        const history = historyService.getHistory(collaboration.roomKey);
        setHistoryCount(history.entries.length);
      }
    },
    [_reconcileElements, handleRemoteSceneUpdate, isCollaborating, collaboration.roomKey, currentUsername, currentRoomId, historyService, isWaitingForInitialSync]
  );

  // Collab コンポーネントからのビューポート更新受信
  const handleCollabViewportUpdate = useCallback(
    (data: {
      userId: string;
      scrollX: number;
      scrollY: number;
      zoom: number;
    }) => {
      console.log('Received viewport update:', data);

      // Viewport data is no longer tracked (removed from minimap)

      // Check if we are following this user
      if (excalidrawAPIRef.current) {
        const appState = excalidrawAPIRef.current.getAppState();
        if (
          appState.userToFollow &&
          appState.userToFollow.socketId === data.userId
        ) {
          console.log('Following user viewport update:', data);

          // Update viewport to follow the user
          excalidrawAPIRef.current.updateScene({
            appState: {
              scrollX: data.scrollX,
              scrollY: data.scrollY,
              zoom: data.zoom,
            },
          });
        }
      }
    },
    []
  );

  // Create throttled pointer update handler with cleanup
  const throttledPointerUpdateRef = useRef<ReturnType<typeof throttle> | null>(null);
  
  const handleCollabPointerUpdate = useCallback(
    (data: {
      userId: string;
      x: number;
      y: number;
      username?: string;
      selectedElementIds?: readonly string[];
    }) => {
      // Update cursor data for minimap
      setCursorData((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          x: data.x,
          y: data.y,
          username: data.username,
        });
        return newMap;
      });

      // Update Excalidraw collaborators with pointer using official API
      if (excalidrawAPIRef.current) {
        // Get current collaborators map from Excalidraw
        const currentAppState = excalidrawAPIRef.current.getAppState();
        const collaboratorsMap = new Map(
          currentAppState.collaborators || new Map()
        );

        // Find collaborator info from our state
        const collaborator = collaborators.find((c) => c.id === data.userId);
        const username =
          data.username ||
          collaborator?.username ||
          `User ${data.userId.slice(0, 6)}`;
        const color =
          collaborator?.color ||
          `#${Math.floor(Math.random() * 16777215).toString(16)}`;

        // Get existing collaborator to preserve any other properties
        const existingCollaborator = collaboratorsMap.get(data.userId) || {};

        // Update collaborator with new pointer information
        collaboratorsMap.set(data.userId, {
          ...existingCollaborator, // Preserve existing properties
          username: username,
          avatarUrl: existingCollaborator.avatarUrl || null,
          color: existingCollaborator.color || {
            background: color,
            stroke: color,
          },
          pointer: {
            x: data.x,
            y: data.y,
          },
          selectedElementIds: data.selectedElementIds || [],
          socketId: existingCollaborator.socketId || data.userId, // Preserve or set socketId
        });

        // Use Excalidraw's official updateScene method for collaborator pointers
        excalidrawAPIRef.current.updateScene({
          appState: {
            collaborators: collaboratorsMap,
          },
        });
      }
    },
    [collaborators]
  );
  
  // Create throttled function once using useMemo to prevent memory leak
  const throttledPointerUpdate = useMemo(
    () => throttle(handleCollabPointerUpdate, 16), // 16ms throttle matches Excalidraw's CURSOR_SYNC_TIMEOUT
    [handleCollabPointerUpdate]
  );

  // Store in ref for cleanup
  useEffect(() => {
    throttledPointerUpdateRef.current = throttledPointerUpdate;

    return () => {
      // Cleanup: cancel throttled function on unmount
      if (throttledPointerUpdateRef.current) {
        throttledPointerUpdateRef.current.cancel();
      }
    };
  }, [throttledPointerUpdate]);
  
  // Use throttled version in callbacks
  const handleCollabPointerUpdateThrottled = useCallback(
    (data: Parameters<typeof handleCollabPointerUpdate>[0]) => {
      if (throttledPointerUpdateRef.current) {
        throttledPointerUpdateRef.current(data);
      }
    },
    []
  );

  // 公式方式: リモート更新による複雑なフラグ管理は不要

  // Handle broadcasting full scene when new user joins
  useEffect(() => {
    const handleBroadcastFullScene = () => {
      if (isCollaborating && collabRef.current && excalidrawAPIRef.current) {
        // Get elements including recently deleted ones for proper sync
        const elementsIncludingDeleted = getSceneElementsIncludingDeleted(
          excalidrawAPIRef.current,
          recentlyDeletedTracker.current.getRecentlyDeletedElements()
        );
        console.log(
          'Broadcasting full scene to new user:',
          elementsIncludingDeleted.length,
          'elements (including recently deleted)'
        );
        // Get files if image sharing is enabled
        const files = FeatureFlags.isImageSharingEnabled() 
          ? excalidrawAPIRef.current.getFiles() 
          : {};
        
        // Force sync all elements including recently deleted ones for initial sync
        collaboration.broadcastScene(
          elementsIncludingDeleted.map((el) => ({
            ...el,
            version: el.version || 1,
          })),
          true, // Force broadcast
          files,
          true // Mark as replaceAll for initial sync to new users
        );
      }
    };

    window.addEventListener('broadcastFullScene', handleBroadcastFullScene);
    return () =>
      window.removeEventListener(
        'broadcastFullScene',
        handleBroadcastFullScene
      );
  }, [isCollaborating, collaboration]);

  // 公式方式: シンプルなonChange処理
  const handleChange = useCallback(
    (elements: any, appState: any, files: any) => {
      console.log('Scene changed:', {
        elements: elements.length,
        isCollaborating,
      });

      // Update current elements and app state for minimap
      setCurrentElements(elements);
      setCurrentAppState(appState);

      // Track element deletions for proper sync
      if (excalidrawAPIRef.current) {
        recentlyDeletedTracker.current.trackElementDeletions(
          lastElementsRef.current,
          elements
        );
        lastElementsRef.current = elements;

        // Periodic cleanup of old deleted elements
        recentlyDeletedTracker.current.cleanup();
      }

      // Save history with debounce and update count
      if (isCollaborating && collaboration.roomKey && currentUsername) {
        historyService.saveHistoryEntry(
          collaboration.roomKey,
          currentUsername,
          elements,
          appState,
          files,
          false,
          currentRoomId || undefined
        );
        const history = historyService.getHistory(collaboration.roomKey);
        setHistoryCount(history.entries.length);
      }

      // 公式方式: コラボレーション同期（削除された要素も含む）
      if (
        isCollaborating &&
        collaboration.isCollaborating &&
        excalidrawAPIRef.current
      ) {
        // Get elements including recently deleted ones for proper sync
        const elementsForSync = getSceneElementsIncludingDeleted(
          excalidrawAPIRef.current,
          recentlyDeletedTracker.current.getRecentlyDeletedElements()
        );
        console.log('Syncing elements including recently deleted:', {
          totalElements: elementsForSync.length,
          currentElements: elements.length,
          recentlyDeleted: elementsForSync.length - elements.length,
        });
        
        // Include files in sync if image sharing is enabled
        const filesToSync = FeatureFlags.isImageSharingEnabled() ? files : {};

        // Use debounced sync to reduce network traffic
        debouncedSyncElements(
          elementsForSync.map((el) => ({
            ...el,
            version: el.version || 1,
          })),
          filesToSync
        );
      }

      // ローカルストレージへの保存
      if (!isCollaborating) {
        saveToLocalStorage({ elements, appState, files });
      }
    },
    [isCollaborating, collaboration, currentUsername, currentRoomId, historyService]
  );

  // Excalidrawコンポーネントがマウントされたとき
  const handleExcalidrawMount = useCallback((api: any) => {
    setExcalidrawAPI(api);
    excalidrawAPIRef.current = api;

    // Enable pointer events for UserList to make avatars clickable
    const enableUserListPointerEvents = () => {
      const style = document.createElement('style');
      style.textContent = `
        .excalidraw .UserList,
        .excalidraw .UserList__wrapper {
          pointer-events: auto !important;
        }
        
        .excalidraw .UserList > * {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        
        .excalidraw .UserList__collaborator {
          pointer-events: auto !important;
          cursor: pointer !important;
          transition: transform 0.2s ease;
        }
        
        .excalidraw .UserList__collaborator:hover {
          transform: scale(1.1);
          opacity: 0.9;
        }
        
        .excalidraw .UserList__collaborator--avatar-only {
          pointer-events: auto !important;
        }
        
        /* Ensure follow mode UI is above other elements */
        .excalidraw .follow-mode {
          z-index: 1000 !important;
        }
      `;
      document.head.appendChild(style);
    };

    // Apply styles after a short delay to ensure DOM is ready
    setTimeout(enableUserListPointerEvents, 100);
  }, []);

  // デバッグ用: グローバルにsocket関数とExcalidraw APIを公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).socket = socket;
      (window as any).socketConnected = socket.isConnected;
      (window as any).isCollaborating = isCollaborating;
      (window as any).excalidrawAPI = excalidrawAPIRef.current;
      (window as any).pendingUrlJoin = pendingUrlJoin;
      (window as any).currentRoomId = currentRoomId;
      (window as any).currentUsername = currentUsername;
      // Add collaboration state for debugging username sync issues
      (window as any).collaborationState = collabRef.current?.getState?.();
      // Add socket ID for debugging
      (window as any).socketId = socket?.getSocketId?.();
    }
  }, [
    socket,
    isCollaborating,
    excalidrawAPIRef.current,
    pendingUrlJoin,
    currentRoomId,
    currentUsername,
    collabRef.current,
  ]);

  // Create throttled scroll handler with cleanup
  const throttledScrollChangeRef = useRef<ReturnType<typeof throttle> | null>(null);
  
  const handleScrollChange = useCallback(
    (scrollX: number, scrollY: number) => {
      if (isCollaborating && collabRef.current && excalidrawAPIRef.current) {
        const appState = excalidrawAPIRef.current.getAppState();
        const zoom = appState.zoom || 1;

        // Broadcast viewport update
        collabRef.current.broadcastViewportUpdate(scrollX, scrollY, zoom);
      }
    },
    [isCollaborating]
  );
  
  // Create throttled function once using useMemo to prevent memory leak
  const throttledScrollChange = useMemo(
    () => throttle(handleScrollChange, 100), // 100ms throttle
    [handleScrollChange]
  );

  // Store in ref for cleanup
  useEffect(() => {
    throttledScrollChangeRef.current = throttledScrollChange;

    return () => {
      // Cleanup: cancel throttled function on unmount
      if (throttledScrollChangeRef.current) {
        throttledScrollChangeRef.current.cancel();
      }
    };
  }, [throttledScrollChange]);
  
  // Use throttled version in callbacks
  const handleScrollChangeThrottled = useCallback(
    (scrollX: number, scrollY: number) => {
      if (throttledScrollChangeRef.current) {
        throttledScrollChangeRef.current(scrollX, scrollY);
      }
    },
    []
  );

  // ポインター更新のハンドラ (Excalidraw style)
  const handlePointerUpdate = useCallback(
    (payload: {
      pointer: { x: number; y: number };
      button: 'up' | 'down';
      pointersMap: any;
    }) => {
      // Excalidraw style: only broadcast if we have less than 2 pointers and are collaborating
      if (
        payload.pointersMap &&
        payload.pointersMap.size < 2 &&
        isCollaborating &&
        collabRef.current &&
        payload.pointer &&
        excalidrawAPIRef.current
      ) {
        // Get current selection state
        const appState = excalidrawAPIRef.current.getAppState();
        const selectedElementIds = appState.selectedElementIds
          ? Object.keys(appState.selectedElementIds).filter(
              (id) => appState.selectedElementIds![id]
            )
          : [];

        // Throttled broadcast to prevent excessive network traffic
        collabRef.current.broadcastPointerUpdate(
          payload.pointer.x,
          payload.pointer.y,
          selectedElementIds
        );
      }
    },
    [isCollaborating]
  );

  // コラボレーション状態変更のハンドラ
  const handleCollaborationStateChange = useCallback(
    (
      collaborating: boolean,
      roomKey?: string,
      roomId?: string,
      username?: string
    ) => {
      console.log('handleCollaborationStateChange called with:', {
        collaborating,
        roomKey: roomKey ? 'exists' : 'none',
        roomId,
        username,
      });

      setIsCollaborating(collaborating);

      if (collaborating && roomKey) {
        // Start collaboration with the room key
        collaboration.startCollaboration(roomKey);
        // Set room and username for title
        setCurrentRoomId(roomId || null);
        setCurrentUsername(username || null);
        console.log('Set room and username:', { roomId, username });
        // Clear pending URL join state on successful collaboration start
        setPendingUrlJoin(null);
        console.log('Cleared pending URL join - collaboration started successfully');
        // Close dialog and reset states on successful connection
        setShowRoomDialog(false);
        setIsConnecting(false);
        setRoomDialogError(null);
        
        // Initialize history for this room
        const history = historyService.getHistory(roomKey);
        setHistoryCount(history.entries.length);
      } else if (!collaborating) {
        // Stop collaboration
        collaboration.stopCollaboration();
        setCurrentRoomId(null);
        setCurrentUsername(null);
        setIsConnecting(false);
        setIsWaitingForInitialSync(false); // Clear initial sync flag
        
        // Stop debounced saving for this room
        if (roomKey) {
          historyService.stopHistorySaving(roomKey);
        }
      }
    },
    [collaboration, historyService, currentUsername]
  );

  // コラボレーター変更のハンドラ - Excalidraw本体機能を使用
  const handleCollaboratorsChange = useCallback(
    (newCollaborators: RoomUser[]) => {
      setCollaborators(newCollaborators);

      // Clean up cursor data for removed collaborators
      const collaboratorIds = new Set(newCollaborators.map((c) => c.id));

      setCursorData((prev) => {
        const newMap = new Map(prev);
        for (const [userId] of newMap) {
          if (!collaboratorIds.has(userId)) {
            newMap.delete(userId);
          }
        }
        return newMap;
      });

      // Update Excalidraw's appState.collaborators using official API
      if (excalidrawAPIRef.current) {
        const collaboratorsMap = new Map();
        newCollaborators.forEach((collaborator) => {
          collaboratorsMap.set(collaborator.id, {
            username: collaborator.username,
            avatarUrl: null,
            color: {
              background: collaborator.color,
              stroke: collaborator.color,
            },
            pointer: undefined, // Will be updated by pointer events
            selectedElementIds: [], // Will be updated by pointer events
            socketId: collaborator.id, // Add socketId for follow functionality
          });
        });

        console.log('Updating Excalidraw collaborators using official API:', {
          collaboratorsCount: newCollaborators.length,
          collaboratorsMap: Array.from(collaboratorsMap.entries()),
        });

        // Use Excalidraw's official updateScene method for collaborators
        excalidrawAPIRef.current.updateScene({
          appState: {
            collaborators: collaboratorsMap,
          },
        });

        // Reapply pointer events styles when collaborators change
        setTimeout(() => {
          const userListElements = document.querySelectorAll(
            '.UserList, .UserList__wrapper, .UserList__collaborator'
          );
          userListElements.forEach((el) => {
            (el as HTMLElement).style.pointerEvents = 'auto';
            (el as HTMLElement).style.cursor = 'pointer';
          });
        }, 200);
      }
    },
    []
  );

  // ルームダイアログを閉じる
  const handleCloseRoomDialog = useCallback(() => {
    setShowRoomDialog(false);
    setRoomDialogError(null);
    setIsConnecting(false);
  }, []);

  // ShareDialogを開く
  const handleOpenShareDialog = useCallback(() => {
    setShowShareDialog(true);
    setRoomDialogError(null);
  }, []);

  // ShareDialogを閉じる
  const handleCloseShareDialog = useCallback(() => {
    setShowShareDialog(false);
    setRoomDialogError(null);
  }, []);

  // ユーザー名更新のハンドラ - Fix username synchronization
  const handleUpdateUsername = useCallback((newUsername: string) => {
    // Update App component state first to ensure immediate UI sync
    setCurrentUsername(newUsername);

    // Update collaboration component
    if (collabRef.current) {
      collabRef.current.updateUsername(newUsername);
    }

    console.log('App: Username updated to:', newUsername);
  }, []);

  // ルーム参加処理
  const handleJoinRoom = useCallback(
    (data: { roomId: string; username: string }) => {
      if (collabRef.current && excalidrawAPIRef.current) {
        // すでに共有中かチェック
        if (isCollaborating && currentRoomId) {
          const confirmSwitch = window.confirm(
            `現在ルーム「${currentRoomId}」で共有中です。\n新しいルーム「${data.roomId}」に切り替えますか？\n\n注意：現在の共有は終了し、キャンバスの内容は削除されます。`
          );
          
          if (!confirmSwitch) {
            setIsConnecting(false);
            return;
          }
          
          // 現在のルームから退出
          collabRef.current.leaveRoom();
        } else {
          // 共有中でない場合、キャンバスに要素があるかチェック
          const elements = excalidrawAPIRef.current.getSceneElements();
          if (elements && elements.length > 0) {
            const confirmed = window.confirm(
              'キャンバスに描画内容があります。コラボレーションに参加すると、現在の内容は削除されます。続行しますか？'
            );
            
            if (!confirmed) {
              setIsConnecting(false);
              return; // キャンセルされた場合は参加処理を中止
            }
          }
        }
        
        // キャンバスをクリア (excalidraw公式のresetScene APIを使用)
        excalidrawAPIRef.current.resetScene();
        excalidrawAPIRef.current.history.clear();

        // 削除要素トラッカーもクリア (過去の削除要素が新しいルームに持ち込まれないように)
        recentlyDeletedTracker.current.clear();

        // Set flag to wait for initial sync from existing users
        setIsWaitingForInitialSync(true);
        
        setIsConnecting(true);
        setRoomDialogError(null);
        try {
          collabRef.current.joinRoom(data);
        } catch (error) {
          setRoomDialogError(
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
          setIsConnecting(false);
          return;
        }
      }
      // Close both dialogs after join attempt
      setShowRoomDialog(false);
      setShowShareDialog(false);
      setIsConnecting(false);
    },
    [isCollaborating, currentRoomId]
  );

  // ルーム退出処理
  const handleLeaveRoom = useCallback(() => {
    if (collabRef.current) {
      collabRef.current.leaveRoom();
    }
    // Close ShareDialog after leaving room
    setShowShareDialog(false);
  }, []);

  // ユーザー名変更処理 - Fix username synchronization
  const handleUsernameChange = useCallback((newUsername: string) => {
    // Update App component state first to ensure immediate UI sync
    setCurrentUsername(newUsername);
    saveUsername(newUsername); // Save to localStorage

    // Update collaboration component
    if (collabRef.current) {
      collabRef.current.updateUsername(newUsername);
    }

    console.log('App: Username changed to:', newUsername);
  }, []);

  // Handle viewport change from minimap
  const handleMinimapViewportChange = useCallback(
    (scrollX: number, scrollY: number) => {
      if (excalidrawAPIRef.current) {
        excalidrawAPIRef.current.updateScene({
          appState: {
            scrollX,
            scrollY,
          },
        });
      }
    },
    []
  );

  // Handle restore from history
  const handleRestoreFromHistory = useCallback(
    async (entry: HistoryEntry) => {
      // Confirm dialog
      const message = isCollaborating
        ? '現在のキャンバスが履歴の状態で上書きされます。\n共有中のため、全参加者のキャンバスも更新されます。\n続行しますか？'
        : '現在のキャンバスが履歴の状態で上書きされます。\n続行しますか？';

      if (!window.confirm(message)) {
        return;
      }

      // Restore to local canvas
      if (excalidrawAPIRef.current) {
        const currentAppState = excalidrawAPIRef.current.getAppState();
        
        // Filter out properties that shouldn't be restored
        const { collaborators, ...restAppState } = entry.appState || {};
        
        excalidrawAPIRef.current.updateScene({
          elements: entry.elements,
          appState: {
            // Restore app state without collaborators
            ...restAppState,
            // Keep current user's viewport and collaboration state
            scrollX: currentAppState.scrollX,
            scrollY: currentAppState.scrollY,
            zoom: currentAppState.zoom,
            collaborators: currentAppState.collaborators, // Keep current collaborators
          },
        });

        // Broadcast to all participants if collaborating with replaceAll flag
        if (isCollaborating && collabRef.current) {
          await collabRef.current.broadcastSceneUpdate(
            entry.elements,
            entry.appState,
            {}, // No files for now
            true // replaceAll = true for history restore
          );
        }
      }

      // Close history viewer
      setShowHistoryViewer(false);
    },
    [isCollaborating]
  );


  // Handle received image files from remote users
  const handleImageReceived = useCallback((files: BinaryFiles) => {
    // Skip image handling if feature is disabled
    if (!FeatureFlags.isImageSharingEnabled()) {
      console.log('Image sharing is disabled by feature flag');
      return;
    }

    if (!excalidrawAPIRef.current) return;

    try {
      console.log(
        'Received image files from remote users:',
        Object.keys(files)
      );

      // Add files to Excalidraw
      excalidrawAPIRef.current.addFiles(files);

    } catch (error) {
      console.error('Error handling received images:', error);
    }
  }, []);


  return (
    <div className="app">
      {/* Hidden Collab component for backend functionality */}
      <div style={{ display: 'none' }}>
        <Collab
          ref={collabRef}
          onCollaborationStateChange={handleCollaborationStateChange}
          onCollaboratorsChange={handleCollaboratorsChange}
          onSceneUpdate={handleCollabSceneUpdate}
          onPointerUpdate={handleCollabPointerUpdateThrottled}
          onViewportUpdate={handleCollabViewportUpdate}
          onImageReceived={handleImageReceived}
        />
      </div>

      <div className="excalidraw-wrapper" data-testid="excalidraw-canvas">
        <Excalidraw
          initialData={initialData as any}
          onChange={handleChange}
          excalidrawAPI={handleExcalidrawMount}
          onPointerUpdate={handlePointerUpdate}
          onScrollChange={handleScrollChangeThrottled}
          langCode="ja"
          theme={(currentAppState as any).theme || "light"}
          name="Excalidraw Board"
          UIOptions={{
            canvasActions: {
              loadScene: true,
              saveToActiveFile: true,
              export: {
                saveFileToDisk: true,
              },
              toggleTheme: true,
            },
          }}
          renderTopRightUI={useMemo(
            () => () => {
              console.log('Collaborators debug (renderTopRightUI):', {
                collaborators: collaborators.map((c) => ({
                  id: c.id,
                  username: c.username,
                })),
                currentUsername,
                collaboratorsLength: collaborators.length,
                isCollaborating,
                renderTimestamp: new Date().toISOString(),
              });

              return (
                <LiveCollaborationTrigger
                  isCollaborating={isCollaborating}
                  onSelect={handleOpenShareDialog}
                  data-testid="live-collaboration-trigger"
                />
              );
            },
            [isCollaborating, handleOpenShareDialog]
          )}
        >
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveToActiveFile />
            <MainMenu.DefaultItems.Export />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.Separator />
            
            {/* Room history management - always accessible */}
            <MainMenu.ItemCustom>
              <button 
                className="menu-item"
                onClick={() => setShowRoomHistoryManager(true)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  color: 'inherit',
                }}
              >
                🗂️ 履歴管理
              </button>
            </MainMenu.ItemCustom>

            {/* Mobile collaboration menu - only rendered on mobile devices */}
            <CollabMobileMenu
              isConnected={socket.isConnected}
              isInRoom={isCollaborating}
              roomId={currentRoomId}
              currentUserId={currentUsername || ''}
              onUsernameChange={handleUsernameChange}
            />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Hints.HelpHint />
          </WelcomeScreen>

          {/* Desktop collaboration footer - only show when sharing */}
          {isCollaborating && (
            <CollabFooter
              roomId={currentRoomId}
              currentUserId={currentUsername || ''}
              onUsernameChange={handleUsernameChange}
              onShowHistory={() => setShowHistoryViewer(true)}
              historyCount={historyCount}
            />
          )}
        </Excalidraw>
      </div>

      {/* Minimap - show by default */}
      {(currentElements.length > 0 ||
        Object.keys(currentAppState).length > 0) && (
        <Minimap
          elements={currentElements}
          appState={{
            scrollX: currentAppState.scrollX || 0,
            scrollY: currentAppState.scrollY || 0,
            zoom:
              typeof currentAppState.zoom === 'number'
                ? { value: currentAppState.zoom }
                : currentAppState.zoom || { value: 1 },
            width: window.innerWidth,
            height: window.innerHeight,
          }}
          collaborators={collaborators}
          cursorData={cursorData}
          onViewportChange={handleMinimapViewportChange}
          isCollaborating={isCollaborating}
          excalidrawAPI={excalidrawAPIRef.current}
        />
      )}

      {/* Room dialog */}
      {showRoomDialog && (
        <RoomDialog
          isOpen={showRoomDialog}
          isConnecting={isConnecting}
          error={roomDialogError}
          onJoin={handleJoinRoom}
          onClose={handleCloseRoomDialog}
          initialRoomId={currentRoomId}
          initialUsername={currentUsername}
        />
      )}

      {/* Enhanced Share dialog */}
      {showShareDialog && (
        <ShareDialog
          isOpen={showShareDialog}
          isConnecting={isConnecting}
          error={roomDialogError}
          onJoin={handleJoinRoom}
          onClose={handleCloseShareDialog}
          onLeave={handleLeaveRoom}
          onUpdateUsername={handleUpdateUsername}
          isCollaborating={isCollaborating}
          currentRoomId={currentRoomId}
          currentUsername={currentUsername}
          collaborators={collaborators}
        />
      )}

      {/* History Viewer */}
      {showHistoryViewer && collaboration.roomKey && (
        <HistoryViewer
          roomId={collaboration.roomKey}
          historyService={historyService}
          theme={(currentAppState as any).theme || "light"}
          onClose={() => setShowHistoryViewer(false)}
          onExport={(entry) => {
            setHistoryExportEntry(entry);
            setShowHistoryViewer(false);
          }}
          onRestore={handleRestoreFromHistory}
        />
      )}

      {/* History Export Dialog */}
      {historyExportEntry && collaboration.roomKey && (
        <HistoryExportDialog
          roomId={collaboration.roomKey}
          historyService={historyService}
          entry={historyExportEntry}
          theme={(currentAppState as any).theme || "light"}
          onClose={() => setHistoryExportEntry(null)}
        />
      )}

      {/* Room History Manager */}
      {showRoomHistoryManager && (
        <RoomHistoryManager
          historyService={historyService}
          theme={(currentAppState as any).theme || "light"}
          onClose={() => setShowRoomHistoryManager(false)}
          onRestore={handleRestoreFromHistory}
        />
      )}
    </div>
  );
}

export default App;
