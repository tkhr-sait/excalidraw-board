import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveToLocalStorage, loadFromLocalStorage, clearLocalStorage } from '../../src/utils/storage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Storage Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveToLocalStorage', () => {
    it('should save scene data to localStorage', () => {
      const mockData = {
        elements: [],
        appState: {},
        files: {},
      };

      saveToLocalStorage(mockData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'excalidraw-board-scene',
        JSON.stringify(mockData)
      );
    });

    it('should handle save errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const mockData = {
        elements: [],
        appState: {},
        files: {},
      };

      saveToLocalStorage(mockData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save to localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('loadFromLocalStorage', () => {
    it('should load scene data from localStorage', () => {
      const mockData = {
        elements: [],
        appState: {},
        files: {},
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = loadFromLocalStorage();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('excalidraw-board-scene');
      expect(result).toEqual(mockData);
    });

    it('should return null when no data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = loadFromLocalStorage();

      expect(result).toBeNull();
    });

    it('should handle load errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = loadFromLocalStorage();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load from localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearLocalStorage', () => {
    it('should remove scene data from localStorage', () => {
      clearLocalStorage();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('excalidraw-board-scene');
    });
  });
});