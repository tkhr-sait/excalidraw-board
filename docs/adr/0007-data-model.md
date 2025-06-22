# ADR-0007: データモデル定義

## ステータス
承認済み

## コンテキスト
excalidraw-boardプロジェクトで使用する全てのデータ構造を定義する。公式Excalidrawとの互換性を保ちながら、ローカル環境でのデータ永続化に最適化したモデル設計を行う。

## 基本データ型

### Excalidraw基本型

```typescript
// 基本座標型
export interface Point {
  readonly x: number;
  readonly y: number;
}

// 境界ボックス
export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

// 色情報
export type ColorValue = string; // #hex または transparent

// 要素ID型
export type ElementId = string;
export type FileId = string;
export type UserId = string;
export type RoomId = string;
```

## Excalidraw要素モデル

### 基本要素インターフェース

```typescript
// 全要素の基底インターフェース
export interface ExcalidrawElementBase {
  readonly id: ElementId;
  readonly type: ElementType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly angle: number;
  readonly strokeColor: ColorValue;
  readonly backgroundColor: ColorValue;
  readonly fillStyle: FillStyle;
  readonly strokeWidth: number;
  readonly strokeStyle: StrokeStyle;
  readonly roughness: number;
  readonly opacity: number;
  readonly groupIds: readonly GroupId[];
  readonly frameId: FrameId | null;
  readonly roundness: Roundness | null;
  readonly seed: number;
  readonly versionNonce: number;
  readonly isDeleted: boolean;
  readonly link: string | null;
  readonly locked: boolean;
  readonly index: FractionalIndex;
  readonly updated: number; // タイムスタンプ
  readonly created: number; // 作成日時
}

// 要素タイプ
export type ElementType = 
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'frame'
  | 'magicframe'
  | 'embeddable';
```

### 具体的要素型

```typescript
// 長方形
export interface ExcalidrawRectangleElement extends ExcalidrawElementBase {
  readonly type: 'rectangle';
}

// テキスト要素
export interface ExcalidrawTextElement extends ExcalidrawElementBase {
  readonly type: 'text';
  readonly text: string;
  readonly fontSize: number;
  readonly fontFamily: FontFamily;
  readonly textAlign: TextAlign;
  readonly verticalAlign: VerticalAlign;
  readonly baseline: number;
  readonly containerId: ElementId | null;
  readonly originalText: string;
  readonly lineHeight: number;
}

// 線・矢印要素
export interface ExcalidrawLinearElement extends ExcalidrawElementBase {
  readonly type: 'line' | 'arrow';
  readonly points: readonly Point[];
  readonly lastCommittedPoint: Point | null;
  readonly startBinding: PointBinding | null;
  readonly endBinding: PointBinding | null;
  readonly startArrowhead: Arrowhead | null;
  readonly endArrowhead: Arrowhead | null;
}

// 画像要素
export interface ExcalidrawImageElement extends ExcalidrawElementBase {
  readonly type: 'image';
  readonly fileId: FileId | null;
  readonly status: 'pending' | 'saved' | 'error';
  readonly scale: readonly [number, number];
}
```

## アプリケーション状態モデル

### AppState型定義

```typescript
export interface AppState {
  // 表示状態
  readonly viewBackgroundColor: ColorValue;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly zoom: Zoom;
  readonly theme: Theme;
  
  // 選択状態
  readonly selectedElementIds: Record<ElementId, true>;
  readonly selectedGroupIds: Record<GroupId, true>;
  readonly editingGroupId: GroupId | null;
  readonly editingElement: ExcalidrawElement | null;
  
  // ツール状態
  readonly activeTool: ToolType;
  readonly penMode: boolean;
  readonly penDetected: boolean;
  readonly exportBackground: boolean;
  readonly exportEmbedScene: boolean;
  readonly exportScale: number;
  readonly exportWithDarkMode: boolean;
  readonly gridSize: number | null;
  readonly showStats: boolean;
  
  // UI状態
  readonly openMenu: Menu | null;
  readonly openPopup: Popup | null;
  readonly openDialog: Dialog | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly toastMessage: string | null;
  
  // コラボレーション状態
  readonly collaborators: Map<UserId, Collaborator>;
  readonly showUsernames: boolean;
  readonly isBindingEnabled: boolean;
  readonly frameToHighlight: FrameId | null;
  readonly offsetLeft: number;
  readonly offsetTop: number;
  readonly width: number;
  readonly height: number;
}
```

## コラボレーションモデル

### ルームデータ構造

```typescript
// ルーム情報
export interface RoomData {
  readonly roomId: RoomId;
  readonly createdAt: number;
  readonly lastUpdated: number;
  readonly version: number;
  readonly maxUsers: number;
  readonly settings: RoomSettings;
  readonly scene: SceneData;
  readonly metadata: RoomMetadata;
}

// ルーム設定
export interface RoomSettings {
  readonly isPublic: boolean;
  readonly allowGuests: boolean;
  readonly maxFileSize: number; // bytes
  readonly maxElements: number;
  readonly enableVoiceChat: boolean;
  readonly autoSave: boolean;
  readonly autoSaveInterval: number; // ms
}

// シーンデータ
export interface SceneData {
  readonly elements: readonly ExcalidrawElement[];
  readonly appState: Partial<AppState>;
  readonly files: BinaryFiles;
  readonly commitToHistory: boolean;
  readonly scrollToContent: boolean;
}

// メタデータ
export interface RoomMetadata {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly thumbnailDataUrl: string | null;
  readonly elementCount: number;
  readonly lastActiveUsers: readonly UserId[];
}
```

### ユーザー・コラボレーター

```typescript
// ユーザー情報
export interface User {
  readonly id: UserId;
  readonly username: string;
  readonly email?: string;
  readonly avatarUrl?: string;
  readonly preferences: UserPreferences;
  readonly joinedAt: number;
}

// コラボレーター（リアルタイム情報）
export interface Collaborator {
  readonly id: UserId;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly color: ColorValue;
  readonly isActive: boolean;
  readonly lastSeen: number;
  readonly pointer: CollaboratorPointer | null;
  readonly selectedElementIds: readonly ElementId[];
  readonly followedBy: readonly UserId[];
  readonly following: UserId | null;
}

// ポインター情報
export interface CollaboratorPointer {
  readonly x: number;
  readonly y: number;
  readonly tool: ToolType;
  readonly selectedElementIds: readonly ElementId[];
}

// ユーザー設定
export interface UserPreferences {
  readonly theme: Theme;
  readonly gridMode: boolean;
  readonly snapToGrid: boolean;
  readonly showWelcomeScreen: boolean;
  readonly enableAutosave: boolean;
  readonly language: string;
}
```

## ファイル管理モデル

### バイナリファイル

```typescript
// ファイル情報
export interface BinaryFileData {
  readonly id: FileId;
  readonly dataURL: string;
  readonly mimeType: string;
  readonly size: number; // bytes
  readonly created: number;
  readonly lastAccessed: number;
}

// ファイルマップ
export type BinaryFiles = Record<FileId, BinaryFileData>;

// ファイルメタデータ
export interface FileMetadata {
  readonly id: FileId;
  readonly originalName: string;
  readonly type: 'image' | 'document';
  readonly size: number;
  readonly checksum: string; // ハッシュ値
  readonly uploadedBy: UserId;
  readonly uploadedAt: number;
  readonly roomId: RoomId;
  readonly elementIds: readonly ElementId[]; // 使用している要素
}
```

## 通信メッセージモデル

### WebSocketメッセージ

```typescript
// ベースメッセージ型
export interface BaseMessage {
  readonly type: string;
  readonly timestamp: number;
  readonly senderId: UserId;
}

// ルーム関連メッセージ
export interface JoinRoomMessage extends BaseMessage {
  readonly type: 'join-room';
  readonly roomId: RoomId;
  readonly username: string;
}

export interface LeaveRoomMessage extends BaseMessage {
  readonly type: 'leave-room';
  readonly roomId: RoomId;
}

// データ同期メッセージ
export interface ElementsUpdateMessage extends BaseMessage {
  readonly type: 'elements-update';
  readonly roomId: RoomId;
  readonly elements: readonly ExcalidrawElement[];
  readonly deletedElementIds: readonly ElementId[];
  readonly version: number;
}

export interface SceneUpdateMessage extends BaseMessage {
  readonly type: 'scene-update';
  readonly roomId: RoomId;
  readonly scene: SceneData;
  readonly version: number;
}

// リアルタイム情報メッセージ
export interface PointerUpdateMessage extends BaseMessage {
  readonly type: 'pointer-update';
  readonly roomId: RoomId;
  readonly pointer: CollaboratorPointer;
}

export interface ViewportUpdateMessage extends BaseMessage {
  readonly type: 'viewport-update';
  readonly roomId: RoomId;
  readonly viewport: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly zoom: number;
  };
}
```

## 永続化データモデル

### JSONファイル構造

```typescript
// ルームデータファイル ({roomId}.json)
export interface PersistedRoomData {
  readonly version: number;
  readonly roomId: RoomId;
  readonly createdAt: number;
  readonly lastUpdated: number;
  readonly scene: {
    readonly elements: readonly ExcalidrawElement[];
    readonly appState: Partial<AppState>;
  };
  readonly files: Record<FileId, {
    readonly id: FileId;
    readonly filename: string;
    readonly mimeType: string;
    readonly size: number;
    readonly checksum: string;
  }>;
  readonly metadata: RoomMetadata;
  readonly settings: RoomSettings;
}

// ユーザーセッション情報
export interface UserSession {
  readonly userId: UserId;
  readonly username: string;
  readonly roomId: RoomId;
  readonly joinedAt: number;
  readonly lastActivity: number;
  readonly isActive: boolean;
}
```

## バリデーションスキーマ

### 要素検証

```typescript
export class ElementValidator {
  static validateElement(element: any): element is ExcalidrawElement {
    return (
      typeof element.id === 'string' &&
      typeof element.type === 'string' &&
      typeof element.x === 'number' &&
      typeof element.y === 'number' &&
      typeof element.width === 'number' &&
      typeof element.height === 'number' &&
      typeof element.updated === 'number' &&
      element.updated > 0
    );
  }
  
  static validateElements(elements: any[]): elements is ExcalidrawElement[] {
    return Array.isArray(elements) && elements.every(this.validateElement);
  }
}

// ルームデータ検証
export class RoomDataValidator {
  static validateRoomId(roomId: any): roomId is RoomId {
    return (
      typeof roomId === 'string' &&
      roomId.length >= 3 &&
      roomId.length <= 64 &&
      /^[a-zA-Z0-9_-]+$/.test(roomId)
    );
  }
  
  static validateRoomData(data: any): data is RoomData {
    return (
      this.validateRoomId(data.roomId) &&
      typeof data.version === 'number' &&
      typeof data.createdAt === 'number' &&
      typeof data.lastUpdated === 'number' &&
      ElementValidator.validateElements(data.scene?.elements || [])
    );
  }
}
```

## 型ガード・ユーティリティ

### 型判定ヘルパー

```typescript
// 要素タイプ判定
export function isTextElement(element: ExcalidrawElement): element is ExcalidrawTextElement {
  return element.type === 'text';
}

export function isLinearElement(element: ExcalidrawElement): element is ExcalidrawLinearElement {
  return element.type === 'line' || element.type === 'arrow';
}

export function isImageElement(element: ExcalidrawElement): element is ExcalidrawImageElement {
  return element.type === 'image';
}

// メッセージタイプ判定
export function isElementsUpdate(message: any): message is ElementsUpdateMessage {
  return message.type === 'elements-update';
}

export function isPointerUpdate(message: any): message is PointerUpdateMessage {
  return message.type === 'pointer-update';
}
```

### データ変換ユーティリティ

```typescript
// 公式Excalidraw形式との相互変換
export class DataConverter {
  static toExcalidrawFormat(elements: ExcalidrawElement[]): any {
    return {
      type: 'excalidraw',
      version: 2,
      source: 'excalidraw-board',
      elements: elements,
      appState: {
        gridSize: null,
        viewBackgroundColor: '#ffffff'
      },
      files: {}
    };
  }
  
  static fromExcalidrawFormat(data: any): ExcalidrawElement[] {
    if (!data.elements || !Array.isArray(data.elements)) {
      throw new Error('Invalid Excalidraw data format');
    }
    
    return data.elements.filter(ElementValidator.validateElement);
  }
}
```

## 決定事項

1. **型安全性**: 完全なTypeScript型定義
2. **互換性**: 公式Excalidraw形式との互換性維持
3. **バリデーション**: 厳密な入力検証
4. **永続化**: JSON形式での効率的保存
5. **拡張性**: 将来の機能追加に対応した設計

## 影響

### 開発への影響
- 型安全なコード実装
- バリデーションによるデータ品質保証
- 公式互換性による移行容易性

### パフォーマンスへの影響
- 型チェックによる実行時エラー削減
- 効率的なデータ構造設計
- メモリ使用量の最適化

## 次のステップ

1. 型定義ファイルの実装
2. バリデーター実装
3. データ変換ユーティリティ実装
4. テストデータの作成