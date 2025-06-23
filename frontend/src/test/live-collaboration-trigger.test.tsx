/**
 * Test suite for LiveCollaborationTrigger integration
 * Tests the integration of the official Excalidraw LiveCollaborationTrigger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollaborativeExcalidrawBoard } from '../components/CollaborativeExcalidrawBoard';

// Mock the Excalidraw module to avoid rendering issues in tests
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: ({ renderTopRightUI, children }: any) => (
    <div data-testid="excalidraw-mock">
      <div data-testid="excalidraw-content">{children}</div>
      {renderTopRightUI && (
        <div data-testid="top-right-ui">
          {renderTopRightUI()}
        </div>
      )}
    </div>
  ),
  MainMenu: Object.assign(
    ({ children }: any) => (
      <div data-testid="main-menu">{children}</div>
    ),
    {
      DefaultItems: {
        LoadScene: () => <div data-testid="load-scene">Load Scene</div>,
        SaveToActiveFile: () => <div data-testid="save-to-active-file">Save to Active File</div>,
        SaveAsImage: () => <div data-testid="save-as-image">Save as Image</div>,
        Export: () => <div data-testid="export">Export</div>,
        Help: () => <div data-testid="help">Help</div>,
        ClearCanvas: () => <div data-testid="clear-canvas">Clear Canvas</div>,
        ToggleTheme: () => <div data-testid="toggle-theme">Toggle Theme</div>,
      },
      Separator: () => <div data-testid="separator">|</div>,
    }
  ),
  Footer: ({ children }: any) => (
    <div data-testid="footer">{children}</div>
  ),
  LiveCollaborationTrigger: ({ isCollaborating, onSelect }: any) => (
    <button
      data-testid="live-collaboration-trigger"
      onClick={onSelect}
      style={{
        backgroundColor: isCollaborating ? '#dc3545' : '#28a745',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {isCollaborating ? 'Stop Collaboration' : 'Start Collaboration'}
    </button>
  ),
  type: {
    ExcalidrawImperativeAPI: {} as any
  }
}));

// Mock the hooks
vi.mock('../hooks/useCollaboration', () => ({
  useCollaboration: vi.fn(() => ({
    isCollaborating: false,
    isConnected: false,
    roomId: 'test-room',
    userName: 'test-user',
    connectionCount: 1,
    startCollaboration: vi.fn(),
    stopCollaboration: vi.fn(),
    updateRoomId: vi.fn(),
    updateUserName: vi.fn(),
    generateNewUserName: vi.fn(),
    generateNewRoomName: vi.fn(),
    syncElements: vi.fn(),
    syncCursor: vi.fn(),
  }))
}));

describe('LiveCollaborationTrigger Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the LiveCollaborationTrigger in the top right UI', () => {
    render(<CollaborativeExcalidrawBoard />);
    
    // Check that the Excalidraw component is rendered
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
    
    // Check that the top right UI is rendered
    expect(screen.getByTestId('top-right-ui')).toBeInTheDocument();
    
    // Check that the LiveCollaborationTrigger is rendered
    expect(screen.getByTestId('live-collaboration-trigger')).toBeInTheDocument();
  });

  it('should display start collaboration button when not collaborating', () => {
    render(<CollaborativeExcalidrawBoard />);
    
    const trigger = screen.getByTestId('live-collaboration-trigger');
    expect(trigger).toHaveTextContent('Start Collaboration');
    expect(trigger).toHaveStyle({ backgroundColor: '#28a745' });
  });

  it('should call start collaboration when trigger is clicked', async () => {
    const mockStartCollaboration = vi.fn();
    
    // Mock the hook to return our mock function
    const { useCollaboration } = await import('../hooks/useCollaboration');
    vi.mocked(useCollaboration).mockReturnValue({
      isCollaborating: false,
      isConnected: false,
      roomId: 'test-room',
      userName: 'test-user',
      connectionCount: 1,
      startCollaboration: mockStartCollaboration,
      stopCollaboration: vi.fn(),
      updateRoomId: vi.fn(),
      updateUserName: vi.fn(),
      generateNewUserName: vi.fn(),
      generateNewRoomName: vi.fn(),
      syncElements: vi.fn(),
      syncCursor: vi.fn(),
    });
    
    render(<CollaborativeExcalidrawBoard />);
    
    const trigger = screen.getByTestId('live-collaboration-trigger');
    fireEvent.click(trigger);
    
    expect(mockStartCollaboration).toHaveBeenCalledTimes(1);
  });

  it('should call stop collaboration when trigger is clicked while collaborating', async () => {
    const mockStopCollaboration = vi.fn();
    
    // Mock the hook to return collaborating state
    const { useCollaboration } = await import('../hooks/useCollaboration');
    vi.mocked(useCollaboration).mockReturnValue({
      isCollaborating: true,
      isConnected: true,
      roomId: 'test-room',
      userName: 'test-user',
      connectionCount: 2,
      startCollaboration: vi.fn(),
      stopCollaboration: mockStopCollaboration,
      updateRoomId: vi.fn(),
      updateUserName: vi.fn(),
      generateNewUserName: vi.fn(),
      generateNewRoomName: vi.fn(),
      syncElements: vi.fn(),
      syncCursor: vi.fn(),
    });
    
    render(<CollaborativeExcalidrawBoard />);
    
    const trigger = screen.getByTestId('live-collaboration-trigger');
    expect(trigger).toHaveTextContent('Stop Collaboration');
    expect(trigger).toHaveStyle({ backgroundColor: '#dc3545' });
    
    fireEvent.click(trigger);
    
    expect(mockStopCollaboration).toHaveBeenCalledTimes(1);
  });

  it('should still render the footer with collaboration status', () => {
    render(<CollaborativeExcalidrawBoard />);
    
    // Check that the footer is still rendered
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('should render both main menu and footer as children', () => {
    render(<CollaborativeExcalidrawBoard />);
    
    // Check that both main menu and footer are rendered as children
    expect(screen.getByTestId('main-menu')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
});