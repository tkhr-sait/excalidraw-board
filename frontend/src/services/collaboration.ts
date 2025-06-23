// Use conditional import for better compatibility
type ExcalidrawElement = any;
type AppState = any;
type BinaryFiles = any;
type Collaborator = {
  pointer: { x: number; y: number };
  button: string;
  selectedElementIds: Record<string, boolean>;
  username: string;
  userState: Record<string, any>;
  color: { background: string; stroke: string };
};

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