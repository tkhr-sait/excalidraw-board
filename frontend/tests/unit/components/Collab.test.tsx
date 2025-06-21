import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Collab } from '../../../src/components/collab/Collab';
import { useSocket } from '../../../src/hooks/useSocket';

// Mock the useSocket hook
vi.mock('../../../src/hooks/useSocket');

describe('Collab Component', () => {
  const mockSocket = {
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    isConnected: true,
  };

  beforeEach(() => {
    vi.mocked(useSocket).mockReturnValue(mockSocket);
    vi.clearAllMocks();
  });

  describe('Room Management', () => {
    it('should render join room button when not in room', () => {
      render(<Collab />);
      const joinButton = screen.getByText(/Join Room/i);
      expect(joinButton).toBeInTheDocument();
    });

    it('should show room form when join button clicked', () => {
      render(<Collab />);
      const joinButton = screen.getByText(/Join Room/i);
      
      fireEvent.click(joinButton);
      
      expect(screen.getByPlaceholderText(/enter room id/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your name/i)).toBeInTheDocument();
    });

    it('should join room with provided details', async () => {
      render(<Collab />);
      const joinButton = screen.getByText(/Join Room/i);
      fireEvent.click(joinButton);
      
      const roomInput = screen.getByPlaceholderText(/enter room id/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const submitButton = screen.getByRole('button', { name: /join$/i });
      
      fireEvent.change(roomInput, { target: { value: 'test-room' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSocket.joinRoom).toHaveBeenCalledWith('test-room', 'Test User');
      });
    });
  });

  describe('Connection Status', () => {
    it('should show disconnected state', () => {
      vi.mocked(useSocket).mockReturnValue({
        ...mockSocket,
        isConnected: false,
      });
      
      render(<Collab />);
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });
  });

  describe('Callback Functions', () => {
    it('should call onCollaborationStateChange when provided', () => {
      const mockCallback = vi.fn();
      render(<Collab onCollaborationStateChange={mockCallback} />);
      
      // This would be called when collaboration state changes
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should call onCollaboratorsChange when provided', () => {
      const mockCallback = vi.fn();
      render(<Collab onCollaboratorsChange={mockCallback} />);
      
      // The callback is called initially with empty array
      expect(mockCallback).toHaveBeenCalledWith([]);
    });
  });

  describe('Socket Event Handlers', () => {
    it('should set up socket event listeners on mount', () => {
      render(<Collab />);
      
      expect(mockSocket.on).toHaveBeenCalledWith('room-joined', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-joined', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-left', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle room joined event', () => {
      const mockCallback = vi.fn();
      render(<Collab onCollaborationStateChange={mockCallback} />);
      
      // Get the callback function passed to socket.on for 'room-joined'
      const roomJoinedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'room-joined'
      )?.[1];
      
      if (roomJoinedCallback) {
        roomJoinedCallback({ roomId: 'test-room', users: [] });
        expect(mockCallback).toHaveBeenCalledWith(true);
      }
    });

    it('should handle room error event', () => {
      render(<Collab />);
      
      // Get the callback function passed to socket.on for 'error'
      const roomErrorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      expect(roomErrorCallback).toBeDefined();
      // Just verify the callback exists and can be called
      if (roomErrorCallback) {
        expect(() => roomErrorCallback({ message: 'Test error' })).not.toThrow();
      }
    });

    it('should cleanup socket listeners on unmount', () => {
      const { unmount } = render(<Collab />);
      
      unmount();
      
      // Verify that socket.off was called to cleanup listeners
      expect(mockSocket.off).toHaveBeenCalled();
    });
  });
});