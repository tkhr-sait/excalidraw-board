// Simplified types for Excalidraw integration
export type ExcalidrawElement = any;
export type AppState = any;
export type BinaryFiles = any;
export type ExcalidrawImperativeAPI = any;


export interface SceneData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

export interface CollaboratorData {
  id: string;
  username: string;
  pointer?: { x: number; y: number };
  selectedElementIds?: string[];
}