import { useState, useCallback } from 'react';
import type { HistoryEntry, HistoryExportOptions } from '../../types/history';
import { CollaborationHistoryService } from '../../services/collaboration-history';
import './HistoryExportDialog.css';

interface HistoryExportDialogProps {
  roomId: string;
  historyService: CollaborationHistoryService;
  entry?: HistoryEntry; // If provided, export single entry
  theme?: 'light' | 'dark';
  onClose: () => void;
}

export function HistoryExportDialog({
  roomId,
  historyService,
  entry,
  theme = 'light',
  onClose,
}: HistoryExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'excalidraw'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Calculate date range
  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: number | undefined;
    let end: number | undefined;

    switch (dateRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        end = now.getTime();
        break;
      case 'week':
        start = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        end = now.getTime();
        break;
      case 'custom':
        if (startDate) start = new Date(startDate).getTime();
        if (endDate) end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;
        break;
    }

    return { start, end };
  }, [dateRange, startDate, endDate]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      if (entry) {
        // Export single entry
        const sceneData = {
          type: 'excalidraw',
          version: 2,
          source: window.location.origin,
          elements: entry.elements,
          appState: entry.appState,
          exportedAt: Date.now(),
          historyMetadata: {
            roomId,
            username: entry.username,
            timestamp: entry.timestamp,
          },
        };

        const blob = new Blob([JSON.stringify(sceneData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `excalidraw-history-${roomId}-${entry.id}.excalidraw`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Export history based on options
        const { start, end } = getDateRange();
        const options: HistoryExportOptions = {
          format: exportFormat,
          startTime: start,
          endTime: end,
          includeMetadata,
        };

        const result = await historyService.exportHistory(roomId, options);
        
        const blob = new Blob([result as string], {
          type: exportFormat === 'json' ? 'application/json' : 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const dateStr = new Date().toISOString().split('T')[0];
        const extension = exportFormat === 'excalidraw' ? 'excalidraw' : 'json';
        a.download = `excalidraw-history-${roomId}-${dateStr}.${extension}`;
        
        a.click();
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  }, [entry, roomId, historyService, exportFormat, includeMetadata, getDateRange, onClose]);

  // Handle import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        historyService.importHistory(text);
        alert('履歴をインポートしました');
        onClose();
      } catch (error) {
        console.error('Import failed:', error);
        alert('インポートに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    input.click();
  }, [historyService, onClose]);

  return (
    <div className="history-export-dialog-overlay" onClick={onClose}>
      <div className="history-export-dialog" data-theme={theme} onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog-header">
          <h3>{entry ? 'スナップショットをエクスポート' : '履歴をエクスポート'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {!entry && (
          <>
            <div className="export-dialog-section">
              <label>エクスポート形式</label>
              <div className="export-format-options">
                <label>
                  <input
                    type="radio"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value as 'json')}
                  />
                  <span>履歴全体 (JSON)</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="excalidraw"
                    checked={exportFormat === 'excalidraw'}
                    onChange={(e) => setExportFormat(e.target.value as 'excalidraw')}
                  />
                  <span>最新のスナップショット (.excalidraw)</span>
                </label>
              </div>
            </div>

            {exportFormat === 'json' && (
              <>
                <div className="export-dialog-section">
                  <label>期間</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="export-date-range"
                  >
                    <option value="all">すべて</option>
                    <option value="today">今日</option>
                    <option value="week">過去7日間</option>
                    <option value="custom">カスタム</option>
                  </select>
                </div>

                {dateRange === 'custom' && (
                  <div className="export-dialog-section">
                    <div className="date-inputs">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="開始日"
                      />
                      <span>〜</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="終了日"
                      />
                    </div>
                  </div>
                )}

                <div className="export-dialog-section">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                    />
                    <span>メタデータを含める</span>
                  </label>
                </div>
              </>
            )}
          </>
        )}

        <div className="export-dialog-actions">
          <button
            className="export-button primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </button>
          {!entry && (
            <button
              className="export-button secondary"
              onClick={handleImport}
            >
              インポート
            </button>
          )}
          <button
            className="export-button cancel"
            onClick={onClose}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}