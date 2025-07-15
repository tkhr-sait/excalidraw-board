// Excalidraw types
export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  roughness?: number;
  opacity?: number;
  strokeSharpness?: string;
  seed?: number;
  version?: number;
  versionNonce?: number;
  isDeleted?: boolean;
  boundElements?: { id: string; type: string }[] | null;
  updated?: number;
  link?: string | null;
  locked?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  baseline?: number;
  containerId?: string | null;
  originalText?: string;
  // For linear elements
  points?: readonly [number, number][];
  lastCommittedPoint?: readonly [number, number];
  startBinding?: ElementBinding | null;
  endBinding?: ElementBinding | null;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
}

export interface ElementBinding {
  elementId: string;
  focus: number;
  gap: number;
}

export interface AppState {
  viewBackgroundColor?: string;
  currentItemStrokeColor?: string;
  currentItemBackgroundColor?: string;
  currentItemFillStyle?: string;
  currentItemStrokeWidth?: number;
  currentItemStrokeStyle?: string;
  currentItemRoughness?: number;
  currentItemOpacity?: number;
  currentItemFontFamily?: number;
  currentItemFontSize?: number;
  currentItemTextAlign?: string;
  currentItemStartArrowhead?: string | null;
  currentItemEndArrowhead?: string | null;
  currentItemLinearStrokeSharpness?: string;
  gridSize?: number | null;
  scrollX?: number;
  scrollY?: number;
  zoom?: number;
  openMenu?: string | null;
  lastPointerDownWith?: string;
  selectedElementIds?: { [id: string]: boolean };
  collaborators?: Map<string, { pointer?: { x: number; y: number } }>;
  userToFollow?: {
    socketId: string;
    username: string;
  } | null;
}

export interface BinaryFiles {
  [id: string]: {
    mimeType: string;
    dataURL: string;
    created: number;
    lastRetrieved?: number;
    id: string;
  };
}

export interface ExcalidrawImperativeAPI {
  getSceneElements: () => readonly ExcalidrawElement[];
  updateScene: (scene: {
    elements?: readonly ExcalidrawElement[];
    appState?: Partial<AppState>;
  }) => void;
  getAppState: () => Readonly<AppState>;
  history: {
    clear: () => void;
  };
  scrollToContent: (
    target?: readonly ExcalidrawElement[] | 'selection',
    opts?: {
      fitToContent?: boolean;
      animate?: boolean;
      duration?: number;
    }
  ) => void;
  refresh: () => void;
  // Check if getSceneElementsIncludingDeleted exists
  getSceneElementsIncludingDeleted?: () => readonly ExcalidrawElement[];
}

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
