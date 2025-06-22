import { Page, Locator, expect } from '@playwright/test';

export class WelcomePage {
  readonly page: Page;
  readonly createNewBoardButton: Locator;
  readonly roomIdInput: Locator;
  readonly joinRoomButton: Locator;
  readonly title: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1:has-text("Welcome to Excalidraw Board")');
    this.createNewBoardButton = page.locator('text=Create New Board');
    this.roomIdInput = page.locator('input[placeholder="Enter room ID"]');
    this.joinRoomButton = page.locator('text=Join Room');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async createNewRoom(): Promise<string> {
    await this.createNewBoardButton.click();
    await this.page.waitForURL(/\/room\/[a-zA-Z0-9]+/);
    
    // Extract room ID from URL
    const url = this.page.url();
    const match = url.match(/\/room\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error('Failed to extract room ID from URL');
    }
    
    return match[1];
  }

  async joinRoom(roomId: string) {
    await this.roomIdInput.fill(roomId);
    await this.joinRoomButton.click();
    await this.page.waitForURL(`/room/${roomId}`);
  }

  async joinRoomByEnter(roomId: string) {
    await this.roomIdInput.fill(roomId);
    await this.roomIdInput.press('Enter');
    await this.page.waitForURL(`/room/${roomId}`);
  }

  async waitForPageLoad() {
    await expect(this.title).toBeVisible();
    await expect(this.createNewBoardButton).toBeVisible();
  }
}