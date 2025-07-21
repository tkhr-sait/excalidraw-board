export interface RoomUser {
  id: string;
  username: string;
  color: string;
  pointer?: { x: number; y: number };
  selectedElementIds?: string[];
}

export interface RoomData {
  roomId: string;
  users: RoomUser[];
}

export interface SceneUpdate {
  elements: any[];
  appState: any;
  collaborators?: RoomUser[];  // Optional for backward compatibility
}

export interface CollaboratorPointer {
  userId: string;
  x: number;
  y: number;
  username?: string;
}

export const WS_SUBTYPES = {
  INIT: 'SCENE_INIT',
  UPDATE: 'SCENE_UPDATE', 
  MOUSE_LOCATION: 'MOUSE_LOCATION',
  IDLE_STATUS: 'IDLE_STATUS',
  USER_VISIBLE_SCENE_BOUNDS: 'USER_VISIBLE_SCENE_BOUNDS',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  IMAGE_REQUEST: 'IMAGE_REQUEST',
  IMAGE_RESPONSE: 'IMAGE_RESPONSE',
} as const;

export const WS_EVENTS = {
  SERVER: 'server-broadcast',
  SERVER_VOLATILE: 'server-volatile-broadcast',
  USER_FOLLOW: 'user-follow',
  USER_FOLLOW_ROOM_CHANGE: 'user-follow-room-change',
  BROADCAST_UNFOLLOW: 'broadcast-unfollow',
} as const;

export interface SocketUpdateDataSource {
  INIT: {
    type: typeof WS_SUBTYPES.INIT;
    payload: {
      elements: readonly any[];
      appState?: any;
    };
  };
  UPDATE: {
    type: typeof WS_SUBTYPES.UPDATE;
    payload: {
      elements: readonly any[];
      appState?: any;
    };
  };
  MOUSE_LOCATION: {
    type: typeof WS_SUBTYPES.MOUSE_LOCATION;
    payload: {
      socketId: string;
      pointer: { x: number; y: number };
      button: 'up' | 'down';
      selectedElementIds: readonly string[];
      username: string;
    };
  };
  IDLE_STATUS: {
    type: typeof WS_SUBTYPES.IDLE_STATUS;
    payload: {
      socketId: string;
      userState: 'active' | 'idle' | 'away';
      username: string;
    };
  };
  USER_VISIBLE_SCENE_BOUNDS: {
    type: typeof WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS;
    payload: {
      socketId: string;
      username: string;
      sceneBounds: { x: number; y: number; width: number; height: number; zoom?: number };
    };
  };
  IMAGE_REQUEST: {
    type: typeof WS_SUBTYPES.IMAGE_REQUEST;
    payload: {
      socketId: string;
      fileIds: string[];
    };
  };
  IMAGE_RESPONSE: {
    type: typeof WS_SUBTYPES.IMAGE_RESPONSE;
    payload: {
      socketId: string;
      files: {
        [fileId: string]: {
          mimeType: string;
          dataURL: string;
          created: number;
          lastRetrieved?: number;
          id: string;
        };
      };
    };
  };
}

export type SocketUpdateData = SocketUpdateDataSource[keyof SocketUpdateDataSource];

export interface SocketEvents {
  // Client -> Server
  'join-room': (roomID: string) => void;
  'server-broadcast': (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => void;
  'server-volatile-broadcast': (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => void;
  'user-follow': (payload: { userToFollow: { socketId: string; username: string }; action: 'FOLLOW' | 'UNFOLLOW' }) => void;
  
  // Server -> Client
  'init-room': () => void;
  'new-user': (socketId: string) => void;
  'room-user-change': (clients: string[]) => void;
  'first-in-room': () => void;
  'client-broadcast': (encryptedData: ArrayBuffer, iv: Uint8Array) => void;
  'user-follow-room-change': (followedBy: string[]) => void;
  'broadcast-unfollow': () => void;
  'error': (data: { message: string; code: string }) => void;
  'username-updated': (data: { socketId: string; username: string }) => void;
}

export type SocketEventName = keyof SocketEvents;