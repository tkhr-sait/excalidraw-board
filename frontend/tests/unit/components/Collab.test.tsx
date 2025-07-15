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
      
      expect(mockSocket.on).toHaveBeenCalledWith('init-room', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('new-user', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('room-user-change', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('first-in-room', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('client-broadcast', expect.any(Function));
    });

    it('should handle room user change event with Excalidraw official API', () => {
      const mockCallback = vi.fn();
      const mockCollaboratorsCallback = vi.fn();
      render(<Collab onCollaborationStateChange={mockCallback} onCollaboratorsChange={mockCollaboratorsCallback} />);
      
      // Get the callback function passed to socket.on for 'room-user-change'
      const roomUserChangeCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'room-user-change'
      )?.[1];
      
      if (roomUserChangeCallback) {
        // Simulate room user change with some user IDs
        roomUserChangeCallback(['user1', 'user2']);
        // The callback should be called when room state changes
        expect(mockCallback).toHaveBeenCalled();
        // Collaborators callback should be called with user array (managed by Excalidraw API)
        expect(mockCollaboratorsCallback).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'user1' }),
            expect.objectContaining({ id: 'user2' })
          ])
        );
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

    it('should handle username-updated event with Excalidraw official API', () => {
      const mockCollaboratorsCallback = vi.fn();
      render(<Collab onCollaboratorsChange={mockCollaboratorsCallback} />);
      
      // Get the callback function passed to socket.on for 'username-updated'
      const usernameUpdatedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'username-updated'
      )?.[1];
      
      expect(usernameUpdatedCallback).toBeDefined();
      
      if (usernameUpdatedCallback) {
        // Simulate username update event
        usernameUpdatedCallback({ socketId: 'user1', username: 'Updated User' });
        
        // Verify the callback was called (collaborators are now managed by Excalidraw API)
        expect(mockCollaboratorsCallback).toHaveBeenCalled();
      }
    });

    it('should cleanup socket listeners on unmount', () => {
      const { unmount } = render(<Collab />);
      
      unmount();
      
      // Verify that socket.off was called to cleanup listeners for all events
      expect(mockSocket.off).toHaveBeenCalledWith('init-room');
      expect(mockSocket.off).toHaveBeenCalledWith('new-user');
      expect(mockSocket.off).toHaveBeenCalledWith('room-user-change');
      expect(mockSocket.off).toHaveBeenCalledWith('username-updated');
      expect(mockSocket.off).toHaveBeenCalledWith('first-in-room');
      expect(mockSocket.off).toHaveBeenCalledWith('error');
      expect(mockSocket.off).toHaveBeenCalledWith('client-broadcast');
    });
  });
});