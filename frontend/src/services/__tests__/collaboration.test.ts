import { CollaborationService } from '../collaboration';

// Mock ExcalidrawElement type for testing
interface MockExcalidrawElement {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  versionNonce: number;
}

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    service = new CollaborationService();
  });

  it('should sync elements between users', () => {
    const elements: MockExcalidrawElement[] = [
      {
        id: 'test-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        versionNonce: 1,
      }
    ];

    const syncData = service.prepareSyncData(elements as any, {});
    expect(syncData.elements).toEqual(elements);
    expect(syncData.appState).toBeDefined();
    expect(syncData.type).toBe('sync');
    expect(syncData.userId).toBeDefined();
  });

  it('should handle remote updates', () => {
    const remoteElements: MockExcalidrawElement[] = [{ 
      id: 'remote-1', 
      type: 'ellipse',
      versionNonce: 2
    }];
    const localElements: MockExcalidrawElement[] = [{ 
      id: 'local-1', 
      type: 'rectangle',
      versionNonce: 1
    }];

    const merged = service.mergeElements(localElements as any, remoteElements as any);
    expect(merged).toHaveLength(2);
    expect(merged.find(e => e.id === 'remote-1')).toBeDefined();
    expect(merged.find(e => e.id === 'local-1')).toBeDefined();
  });

  it('should update collaborators', () => {
    const userId = 'test-user';
    service.updateCollaborator(userId, {
      pointer: { x: 100, y: 200 }
    });

    const collaborators = service.getCollaborators();
    expect(collaborators.has(userId)).toBe(true);
    expect(collaborators.get(userId)?.pointer).toEqual({ x: 100, y: 200 });
  });

  it('should generate unique user IDs', () => {
    const service1 = new CollaborationService();
    const service2 = new CollaborationService();
    
    expect(service1.getUserId()).not.toBe(service2.getUserId());
  });
});