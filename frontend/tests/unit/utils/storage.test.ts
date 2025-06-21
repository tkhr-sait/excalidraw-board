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