# Task 07: ユニットテストの実装

## 概要
これまでにTDDで作成したテストコードを完全な状態にし、新たに必要なユニットテストを追加する。コードカバレッジを高め、品質を保証する。

## 目的
- 全コンポーネントのユニットテスト完成
- サービスクラスのテスト完成
- ユーティリティ関数のテスト完成
- コードカバレッジ80%以上の達成

## 前提条件
- Task 01-06が完了していること
- Vitestが設定されていること

## 作業内容

### 1. テスト設定の強化
`frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`frontend/tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Socket.IOのモック
global.WebSocket = vi.fn() as any;

// localStorageのモック
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// canvasのモック
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  clip: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  rect: vi.fn(),
}));

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,');
HTMLCanvasElement.prototype.getContext = vi.fn();
HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
}));
```

### 2. ストレージユーティリティのテスト
`frontend/tests/unit/utils/storage.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
} from '../../../src/utils/storage';
import type { SceneData } from '../../../src/types/excalidraw';

describe('Storage Utils', () => {
  const mockSceneData: SceneData = {
    elements: [
      {
        id: 'test-element',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      } as any,
    ],
    appState: {
      viewBackgroundColor: '#ffffff',
    },
    files: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveToLocalStorage', () => {
    it('should save scene data to localStorage', () => {
      saveToLocalStorage(mockSceneData);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'excalidraw-board-scene',
        JSON.stringify(mockSceneData)
      );
    });

    it('should handle JSON.stringify errors', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const circularData = {} as any;
      circularData.self = circularData;
      
      saveToLocalStorage(circularData);
      
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save to localStorage:',
        expect.any(Error)
      );
      
      consoleError.mockRestore();
    });
  });

  describe('loadFromLocalStorage', () => {
    it('should load scene data from localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify(mockSceneData)
      );
      
      const result = loadFromLocalStorage();
      
      expect(result).toEqual(mockSceneData);
    });

    it('should return null if no data exists', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      
      const result = loadFromLocalStorage();
      
      expect(result).toBeNull();
    });

    it('should handle JSON.parse errors', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json');
      
      const result = loadFromLocalStorage();
      
      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load from localStorage:',
        expect.any(Error)
      );
      
      consoleError.mockRestore();
    });
  });

  describe('clearLocalStorage', () => {
    it('should remove scene data from localStorage', () => {
      clearLocalStorage();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'excalidraw-board-scene'
      );
    });
  });
});
```

### 3. useSocketフックのテスト
`frontend/tests/unit/hooks/useSocket.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../../../src/hooks/useSocket';
import { socketService } from '../../../src/services/socket';

// SocketServiceのモック
vi.mock('../../../src/services/socket');

describe('useSocket', () => {
  const mockSocketService = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(socketService).connect = mockSocketService.connect;
    vi.mocked(socketService).disconnect = mockSocketService.disconnect;
    vi.mocked(socketService).isConnected = mockSocketService.isConnected;
    vi.mocked(socketService).emit = mockSocketService.emit;
    vi.mocked(socketService).on = mockSocketService.on;
    vi.mocked(socketService).off = mockSocketService.off;
    vi.mocked(socketService).joinRoom = mockSocketService.joinRoom;
    vi.mocked(socketService).leaveRoom = mockSocketService.leaveRoom;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should connect automatically by default', () => {
    renderHook(() => useSocket());
    
    expect(mockSocketService.connect).toHaveBeenCalledWith(
      'http://localhost:3002'
    );
  });

  it('should not connect automatically when autoConnect is false', () => {
    renderHook(() => useSocket({ autoConnect: false }));
    
    expect(mockSocketService.connect).not.toHaveBeenCalled();
  });

  it('should use custom URL when provided', () => {
    const customUrl = 'http://custom-server:3000';
    renderHook(() => useSocket({ url: customUrl }));
    
    expect(mockSocketService.connect).toHaveBeenCalledWith(customUrl);
  });

  it('should provide socket methods', () => {
    const { result } = renderHook(() => useSocket());
    
    expect(result.current).toHaveProperty('emit');
    expect(result.current).toHaveProperty('on');
    expect(result.current).toHaveProperty('off');
    expect(result.current).toHaveProperty('connect');
    expect(result.current).toHaveProperty('disconnect');
    expect(result.current).toHaveProperty('joinRoom');
    expect(result.current).toHaveProperty('leaveRoom');
    expect(result.current).toHaveProperty('isConnected');
  });

  it('should emit events through socketService', () => {
    const { result } = renderHook(() => useSocket());
    
    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });
    
    expect(mockSocketService.emit).toHaveBeenCalledWith('test-event', {
      data: 'test',
    });
  });

  it('should register event listeners', () => {
    const { result } = renderHook(() => useSocket());
    const callback = vi.fn();
    
    act(() => {
      result.current.on('test-event', callback);
    });
    
    expect(mockSocketService.on).toHaveBeenCalledWith('test-event', callback);
  });

  it('should cleanup listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useSocket());
    const callback = vi.fn();
    
    act(() => {
      result.current.on('test-event', callback);
    });
    
    unmount();
    
    expect(mockSocketService.off).toHaveBeenCalledWith('test-event', callback);
  });
});
```

### 4. スロットルユーティリティのテスト
`frontend/tests/unit/utils/throttle.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../../../src/utils/throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call function immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('arg1', 'arg2');
    
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throttle subsequent calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    throttled('call2');
    throttled('call3');
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('call1');
  });

  it('should call function with latest arguments after delay', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    throttled('call2');
    throttled('call3');
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, 'call3');
  });

  it('should allow function to be called again after delay', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    vi.advanceTimersByTime(100);
    throttled('call2');
    
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'call1');
    expect(fn).toHaveBeenNthCalledWith(2, 'call2');
  });

  it('should cancel pending calls when cancel is called', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    throttled('call2');
    throttled.cancel();
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('call1');
  });
});
```

### 5. コラボレーションコンポーネントのテスト拡張
`frontend/tests/unit/components/collab/CollabToolbar.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollabToolbar } from '../../../../src/components/collab/CollabToolbar';

describe('CollabToolbar', () => {
  const defaultProps = {
    isConnected: true,
    isInRoom: false,
    roomId: null,
    onJoinRoom: vi.fn(),
    onLeaveRoom: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render connection status', () => {
    render(<CollabToolbar {...defaultProps} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show disconnected status', () => {
    render(<CollabToolbar {...defaultProps} isConnected={false} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should render join room button when not in room', () => {
    render(<CollabToolbar {...defaultProps} />);
    
    const joinButton = screen.getByRole('button', { name: /join room/i });
    expect(joinButton).toBeInTheDocument();
    expect(joinButton).not.toBeDisabled();
  });

  it('should disable join button when disconnected', () => {
    render(<CollabToolbar {...defaultProps} isConnected={false} />);
    
    const joinButton = screen.getByRole('button', { name: /join room/i });
    expect(joinButton).toBeDisabled();
  });

  it('should call onJoinRoom when join button clicked', () => {
    render(<CollabToolbar {...defaultProps} />);
    
    const joinButton = screen.getByRole('button', { name: /join room/i });
    fireEvent.click(joinButton);
    
    expect(defaultProps.onJoinRoom).toHaveBeenCalledTimes(1);
  });

  it('should render room info when in room', () => {
    render(
      <CollabToolbar
        {...defaultProps}
        isInRoom={true}
        roomId="test-room-123"
      />
    );
    
    expect(screen.getByText('Room:')).toBeInTheDocument();
    expect(screen.getByText('test-room-123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave room/i })).toBeInTheDocument();
  });

  it('should call onLeaveRoom when leave button clicked', () => {
    render(
      <CollabToolbar
        {...defaultProps}
        isInRoom={true}
        roomId="test-room-123"
      />
    );
    
    const leaveButton = screen.getByRole('button', { name: /leave room/i });
    fireEvent.click(leaveButton);
    
    expect(defaultProps.onLeaveRoom).toHaveBeenCalledTimes(1);
  });
});
```

### 6. テストスクリプトの更新
`package.json`に追加:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### 7. GitHub Actions用テスト設定
`.github/workflows/test.yml`:
```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: latest
    
    - name: Install dependencies
      run: |
        cd frontend
        pnpm install --frozen-lockfile
    
    - name: Run linter
      run: |
        cd frontend
        pnpm lint
    
    - name: Run type check
      run: |
        cd frontend
        pnpm tsc --noEmit
    
    - name: Run unit tests
      run: |
        cd frontend
        pnpm test:run
    
    - name: Run tests with coverage
      run: |
        cd frontend
        pnpm test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info
        flags: frontend
        name: frontend-coverage
```

## テスト要件

### カバレッジ目標
- [ ] ライン80%以上
- [ ] 関数カバレッジ80%以上
- [ ] ブランチカバレッジ80%以上
- [ ] ステートメントカバレッジ80%以上

### テスト品質
- [ ] 全テストがパスする
- [ ] エッジケースのテストが含まれる
- [ ] エラーハンドリングのテストが含まれる
- [ ] 非同期処理のテストが含まれる

## 成果物
1. 完全なユニットテストスイート
2. テスト設定ファイル
3. カバレッジレポート
4. CI/CD設定
5. テスト用スクリプト

## 注意事項
- テストの可読性と保守性を重視
- モックの使用は必要最小限に
- パフォーマンステストも考慮
- フレイキーテストを避ける

## 次のタスク
Task 08: E2Eテストの実装（Playwright）