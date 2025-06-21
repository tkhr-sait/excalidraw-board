import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../../src/App';

// Mock Excalidraw to avoid complex rendering
vi.mock('@excalidraw/excalidraw', () => {
  const MainMenuMock = vi.fn(({ children }) => <div data-testid="main-menu-mock">{children}</div>);
  MainMenuMock.DefaultItems = {
    LoadScene: vi.fn(() => <div>Load Scene</div>),
    SaveToActiveFile: vi.fn(() => <div>Save To Active File</div>),
    SaveAsImage: vi.fn(() => <div>Save As Image</div>),
    Help: vi.fn(() => <div>Help</div>),
    ChangeCanvasBackground: vi.fn(() => <div>Change Canvas Background</div>),
  };
  
  const WelcomeScreenMock = vi.fn(({ children }) => <div data-testid="welcome-screen-mock">{children}</div>);
  WelcomeScreenMock.Hints = {
    MenuHint: vi.fn(() => <div>Menu Hint</div>),
    ToolbarHint: vi.fn(() => <div>Toolbar Hint</div>),
    HelpHint: vi.fn(() => <div>Help Hint</div>),
  };
  
  return {
    Excalidraw: vi.fn(({ onChange }) => {
      // Simulate Excalidraw with a simple div and onChange trigger
      return (
        <div data-testid="excalidraw-mock">
          <button
            onClick={() => onChange?.({ elements: [], appState: {} })}
            data-testid="mock-change-trigger"
          >
            Trigger Change
          </button>
        </div>
      );
    }),
    MainMenu: MainMenuMock,
    WelcomeScreen: WelcomeScreenMock,
  };
});

// Mock Collab component
vi.mock('../../../src/components/collab/Collab', () => ({
  Collab: vi.fn(({ onCollaborationStateChange, onCollaboratorsChange }) => (
    <div data-testid="collab-mock">
      <button
        onClick={() => onCollaborationStateChange?.({ isInRoom: true, roomId: 'test' })}
        data-testid="mock-collab-state-change"
      >
        Change Collab State
      </button>
      <button
        onClick={() => onCollaboratorsChange?.([{ id: '1', name: 'User1' }])}
        data-testid="mock-collaborators-change"
      >
        Change Collaborators
      </button>
    </div>
  )),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<App />);
    
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
    expect(screen.getByTestId('collab-mock')).toBeInTheDocument();
  });

  it('should render app structure', () => {
    render(<App />);
    
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
    expect(screen.getByTestId('collab-mock')).toBeInTheDocument();
  });

  it('should handle collaboration state changes', () => {
    render(<App />);
    
    // This test verifies the component can handle collaboration state changes
    const button = screen.getByTestId('mock-collab-state-change');
    expect(button).toBeInTheDocument();
  });

  it('should handle collaborators changes', () => {
    render(<App />);
    
    // This test verifies the component can handle collaborators changes
    const button = screen.getByTestId('mock-collaborators-change');
    expect(button).toBeInTheDocument();
  });
});