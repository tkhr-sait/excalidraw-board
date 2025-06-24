import type { ExcalidrawElement, ExcalidrawImperativeAPI } from '../types/excalidraw';

/**
 * 同期用要素取得のためのユーティリティ関数
 * Excalidraw公式のコラボレーション実装に準拠した削除要素の扱い
 */

// 削除された要素を24時間保持する定数（Excalidraw公式と同じ）
export const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）

/**
 * 削除された要素も含む全要素を取得（最大24時間のタイムアウト付き）
 * getSceneElementsIncludingDeletedが利用可能な場合はそれを使用、
 * そうでない場合は履歴から最近削除された要素も含めて返す
 */
export function getSceneElementsIncludingDeleted(
  excalidrawAPI: ExcalidrawImperativeAPI,
  recentlyDeletedElements: Map<string, ExcalidrawElement> = new Map()
): readonly ExcalidrawElement[] {
  // 新しいAPIが利用可能な場合はそれを使用
  if (excalidrawAPI.getSceneElementsIncludingDeleted) {
    return excalidrawAPI.getSceneElementsIncludingDeleted();
  }
  
  // フォールバック: 通常の要素と最近削除された要素を結合
  const currentElements = excalidrawAPI.getSceneElements();
  const now = Date.now();
  
  // 24時間以内に削除された要素を取得
  const validRecentlyDeleted = Array.from(recentlyDeletedElements.values()).filter(element => {
    if (!element.updated) return false;
    return (now - element.updated) < DELETED_ELEMENT_TIMEOUT;
  });
  
  // 現在の要素と最近削除された要素を結合
  const allElements = [...currentElements];
  
  // 削除された要素で現在の要素に含まれていないものを追加
  validRecentlyDeleted.forEach(deletedElement => {
    if (!allElements.some(el => el.id === deletedElement.id)) {
      allElements.push(deletedElement);
    }
  });
  
  return allElements;
}

/**
 * 要素が同期対象かどうかを判定（削除タイムアウト考慮）
 */
export function isSyncableElement(element: ExcalidrawElement): boolean {
  // 削除されていない要素は常に同期対象
  if (!element.isDeleted) {
    return true;
  }
  
  // 削除された要素は24時間以内なら同期対象（他のコラボレーターに削除を伝播）
  const now = Date.now();
  const elementUpdated = element.updated;
  
  // 削除時刻が記録されていて、24時間以内なら同期対象
  if (elementUpdated && typeof elementUpdated === 'number') {
    const timeSinceDeletion = now - elementUpdated;
    return timeSinceDeletion < DELETED_ELEMENT_TIMEOUT;
  }
  
  // 削除時刻が不明な場合は同期しない（古い削除要素）
  return false;
}

/**
 * 最近削除された要素を管理するクラス
 */
export class RecentlyDeletedElementsTracker {
  private recentlyDeleted = new Map<string, ExcalidrawElement>();
  
  /**
   * 要素が削除されたときに呼び出す
   */
  markElementAsDeleted(element: ExcalidrawElement): void {
    const deletedElement: ExcalidrawElement = {
      ...element,
      isDeleted: true,
      updated: Date.now(),
    };
    this.recentlyDeleted.set(element.id, deletedElement);
  }
  
  /**
   * 複数の要素の削除状態を追跡
   */
  trackElementDeletions(
    previousElements: readonly ExcalidrawElement[],
    currentElements: readonly ExcalidrawElement[]
  ): void {
    const currentElementIds = new Set(currentElements.map(el => el.id));
    
    // 以前存在していたが今は存在しない要素を削除済みとしてマーク
    previousElements.forEach(prevElement => {
      if (!currentElementIds.has(prevElement.id)) {
        this.markElementAsDeleted(prevElement);
      }
    });
  }
  
  /**
   * 最近削除された要素のマップを取得
   */
  getRecentlyDeletedElements(): Map<string, ExcalidrawElement> {
    return new Map(this.recentlyDeleted);
  }
  
  /**
   * 期限切れの削除要素をクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.recentlyDeleted.forEach((element, id) => {
      if (element.updated && (now - element.updated) >= DELETED_ELEMENT_TIMEOUT) {
        toDelete.push(id);
      }
    });
    
    toDelete.forEach(id => this.recentlyDeleted.delete(id));
  }
  
  /**
   * 全ての削除要素をクリア
   */
  clear(): void {
    this.recentlyDeleted.clear();
  }
}