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
} as const;

export const WS_EVENTS = {
  SERVER: 'server-broadcast',
  SERVER_VOLATILE: 'server-volatile-broadcast',
  USER_FOLLOW_CHANGE: 'user-follow-change',
  USER_FOLLOW_ROOM_CHANGE: 'user-follow-room-change',
} as const;

export interface SocketUpdateDataSource {
  INIT: {
    type: typeof WS_SUBTYPES.INIT;
    payload: {
      elements: readonly any[];
    };
  };
  UPDATE: {
    type: typeof WS_SUBTYPES.UPDATE;
    payload: {
      elements: readonly any[];
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
      sceneBounds: { x: number; y: number; width: number; height: number };
    };
  };
}

export type SocketUpdateData = SocketUpdateDataSource[keyof SocketUpdateDataSource];

export interface SocketEvents {
  // Client -> Server
  'join-room': (data: { roomId: string; username: string }) => void;
  'leave-room': (data: { roomId: string }) => void;
  'scene-update': (data: SceneUpdate) => void;
  'pointer-update': (data: { x: number; y: number }) => void;
  'user-visibility': (data: { visible: boolean }) => void;
  'client-broadcast': (encryptedData: ArrayBuffer, iv: Uint8Array) => void;
  
  // Server -> Client
  'room-joined': (data: RoomData) => void;
  'user-joined': (data: RoomUser) => void;
  'user-left': (data: { userId: string }) => void;
  'scene-data': (data: SceneUpdate) => void;
  'collaborator-pointer': (data: { userId: string; x: number; y: number }) => void;
  'error': (data: { message: string; code: string }) => void;
  'init-room': () => void;
  'new-user': (socketId: string) => void;
  'room-user-change': (clients: string[]) => void;
  'first-in-room': () => void;
}

export type SocketEventName = keyof SocketEvents;