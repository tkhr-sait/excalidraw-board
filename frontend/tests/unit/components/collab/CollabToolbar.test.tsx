import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  it('should not disable join button when disconnected (UX improvement)', () => {
    render(<CollabToolbar {...defaultProps} isConnected={false} />);
    
    const joinButton = screen.getByRole('button', { name: /join room/i });
    expect(joinButton).not.toBeDisabled();
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

  it('should render status indicator with correct class', () => {
    const { rerender } = render(<CollabToolbar {...defaultProps} />);
    
    expect(document.querySelector('.status-indicator.connected')).toBeInTheDocument();
    
    rerender(<CollabToolbar {...defaultProps} isConnected={false} />);
    
    expect(document.querySelector('.status-indicator.disconnected')).toBeInTheDocument();
  });

  it('should show tooltip when disconnected', () => {
    render(<CollabToolbar {...defaultProps} isConnected={false} />);
    
    const joinButton = screen.getByRole('button', { name: /join room/i });
    expect(joinButton).toHaveAttribute('title', expect.stringContaining('Socket disconnected'));
  });
});