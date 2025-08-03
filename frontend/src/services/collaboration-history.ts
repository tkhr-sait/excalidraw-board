import { exportToCanvas, getCommonBounds } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, AppState, BinaryFiles } from '../types/excalidraw';
import type {
  HistoryEntry,
  CollaborationHistory,
  HistoryExportOptions,
  HistoryPreferences,
} from '../types/history';

const STORAGE_PREFIX = 'excalidraw-collab-history-';
const DEFAULT_PREFERENCES: HistoryPreferences = {
  maxEntriesPerRoom: 100,
  autoDeleteAfterDays: 14,
  saveThumbnails: true,
  thumbnailSize: { width: 200, height: 150 },
};

export class CollaborationHistoryService {
  private preferences: HistoryPreferences;
  private saveDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastSavedHashes: Map<string, string> = new Map();

  constructor(preferences: Partial<HistoryPreferences> = {}) {
    this.preferences = { ...DEFAULT_PREFERENCES, ...preferences };
    this.cleanupOldHistories();
  }

  /**
   * Save history entry with debounce (immediate save)
   */
  async saveHistoryEntry(
    roomId: string,
    username: string,
    elements: ExcalidrawElement[],
    appState: Partial<AppState>,
    files?: BinaryFiles,
    immediate = false,
    roomName?: string
  ): Promise<void> {
    if (!roomId) return;

    // Cancel existing debounce timer
    const existingTimer = this.saveDebounceTimers.get(roomId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const saveEntry = async () => {
      // Check if changed since last save
      if (!this.hasChangedSinceLastSave(roomId, elements)) {
        return;
      }

      await this.performHistorySave(roomId, username, elements, appState, files, roomName);
    };

    if (immediate) {
      await saveEntry();
    } else {
      // Debounce saves (1 second delay)
      const timer = setTimeout(saveEntry, 1000);
      this.saveDebounceTimers.set(roomId, timer);
    }
  }

  /**
   * Stop debounced history saving for a room
   */
  stopHistorySaving(roomId: string): void {
    const timer = this.saveDebounceTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.saveDebounceTimers.delete(roomId);
    }
    this.lastSavedHashes.delete(roomId);
  }

  /**
   * Perform the actual history save - create new entry for every change
   */
  private async performHistorySave(
    roomId: string,
    username: string,
    elements: ExcalidrawElement[],
    appState: Partial<AppState>,
    files?: BinaryFiles,
    roomName?: string
  ): Promise<void> {
    if (!roomId) return;

    const history = this.getHistory(roomId);
    const now = Date.now();
    
    // Always create new entry - no grouping/aggregation
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      timestamp: now,
      username,
      elements: this.cloneElements(elements),
      appState: this.cloneAppState(appState),
      elementCount: elements.filter(el => !el.isDeleted).length,
      changeType: this.detectChangeType(history.entries[0]?.elements, elements),
    };

    // Generate thumbnail if enabled
    if (this.preferences.saveThumbnails) {
      try {
        entry.thumbnail = await this.generateThumbnail(elements, appState, files);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
      }
    }

    // Add entry to the beginning
    history.entries.unshift(entry);
    
    console.log('Created new history entry:', {
      entryId: entry.id,
      elementCount: entry.elementCount,
      changeType: entry.changeType
    });
    
    // Maintain max entries limit
    if (history.entries.length > this.preferences.maxEntriesPerRoom) {
      history.entries = history.entries.slice(0, this.preferences.maxEntriesPerRoom);
    }

    // Update metadata
    history.metadata.lastUpdated = Date.now();
    history.metadata.totalEntries = history.entries.length;
    
    // Update room name if provided
    if (roomName) {
      history.metadata.roomName = roomName;
    }

    // Save to localStorage
    this.saveHistory(roomId, history);
    
    // Update last saved hash
    this.lastSavedHashes.set(roomId, this.generateElementsHash(elements));
  }

  /**
   * Get history for a specific room
   */
  getHistory(roomId: string): CollaborationHistory {
    const key = `${STORAGE_PREFIX}${roomId}`;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }

    // Return empty history
    return {
      entries: [],
      metadata: {
        roomId,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        totalEntries: 0,
      },
    };
  }

  /**
   * Get all room histories
   */
  getAllHistories(): { roomId: string; history: CollaborationHistory }[] {
    const histories: { roomId: string; history: CollaborationHistory }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const roomId = key.substring(STORAGE_PREFIX.length);
        const history = this.getHistory(roomId);
        if (history.entries.length > 0) {
          histories.push({ roomId, history });
        }
      }
    }

    return histories;
  }

  /**
   * Delete history for a specific room
   */
  deleteHistory(roomId: string): void {
    const key = `${STORAGE_PREFIX}${roomId}`;
    localStorage.removeItem(key);
  }

  /**
   * Export history based on options
   */
  async exportHistory(
    roomId: string,
    options: HistoryExportOptions
  ): Promise<string | Blob> {
    const history = this.getHistory(roomId);
    
    let entriesToExport = history.entries;

    // Filter by time range if specified
    if (options.startTime || options.endTime) {
      entriesToExport = entriesToExport.filter(entry => {
        if (options.startTime && entry.timestamp < options.startTime) return false;
        if (options.endTime && entry.timestamp > options.endTime) return false;
        return true;
      });
    }

    if (options.format === 'json') {
      const exportData = {
        type: 'excalidraw-collaboration-history',
        version: 1,
        roomId,
        exportedAt: Date.now(),
        entries: entriesToExport,
        ...(options.includeMetadata && { metadata: history.metadata }),
      };
      return JSON.stringify(exportData, null, 2);
    } else if (options.format === 'excalidraw' && entriesToExport.length > 0) {
      // Export the most recent entry as .excalidraw file
      const entry = entriesToExport[0];
      const sceneData = {
        type: 'excalidraw',
        version: 2,
        source: window.location.origin,
        elements: entry.elements,
        appState: entry.appState,
      };
      return JSON.stringify(sceneData, null, 2);
    }

    throw new Error('Invalid export options');
  }

  /**
   * Import history from exported data
   */
  importHistory(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      if (data.type !== 'excalidraw-collaboration-history') {
        throw new Error('Invalid history file format');
      }

      const roomId = data.roomId;
      const existingHistory = this.getHistory(roomId);
      
      // Merge entries, avoiding duplicates
      const existingIds = new Set(existingHistory.entries.map(e => e.id));
      const newEntries = data.entries.filter((e: HistoryEntry) => !existingIds.has(e.id));
      
      existingHistory.entries.push(...newEntries);
      existingHistory.entries.sort((a, b) => b.timestamp - a.timestamp);
      
      // Limit to max entries
      if (existingHistory.entries.length > this.preferences.maxEntriesPerRoom) {
        existingHistory.entries = existingHistory.entries.slice(0, this.preferences.maxEntriesPerRoom);
      }

      existingHistory.metadata.lastUpdated = Date.now();
      existingHistory.metadata.totalEntries = existingHistory.entries.length;

      this.saveHistory(roomId, existingHistory);
    } catch (error) {
      console.error('Failed to import history:', error);
      throw new Error('Failed to import history: Invalid file format');
    }
  }

  /**
   * Clean up old histories based on preferences (14 days)
   */
  private cleanupOldHistories(): void {
    const cutoffTime = Date.now() - (this.preferences.autoDeleteAfterDays * 24 * 60 * 60 * 1000);
    
    this.getAllHistories().forEach(({ roomId, history }) => {
      // Remove old entries
      const originalLength = history.entries.length;
      history.entries = history.entries.filter(entry => entry.timestamp > cutoffTime);
      
      if (history.entries.length === 0) {
        // Delete empty history
        this.deleteHistory(roomId);
        console.log(`Deleted empty history for room: ${roomId}`);
      } else if (history.entries.length < originalLength) {
        // Save updated history if entries were removed
        history.metadata.totalEntries = history.entries.length;
        this.saveHistory(roomId, history);
        console.log(`Cleaned up ${originalLength - history.entries.length} old entries for room: ${roomId}`);
      }
    });
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(roomId: string, history: CollaborationHistory): void {
    const key = `${STORAGE_PREFIX}${roomId}`;
    try {
      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Remove oldest entries and try again
        history.entries = history.entries.slice(0, Math.floor(history.entries.length / 2));
        try {
          localStorage.setItem(key, JSON.stringify(history));
        } catch (retryError) {
          console.error('Failed to save history after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Generate thumbnail for history entry - captures full canvas viewport
   */
  private async generateThumbnail(
    elements: ExcalidrawElement[],
    appState: Partial<AppState>,
    files?: BinaryFiles
  ): Promise<string | undefined> {
    try {
      const thumbnailWidth = 200;
      const thumbnailHeight = 150;

      // If no elements, return empty canvas
      if (elements.length === 0) {
        const canvas = await exportToCanvas({
          elements,
          appState: {
            ...appState,
            exportBackground: true,
            viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
            exportWithDarkMode: (appState as any).theme === 'dark',
          },
          files: files || {},
          getDimensions: () => ({
            width: thumbnailWidth,
            height: thumbnailHeight,
            scale: 0.2,
          }),
        });
        return canvas.toDataURL('image/png', 0.3);
      }

      // Get bounds of all objects to ensure they all fit in thumbnail
      const bounds = getCommonBounds(elements as any);
      const contentWidth = bounds[2] - bounds[0];
      const contentHeight = bounds[3] - bounds[1];
      
      // Add padding around content
      const padding = 20;
      const totalWidth = contentWidth + (padding * 2);
      const totalHeight = contentHeight + (padding * 2);
      
      // Calculate scale to fit content in thumbnail dimensions
      const scaleX = thumbnailWidth / totalWidth;
      const scaleY = thumbnailHeight / totalHeight;
      const scale = Math.min(scaleX, scaleY, 1) * 0.8; // Max scale 0.8 for better fit

      const canvas = await exportToCanvas({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
          exportWithDarkMode: (appState as any).theme === 'dark',
          // Don't override scroll/zoom - let exportToCanvas handle bounds automatically
        },
        files: files || {},
        getDimensions: () => ({
          width: thumbnailWidth,
          height: thumbnailHeight,
          scale: scale, // Dynamic scale to fit all objects
        }),
      });

      return canvas.toDataURL('image/png', 0.3); // Low quality for performance
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return undefined;
    }
  }

  /**
   * Detect the type of change between two element sets
   */
  private detectChangeType(
    oldElements: ExcalidrawElement[] | undefined,
    newElements: ExcalidrawElement[]
  ): HistoryEntry['changeType'] {
    if (!oldElements || oldElements.length === 0) {
      return 'add';
    }

    const oldIds = new Set(oldElements.map(el => el.id));
    const newIds = new Set(newElements.map(el => el.id));

    const added = [...newIds].filter(id => !oldIds.has(id));
    const deleted = [...oldIds].filter(id => !newIds.has(id));

    if (added.length > 0 && deleted.length === 0) {
      return 'add';
    } else if (deleted.length > 0 && added.length === 0) {
      return 'delete';
    } else if (added.length > 0 || deleted.length > 0) {
      return 'bulk';
    }

    return 'update';
  }

  /**
   * Clone elements to avoid reference issues
   */
  private cloneElements(elements: ExcalidrawElement[]): ExcalidrawElement[] {
    return JSON.parse(JSON.stringify(elements));
  }

  /**
   * Clone app state to avoid reference issues
   */
  private cloneAppState(appState: Partial<AppState>): Partial<AppState> {
    return JSON.parse(JSON.stringify(appState));
  }

  /**
   * Check if elements have changed since last save
   */
  private hasChangedSinceLastSave(roomId: string, elements: ExcalidrawElement[]): boolean {
    const currentHash = this.generateElementsHash(elements);
    const lastHash = this.lastSavedHashes.get(roomId);
    return currentHash !== lastHash;
  }

  /**
   * Generate hash for elements to detect changes
   */
  private generateElementsHash(elements: ExcalidrawElement[]): string {
    const hashData = elements
      .filter(el => !el.isDeleted)
      .map(el => `${el.id}:${el.version || 0}:${el.updated || 0}`)
      .sort()
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get all room IDs that have history
   */
  getAllRoomIds(): string[] {
    const roomIds: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const roomId = key.substring(STORAGE_PREFIX.length);
        roomIds.push(roomId);
      }
    }
    
    return roomIds.sort();
  }

  /**
   * Get room history summary (for UI display)
   */
  getRoomHistorySummary(roomId: string): {
    roomId: string;
    roomName?: string;
    entryCount: number;
    lastUpdated: number;
    oldestEntry: number;
  } | null {
    const history = this.getHistory(roomId);
    if (history.entries.length === 0) return null;

    return {
      roomId,
      roomName: history.metadata.roomName,
      entryCount: history.entries.length,
      lastUpdated: history.metadata.lastUpdated,
      oldestEntry: history.entries[history.entries.length - 1].timestamp,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Clear all debounce timers
    this.saveDebounceTimers.forEach(timer => clearTimeout(timer));
    this.saveDebounceTimers.clear();
    this.lastSavedHashes.clear();
  }
}