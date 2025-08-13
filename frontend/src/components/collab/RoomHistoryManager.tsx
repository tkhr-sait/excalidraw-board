import { useState, useEffect, useCallback } from 'react';
import { CollaborationHistoryService } from '../../services/collaboration-history';
import { HistoryViewer } from './HistoryViewer';
import { HistoryExportDialog } from './HistoryExportDialog';
import type { HistoryEntry } from '../../types/history';
import './RoomHistoryManager.css';

interface RoomHistoryManagerProps {
  historyService: CollaborationHistoryService;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onRestore?: (entry: HistoryEntry) => void;
}

interface RoomSummary {
  roomId: string;
  roomName?: string;
  entryCount: number;
  lastUpdated: number;
  oldestEntry: number;
}

export function RoomHistoryManager({
  historyService,
  theme = 'light',
  onClose,
  onRestore,
}: RoomHistoryManagerProps) {
  const [roomSummaries, setRoomSummaries] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  const [historyExportEntry, setHistoryExportEntry] = useState<HistoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load room summaries
  useEffect(() => {
    const loadRoomSummaries = () => {
      const roomIds = historyService.getAllRoomIds();
      const summaries = roomIds
        .map(roomId => historyService.getRoomHistorySummary(roomId))
        .filter((summary): summary is RoomSummary => summary !== null)
        .sort((a, b) => b.lastUpdated - a.lastUpdated); // Sort by most recent
      
      setRoomSummaries(summaries);
    };

    loadRoomSummaries();
  }, [historyService]);

  // Format absolute timestamp
  const formatAbsoluteTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Format relative timestamp for secondary display
  const formatRelativeTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP');
  };

  // Calculate days since oldest entry
  const getDaysSinceOldest = (oldestTimestamp: number) => {
    const diffMs = Date.now() - oldestTimestamp;
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  };

  // Filter rooms based on search (search by room name or room ID)
  const filteredRooms = roomSummaries.filter(room => {
    const searchLower = searchTerm.toLowerCase();
    return (
      room.roomId.toLowerCase().includes(searchLower) ||
      (room.roomName && room.roomName.toLowerCase().includes(searchLower))
    );
  });

  // Handle room selection
  const handleRoomSelect = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
    setShowHistoryViewer(true);
  }, []);

  // Handle export from history viewer
  const handleExport = useCallback((entry: HistoryEntry) => {
    setHistoryExportEntry(entry);
    setShowHistoryViewer(false);
  }, []);

  return (
    <>
      <div className="room-history-manager" data-theme={theme}>
        <div className="room-history-header">
          <h2>ルーム履歴管理</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="room-history-search">
          <input
            type="text"
            placeholder="ルーム名またはIDで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="room-search-input"
          />
        </div>
        
        <div className="room-history-stats">
          <span>合計ルーム数: {roomSummaries.length}</span>
          <span>履歴総数: {roomSummaries.reduce((sum, room) => sum + room.entryCount, 0)}</span>
        </div>
        
        {filteredRooms.length === 0 ? (
          <div className="room-history-empty">
            {searchTerm ? (
              <p>「{searchTerm}」に一致するルームが見つかりません</p>
            ) : (
              <p>まだ履歴があるルームはありません</p>
            )}
          </div>
        ) : (
          <div className="room-history-list">
            {filteredRooms.map((room) => (
              <div
                key={room.roomId}
                className="room-history-item"
                onClick={() => handleRoomSelect(room.roomId)}
              >
                <div className="room-history-item-header">
                  <span className="room-name">
                    🚪 {room.roomName || `ルーム: ${room.roomId}`}
                  </span>
                  <span className="room-last-updated">
                    <span className="absolute-time">{formatAbsoluteTimestamp(room.lastUpdated)}</span>
                    <span className="relative-time">({formatRelativeTimestamp(room.lastUpdated)})</span>
                  </span>
                </div>
                
                <div className="room-history-item-details">
                  <span className="room-entry-count">
                    📜 {room.entryCount} エントリ
                  </span>
                  <span className="room-age">
                    📅 {getDaysSinceOldest(room.oldestEntry)}日間の履歴
                  </span>
                </div>
                
                <div className="room-history-item-preview">
                  {room.roomName && (
                    <span className="room-id-small">ID: {room.roomId}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="room-history-footer">
          <p className="room-history-note">
            💡 14日以上経過した履歴は自動的に削除されます
          </p>
        </div>
      </div>

      {/* History Viewer */}
      {showHistoryViewer && selectedRoomId && (
        <HistoryViewer
          roomId={selectedRoomId}
          historyService={historyService}
          theme={theme}
          onClose={() => {
            setShowHistoryViewer(false);
            setSelectedRoomId(null);
          }}
          onExport={handleExport}
          onRestore={onRestore}
        />
      )}

      {/* History Export Dialog */}
      {historyExportEntry && selectedRoomId && (
        <HistoryExportDialog
          roomId={selectedRoomId}
          historyService={historyService}
          entry={historyExportEntry}
          theme={theme}
          onClose={() => setHistoryExportEntry(null)}
        />
      )}
    </>
  );
}