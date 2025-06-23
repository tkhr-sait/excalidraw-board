import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollabStatusIndicator } from '../../../../src/components/collab/CollabStatusIndicator';

describe('CollabStatusIndicator Component', () => {
  const defaultProps = {
    isConnected: true,
    isInRoom: false,
    roomId: null,
  };

  it('should show connected status when connected and not in room', () => {
    render(<CollabStatusIndicator {...defaultProps} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    const statusElement = screen.getByText('Connected').parentElement?.querySelector('.status-indicator.connected');
    expect(statusElement).toBeInTheDocument();
  });

  it('should show disconnected status when not connected', () => {
    render(<CollabStatusIndicator {...defaultProps} isConnected={false} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should show collaborating status when in room', () => {
    render(<CollabStatusIndicator {...defaultProps} isInRoom={true} roomId="test-room" />);
    
    expect(screen.getByText('Collaborating')).toBeInTheDocument();
    expect(screen.getByText('Room:')).toBeInTheDocument();
    expect(screen.getByText('test-room')).toBeInTheDocument();
  });

  it('should not show room info when not in room', () => {
    render(<CollabStatusIndicator {...defaultProps} />);
    
    expect(screen.queryByText('Room:')).not.toBeInTheDocument();
  });

  it('should not show room info when room ID is null', () => {
    render(<CollabStatusIndicator {...defaultProps} isInRoom={true} roomId={null} />);
    
    expect(screen.queryByText('Room:')).not.toBeInTheDocument();
  });
});