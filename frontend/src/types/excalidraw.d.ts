import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

export interface ExcalidrawBoardProps {
  onReady?: (api: ExcalidrawImperativeAPI) => void;
}