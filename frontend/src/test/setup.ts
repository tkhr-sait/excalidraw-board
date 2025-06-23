import '@testing-library/jest-dom'
import React from 'react'

// Mock Excalidraw
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: ({ children, ...props }: any) => 
    React.createElement('div', { 'data-testid': 'excalidraw-mock', ...props }, children),
}));