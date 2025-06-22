import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Global E2E test setup started');

  // Check if backend is running
  try {
    const response = await fetch('http://localhost:3002');
    if (response.status === 200) {
      console.log('✅ Backend (excalidraw-room) is running on port 3002');
    } else {
      console.warn('⚠️ Backend responded but with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Backend (excalidraw-room) is not running on port 3002');
    console.error('Please start it with: docker start excalidraw-room');
    throw new Error('Backend server is required for E2E tests');
  }

  // Optionally warm up the application
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🔥 Warming up application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Give it a moment to fully load
    console.log('✅ Application warmed up successfully');
  } catch (error) {
    console.error('❌ Failed to warm up application:', error);
  } finally {
    await browser.close();
  }

  console.log('🎯 Global E2E test setup completed');
}

export default globalSetup;