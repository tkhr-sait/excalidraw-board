import type { RoomUser } from './socket';

export interface CollaborationState {
  isInRoom: boolean;
  roomId: string | null;
  username: string | null;
  collaborators: RoomUser[];
  isConnecting: boolean;
  error: string | null;
}

export interface RoomFormData {
  roomId: string;
  username: string;
}

export interface CollaboratorPointer {
  userId: string;
  x: number;
  y: number;
}

// Excalidraw互換の型定義
export interface ExcalidrawElement {
  id: string;
  version: number;
  isDeleted?: boolean;
  [key: string]: any;
}

export interface ExcalidrawCollaborator {
  id: string;
  pointer?: { x: number; y: number };
  button?: 'up' | 'down';
  selectedElementIds?: readonly string[];
  username?: string;
  userState?: 'active' | 'idle' | 'away';
  color?: string;
}

export interface ExcalidrawAppState {
  selectedElementIds: readonly string[];
  viewMode: boolean;
  zenModeEnabled: boolean;
  [key: string]: any;
}

export interface CollaborationConfig {
  roomId: string;
  roomKey?: string;
  username: string;
  encryptionEnabled: boolean;
  syncInterval: number;
  mouseUpdateThrottle: number;
}