/**
 * Test suite for collaboration element synchronization
 * Tests the improved handleChange communication method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollaborationService } from '../services/collaboration';

describe('Collaboration Synchronization', () => {
  let collaborationService: CollaborationService;

  beforeEach(() => {
    collaborationService = new CollaborationService();
  });

  it('should filter syncable elements correctly', () => {
    const mockElements = [
      {
        id: 'element1',
        type: 'rectangle',
        width: 100,
        height: 100,
        isDeleted: false,
        version: 1,
        versionNonce: 1001
      },
      {
        id: 'element2',
        type: 'ellipse',
        width: 0.5,
        height: 0.5,
        isDeleted: false,
        version: 1,
        versionNonce: 1002
      },
      {
        id: 'element3',
        type: 'arrow',
        width: 200,
        height: 50,
        isDeleted: true,
        version: 1,
        versionNonce: 1003
      }
    ];

    const syncable = collaborationService.getSyncableElements(mockElements);
    
    // Should include normal element and deleted element
    // Should exclude invisibly small element
    expect(syncable).toHaveLength(2);
    expect(syncable.find(e => e.id === 'element1')).toBeDefined();
    expect(syncable.find(e => e.id === 'element3')).toBeDefined();
    expect(syncable.find(e => e.id === 'element2')).toBeUndefined();
  });

  it('should merge elements using version conflict resolution', () => {
    const localElements = [
      {
        id: 'element1',
        type: 'rectangle',
        version: 1,
        versionNonce: 1001,
        isDeleted: false
      },
      {
        id: 'element2',
        type: 'ellipse',
        version: 2,
        versionNonce: 2001,
        isDeleted: false
      }
    ];

    const remoteElements = [
      {
        id: 'element1',
        type: 'rectangle',
        version: 2,
        versionNonce: 1002,
        isDeleted: false
      },
      {
        id: 'element3',
        type: 'arrow',
        version: 1,
        versionNonce: 3001,
        isDeleted: false
      }
    ];

    const merged = collaborationService.mergeElements(localElements, remoteElements);
    
    expect(merged).toHaveLength(3);
    
    // element1 should use remote version (higher version)
    const element1 = merged.find(e => e.id === 'element1');
    expect(element1?.versionNonce).toBe(1002);
    
    // element2 should remain local (no remote version)
    const element2 = merged.find(e => e.id === 'element2');
    expect(element2?.versionNonce).toBe(2001);
    
    // element3 should be added from remote
    const element3 = merged.find(e => e.id === 'element3');
    expect(element3).toBeDefined();
  });

  it('should prepare scene update with proper structure', () => {
    const mockElements = [
      {
        id: 'element1',
        type: 'rectangle',
        width: 100,
        height: 100,
        isDeleted: false,
        version: 1,
        versionNonce: 1001
      }
    ];

    const mockAppState = {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#000000'
    };

    const sceneUpdate = collaborationService.prepareSceneUpdate(mockElements, mockAppState);
    
    expect(sceneUpdate.type).toBe('scene-update');
    expect(sceneUpdate.elements).toHaveLength(1);
    expect(sceneUpdate.appState).toBeDefined();
    expect(sceneUpdate.userId).toBeDefined();
    expect(sceneUpdate.timestamp).toBeDefined();
  });

  it('should handle version nonce comparison correctly', () => {
    const localElements = [
      {
        id: 'element1',
        type: 'rectangle',
        version: 1,
        versionNonce: 1002,
        isDeleted: false
      }
    ];

    const remoteElements = [
      {
        id: 'element1',
        type: 'rectangle',
        version: 1,
        versionNonce: 1001,
        isDeleted: false
      }
    ];

    const merged = collaborationService.mergeElements(localElements, remoteElements);
    
    // Should keep local element (higher versionNonce with same version)
    expect(merged[0].versionNonce).toBe(1002);
  });

  it('should filter out old deleted elements', () => {
    const oldTimestamp = Date.now() - 10000; // 10 seconds ago
    const recentTimestamp = Date.now() - 1000; // 1 second ago

    const localElements = [
      {
        id: 'element1',
        type: 'rectangle',
        isDeleted: true,
        updated: oldTimestamp,
        version: 1,
        versionNonce: 1001
      },
      {
        id: 'element2',
        type: 'ellipse',
        isDeleted: true,
        updated: recentTimestamp,
        version: 1,
        versionNonce: 1002
      },
      {
        id: 'element3',
        type: 'arrow',
        isDeleted: false,
        version: 1,
        versionNonce: 1003
      }
    ];

    const merged = collaborationService.mergeElements(localElements, []);
    
    // Should keep non-deleted and recently deleted elements
    expect(merged).toHaveLength(2);
    expect(merged.find(e => e.id === 'element1')).toBeUndefined(); // Old deleted
    expect(merged.find(e => e.id === 'element2')).toBeDefined(); // Recent deleted
    expect(merged.find(e => e.id === 'element3')).toBeDefined(); // Not deleted
  });
});