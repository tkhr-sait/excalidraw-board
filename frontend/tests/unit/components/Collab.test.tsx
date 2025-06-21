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
});