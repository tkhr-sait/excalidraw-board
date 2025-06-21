import type { SceneData } from '../types/excalidraw';

const STORAGE_KEY = 'excalidraw-board-scene';

export const saveToLocalStorage = (sceneData: SceneData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sceneData));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): SceneData | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

export const clearLocalStorage = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};