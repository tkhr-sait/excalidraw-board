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
  type: 'sync' | 'cursor' | 'user-update' | 'scene-update';
  elements?: readonly ExcalidrawElement[];
  appState?: Partial<AppState>;
  collaborators?: Map<string, Collaborator>;
  cursor?: { x: number; y: number };
  files?: BinaryFiles;
  userId: string;
  timestamp: number;
  payload?: any;
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
    appState: Partial<AppState>,
    files?: BinaryFiles
  ): SyncData {
    return {
      type: 'sync',
      elements,
      appState: {
        ...appState,
        collaborators: this.collaborators
      },
      files,
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

    // Add local elements first
    localElements.forEach(element => {
      if (element && element.id) {
        elementMap.set(element.id, element);
      }
    });

    // Merge remote elements using version comparison
    remoteElements.forEach(element => {
      if (element && element.id) {
        const existing = elementMap.get(element.id);
        
        // Use version and versionNonce for conflict resolution
        const shouldUpdate = !existing || 
          element.version > existing.version || 
          (element.version === existing.version && element.versionNonce > existing.versionNonce);
          
        if (shouldUpdate) {
          elementMap.set(element.id, element);
        }
      }
    });

    const result = Array.from(elementMap.values());
    
    // Filter out deleted elements that are old enough to be safely removed
    return result.filter(element => {
      if (!element.isDeleted) return true;
      
      // Keep recently deleted elements for a short time to ensure proper sync
      const timeSinceUpdate = Date.now() - (element.updated || 0);
      return timeSinceUpdate < 5000; // Keep for 5 seconds
    });
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

  // Filter elements for synchronization (similar to official excalidraw's getSyncableElements)
  getSyncableElements(elements: readonly ExcalidrawElement[]): readonly ExcalidrawElement[] {
    return elements.filter((element) => {
      // Include deleted elements for sync (they need to be propagated)
      if (element.isDeleted) return true;
      
      // Exclude invisibly small elements that haven't been deleted
      // Check for very small dimensions that would be invisible
      if (element.width != null && element.height != null) {
        const isInvisiblySmall = element.width < 1 && element.height < 1;
        return !isInvisiblySmall;
      }
      
      return true;
    });
  }

  // Prepare scene data for synchronization with proper element filtering
  prepareSceneUpdate(
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>,
    files?: BinaryFiles
  ): SyncData {
    const syncableElements = this.getSyncableElements(elements);
    
    return {
      type: 'scene-update',
      elements: syncableElements,
      appState: {
        ...appState,
        collaborators: this.collaborators
      },
      files,
      userId: this.userId,
      timestamp: Date.now()
    };
  }
}