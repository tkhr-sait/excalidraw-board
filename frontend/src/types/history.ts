import type { ExcalidrawElement, AppState } from './excalidraw';

export interface HistoryEntry {
  id: string;
  roomId: string;
  timestamp: number;
  username: string;
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  thumbnail?: string; // Base64 encoded preview image
  changeType?: 'add' | 'update' | 'delete' | 'bulk';
  elementCount: number;
}

export interface HistoryMetadata {
  roomId: string;
  roomName?: string;
  createdAt: number;
  lastUpdated: number;
  totalEntries: number;
}

export interface CollaborationHistory {
  entries: HistoryEntry[];
  metadata: HistoryMetadata;
}

export interface HistoryExportOptions {
  format: 'json' | 'excalidraw';
  startTime?: number;
  endTime?: number;
  includeMetadata?: boolean;
}

export interface HistoryPreferences {
  maxEntriesPerRoom: number;
  autoDeleteAfterDays: number;
  saveThumbnails: boolean;
  thumbnailSize: { width: number; height: number };
}