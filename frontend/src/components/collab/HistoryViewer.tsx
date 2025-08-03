import { useState, useEffect, useCallback, useMemo } from 'react';
import type { HistoryEntry, CollaborationHistory } from '../../types/history';
import { CollaborationHistoryService } from '../../services/collaboration-history';
import './HistoryViewer.css';

interface HistoryViewerProps {
  roomId: string;
  historyService: CollaborationHistoryService;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onExport: (entry: HistoryEntry) => void;
}

export function HistoryViewer({
  roomId,
  historyService,
  theme = 'light',
  onClose,
  onExport,
}: HistoryViewerProps) {
  const [history, setHistory] = useState<CollaborationHistory | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [previewEntry, setPreviewEntry] = useState<HistoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState<string>('all');

  // Load history on mount and when roomId changes
  useEffect(() => {
    if (roomId) {
      const loadedHistory = historyService.getHistory(roomId);
      setHistory(loadedHistory);
    }
  }, [roomId, historyService]);

  // Get unique users from history
  const uniqueUsers = useMemo(() => {
    if (!history) return [];
    const users = new Set(history.entries.map(entry => entry.username));
    return Array.from(users);
  }, [history]);

  // Filter entries based on search and user filter
  const filteredEntries = useMemo(() => {
    if (!history) return [];
    
    return history.entries.filter(entry => {
      // User filter
      if (filterUser !== 'all' && entry.username !== filterUser) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          entry.username.toLowerCase().includes(searchLower) ||
          entry.id.includes(searchLower) ||
          new Date(entry.timestamp).toLocaleString().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [history, filterUser, searchTerm]);

  // Format timestamp - show specific time
  const formatTimestamp = (timestamp: number) => {
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

  // Format relative time for quick reference
  const formatRelativeTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}時間前`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}日前`;
    
    return formatTimestamp(timestamp);
  };

  // Get change type label
  const getChangeTypeLabel = (changeType: HistoryEntry['changeType']) => {
    switch (changeType) {
      case 'add': return '追加';
      case 'update': return '更新';
      case 'delete': return '削除';
      case 'bulk': return '一括変更';
      default: return '変更';
    }
  };


  // Export single entry
  const handleExportEntry = useCallback((entry: HistoryEntry) => {
    onExport(entry);
  }, [onExport]);


  if (!history || history.entries.length === 0) {
    return (
      <div className="history-viewer" data-theme={theme}>
        <div className="history-header">
          <h2>変更履歴</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="history-empty">
          <p>このルームの履歴はまだありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-viewer" data-theme={theme}>
      <div className="history-header">
        <h2>変更履歴 - {history?.metadata.roomName || `ルーム: ${roomId}`}</h2>
        <div className="history-header-actions">
          <button className="close-button" onClick={onClose}>×</button>
        </div>
      </div>
      
      <div className="history-filters">
        <input
          type="text"
          placeholder="検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="history-search"
        />
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="history-user-filter"
        >
          <option value="all">すべてのユーザー</option>
          {uniqueUsers.map(user => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
      </div>
      
      <div className="history-stats">
        <span>合計: {history.metadata.totalEntries} エントリ</span>
        <span>作成: {new Date(history.metadata.createdAt).toLocaleDateString('ja-JP')}</span>
      </div>
      
      <div className="history-timeline">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className={`history-entry ${selectedEntry?.id === entry.id ? 'selected' : ''}`}
            onClick={() => setSelectedEntry(entry)}
            onMouseEnter={() => setPreviewEntry(entry)}
            onMouseLeave={() => setPreviewEntry(null)}
          >
            <div className="history-entry-header">
              <span className="history-entry-time">
                <span className="absolute-time">{formatTimestamp(entry.timestamp)}</span>
                <span className="relative-time">({formatRelativeTime(entry.timestamp)})</span>
              </span>
              <span className="history-entry-user">{entry.username}</span>
              <span className={`history-entry-type ${entry.changeType}`}>
                {getChangeTypeLabel(entry.changeType)}
              </span>
            </div>
            
            <div className="history-entry-details">
              <span className="history-entry-elements">
                {entry.elementCount} 要素
              </span>
              {entry.thumbnail && (
                <div className="history-entry-thumbnail">
                  <img src={entry.thumbnail} alt="Preview" />
                </div>
              )}
            </div>
            
            {selectedEntry?.id === entry.id && (
              <div className="history-entry-actions">
                <button
                  className="history-action-button export"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportEntry(entry);
                  }}
                >
                  エクスポート
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {previewEntry && previewEntry.thumbnail && (
        <div className="history-preview-tooltip">
          <img src={previewEntry.thumbnail} alt="Large preview" />
          <div className="history-preview-info">
            <p>{formatTimestamp(previewEntry.timestamp)}</p>
            <p>{previewEntry.username}</p>
            <p>{previewEntry.elementCount} 要素</p>
          </div>
        </div>
      )}
    </div>
  );
}