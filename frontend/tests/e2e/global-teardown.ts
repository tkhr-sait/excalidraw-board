import { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Global E2E test teardown started');
  
  // Clean up any global resources if needed
  // For now, just log completion
  
  console.log('✅ Global E2E test teardown completed');
}

export default globalTeardown;