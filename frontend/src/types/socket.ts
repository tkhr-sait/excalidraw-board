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
  collaborators: RoomUser[];
}

export interface CollaboratorPointer {
  userId: string;
  x: number;
  y: number;
  username?: string;
}

export interface SocketEvents {
  // Client -> Server
  'join-room': (data: { roomId: string; username: string }) => void;
  'leave-room': (data: { roomId: string }) => void;
  'scene-update': (data: SceneUpdate) => void;
  'pointer-update': (data: { x: number; y: number }) => void;
  'user-visibility': (data: { visible: boolean }) => void;
  
  // Server -> Client
  'room-joined': (data: RoomData) => void;
  'user-joined': (data: RoomUser) => void;
  'user-left': (data: { userId: string }) => void;
  'scene-data': (data: SceneUpdate) => void;
  'collaborator-pointer': (data: { userId: string; x: number; y: number }) => void;
  'error': (data: { message: string; code: string }) => void;
}

export type SocketEventName = keyof SocketEvents;