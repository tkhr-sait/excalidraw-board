import { Page, Locator, expect } from '@playwright/test';

export class ExcalidrawPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly toolbarRectangle: Locator;
  readonly toolbarEllipse: Locator;
  readonly toolbarArrow: Locator;
  readonly toolbarText: Locator;
  readonly toolbarSelection: Locator;
  readonly joinRoomButton: Locator;
  readonly leaveRoomButton: Locator;
  readonly connectionStatus: Locator;
  readonly collaboratorsList: Locator;
  readonly roomDialog: Locator;
  readonly roomIdInput: Locator;
  readonly usernameInput: Locator;
  readonly joinSubmitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('[data-testid="excalidraw-canvas"] canvas').first();
    // Excalidrawの実際のツールバーセレクターを使用
    this.toolbarRectangle = page.locator('.ToolIcon[data-testid="toolbar-rectangle"], button[data-testid="toolbar-rectangle"], [data-testid*="rectangle"], .Shape-rectangle, [title*="Rectangle"], [aria-label*="Rectangle"]').first();
    this.toolbarEllipse = page.locator('.ToolIcon[data-testid="toolbar-ellipse"], button[data-testid="toolbar-ellipse"], [data-testid*="ellipse"], .Shape-ellipse, [title*="Ellipse"], [aria-label*="Ellipse"]').first();
    this.toolbarArrow = page.locator('.ToolIcon[data-testid="toolbar-arrow"], button[data-testid="toolbar-arrow"], [data-testid*="arrow"], .Shape-arrow, [title*="Arrow"], [aria-label*="Arrow"]').first();
    this.toolbarText = page.locator('.ToolIcon[data-testid="toolbar-text"], button[data-testid="toolbar-text"], [data-testid*="text"], .Shape-text, [title*="Text"], [aria-label*="Text"]').first();
    this.toolbarSelection = page.locator('.ToolIcon[data-testid="toolbar-selection"], button[data-testid="toolbar-selection"], [data-testid*="selection"], .Shape-selection, [title*="Selection"], [aria-label*="Selection"]').first();
    this.joinRoomButton = page.locator('button').filter({ hasText: /Share|共有|Collaborate/i }).first();
    this.leaveRoomButton = page.locator('button').filter({ hasText: /Leave|退出/i }).first();
    this.connectionStatus = page.locator('.collab-footer-container .connection-status').first();
    this.collaboratorsList = page.locator('.collab-footer-container .collaborators-list').first();
    this.roomDialog = page.locator('.room-dialog-overlay');
    this.roomIdInput = page.locator('input[placeholder="Enter room ID"]');
    this.usernameInput = page.locator('input[placeholder="Enter your name"]');
    this.joinSubmitButton = page.locator('button[type="submit"]:has-text("Join")');
    this.cancelButton = page.locator('button:has-text("Cancel")');
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad() {
    await expect(this.page.locator('[data-testid="excalidraw-canvas"]')).toBeVisible();
    // Welcome screen対応
    try {
      const welcomeHint = this.page.locator('.welcome-screen-hint');
      if (await welcomeHint.isVisible({ timeout: 2000 })) {
        await this.page.keyboard.press('Escape');
        await welcomeHint.waitFor({ state: 'hidden', timeout: 2000 });
      }
    } catch {
      // Welcome screenが無い場合は無視
    }
  }

  async selectTool(tool: 'rectangle' | 'ellipse' | 'arrow' | 'text' | 'selection') {
    const toolMap = {
      rectangle: this.toolbarRectangle,
      ellipse: this.toolbarEllipse,
      arrow: this.toolbarArrow,
      text: this.toolbarText,
      selection: this.toolbarSelection,
    };
    
    await toolMap[tool].click();
    // ツールが選択されるまで少し待つ
    await this.page.waitForTimeout(500);
  }

  async drawRectangle(startX: number, startY: number, endX: number, endY: number) {
    await this.selectTool('rectangle');
    
    // Canvas上でドラッグ操作
    await this.canvas.hover({ position: { x: startX, y: startY } });
    await this.page.mouse.down();
    await this.canvas.hover({ position: { x: endX, y: endY } });
    await this.page.mouse.up();
    
    // 図形が描画されるまで待つ
    await this.page.waitForTimeout(500);
  }

  async drawEllipse(centerX: number, centerY: number, radiusX: number, radiusY: number) {
    await this.selectTool('ellipse');
    
    const startX = centerX - radiusX;
    const startY = centerY - radiusY;
    const endX = centerX + radiusX;
    const endY = centerY + radiusY;
    
    await this.canvas.hover({ position: { x: startX, y: startY } });
    await this.page.mouse.down();
    await this.canvas.hover({ position: { x: endX, y: endY } });
    await this.page.mouse.up();
    
    await this.page.waitForTimeout(500);
  }

  async addText(x: number, y: number, text: string) {
    await this.selectTool('text');
    await this.canvas.click({ position: { x, y } });
    
    // テキストエディタが表示されるまで待つ
    await this.page.waitForTimeout(500);
    
    await this.page.keyboard.type(text);
    await this.page.keyboard.press('Escape');
    
    await this.page.waitForTimeout(500);
  }

  async joinRoom(roomId: string, username: string) {
    await this.joinRoomButton.click();
    await expect(this.roomDialog).toBeVisible();
    
    await this.roomIdInput.fill(roomId);
    await this.usernameInput.fill(username);
    await this.joinSubmitButton.click();
    
    // 結果を待つ（成功または失敗）
    await this.page.waitForTimeout(3000);
  }

  async leaveRoom() {
    if (await this.leaveRoomButton.isVisible()) {
      await this.leaveRoomButton.click();
      await expect(this.joinRoomButton).toBeVisible();
    }
  }

  async waitForCollaborator(username: string, timeout: number = 10000) {
    await expect(
      this.collaboratorsList.locator(`text=${username}`)
    ).toBeVisible({ timeout });
  }

  async isConnected(): Promise<boolean> {
    try {
      const status = await this.connectionStatus.textContent({ timeout: 1000 });
      return status?.includes('Connected') || false;
    } catch {
      return false;
    }
  }

  async getElementsCount(): Promise<number> {
    try {
      return await this.page.evaluate(() => {
        const excalidrawAPI = (window as any).excalidrawAPI;
        if (excalidrawAPI && excalidrawAPI.getSceneElements) {
          return excalidrawAPI.getSceneElements().length;
        }
        // APIが利用できない場合は、DOM要素を数える（代替手段）
        const svgElements = document.querySelectorAll('svg .excalidraw-layer g');
        return svgElements.length;
      });
    } catch {
      return 0;
    }
  }

  async saveScene() {
    await this.page.keyboard.press('Control+s');
    await this.page.waitForTimeout(500);
  }

  async loadScene() {
    await this.page.keyboard.press('Control+o');
    await this.page.waitForTimeout(500);
  }

  async undo() {
    await this.page.keyboard.press('Control+z');
    await this.page.waitForTimeout(500);
  }

  async redo() {
    await this.page.keyboard.press('Control+y');
    await this.page.waitForTimeout(500);
  }

  async clearCanvas() {
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Delete');
    await this.page.waitForTimeout(500);
  }
}