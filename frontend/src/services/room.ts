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