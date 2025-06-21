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