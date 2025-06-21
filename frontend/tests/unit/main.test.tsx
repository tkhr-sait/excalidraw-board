import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';

// Mock React DOM
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

// Mock App component
vi.mock('../../src/App', () => ({
  default: () => <div data-testid="app">App</div>,
}));

// Mock CSS import
vi.mock('../../src/index.css', () => ({}));

describe('main.tsx', () => {
  it('should create root and render App', async () => {
    const mockRender = vi.fn();
    const mockCreateRoot = vi.mocked(createRoot);
    mockCreateRoot.mockReturnValue({ render: mockRender } as any);

    // Mock document.getElementById
    const mockDiv = document.createElement('div');
    vi.spyOn(document, 'getElementById').mockReturnValue(mockDiv);

    // Import main.tsx to trigger the initialization
    await import('../../src/main');

    expect(mockCreateRoot).toHaveBeenCalledWith(mockDiv);
    expect(mockRender).toHaveBeenCalled();
  });
});