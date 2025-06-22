import { Page, Locator, expect } from '@playwright/test';

export class BoardPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly excalidrawContainer: Locator;
  readonly connectionStatus: Locator;
  readonly connectionIndicator: Locator;
  readonly disconnectedOverlay: Locator;
  readonly reconnectButton: Locator;
  readonly shareRoomButton: Locator;
  readonly roomIdDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Excalidraw elements
    this.excalidrawContainer = page.locator('.excalidraw');
    this.canvas = page.locator('canvas').first();
    
    // UI elements
    this.connectionStatus = page.locator('text=/Status: (Connected|Connecting|Disconnected)/');
    this.connectionIndicator = page.locator('.absolute.top-4.right-4 .w-3.h-3.rounded-full');
    this.disconnectedOverlay = page.locator('text=Connection Lost').locator('..');
    this.reconnectButton = page.locator('button:has-text("Reconnect")');
    this.shareRoomButton = page.locator('button:has-text("Share Room")');
    this.roomIdDisplay = page.locator('text=/Room: [a-zA-Z0-9]+/');
  }

  async goto(roomId: string) {
    await this.page.goto(`/room/${roomId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForConnection(timeout: number = 10000) {
    // Wait for either connected or connecting status
    await expect(this.connectionStatus).toContainText(/Connected|Connecting/, { timeout });
    
    // If connecting, wait for connected
    const status = await this.connectionStatus.textContent();
    if (status?.includes('Connecting')) {
      await expect(this.connectionStatus).toContainText('Connected', { timeout });
    }
  }

  async waitForExcalidrawLoad() {
    // Wait for Excalidraw to be visible and ready
    await expect(this.excalidrawContainer).toBeVisible();
    await expect(this.canvas).toBeVisible();
    
    // Wait a bit more for Excalidraw to fully initialize
    await this.page.waitForTimeout(2000);
  }

  async drawRectangle(x: number, y: number, width: number, height: number) {
    // Click on rectangle tool
    const rectangleTool = this.page.locator('[data-testid="toolbar-rectangle"]');
    await rectangleTool.click();
    
    // Draw rectangle on canvas
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    const startX = canvasBox.x + x;
    const startY = canvasBox.y + y;
    const endX = startX + width;
    const endY = startY + height;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
    
    // Wait a moment for the shape to be created
    await this.page.waitForTimeout(500);
  }

  async drawCircle(x: number, y: number, radius: number) {
    // Click on ellipse tool
    const ellipseTool = this.page.locator('[data-testid="toolbar-ellipse"]');
    await ellipseTool.click();
    
    // Draw circle on canvas
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    const startX = canvasBox.x + x;
    const startY = canvasBox.y + y;
    const endX = startX + radius * 2;
    const endY = startY + radius * 2;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
    
    await this.page.waitForTimeout(500);
  }

  async clickCanvas(x: number, y: number) {
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    await this.page.mouse.click(canvasBox.x + x, canvasBox.y + y);
  }

  async getConnectionStatus(): Promise<string> {
    const statusText = await this.connectionStatus.textContent();
    if (statusText?.includes('Connected')) return 'connected';
    if (statusText?.includes('Connecting')) return 'connecting';
    if (statusText?.includes('Disconnected')) return 'disconnected';
    return 'unknown';
  }

  async getUserCount(): Promise<number> {
    const statusText = await this.connectionStatus.textContent();
    const match = statusText?.match(/Connected \((\d+) users?\)/);
    return match ? parseInt(match[1]) : 0;
  }

  async isDisconnectedOverlayVisible(): Promise<boolean> {
    return await this.disconnectedOverlay.isVisible();
  }

  async reconnect() {
    await this.reconnectButton.click();
    await this.waitForConnection();
  }

  async shareRoom() {
    await this.shareRoomButton.click();
    // Wait for clipboard operation
    await this.page.waitForTimeout(1000);
  }

  async getRoomId(): Promise<string> {
    const roomText = await this.roomIdDisplay.textContent();
    const match = roomText?.match(/Room: ([a-zA-Z0-9]+)/);
    return match ? match[1] : '';
  }
}