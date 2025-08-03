export class FeatureFlags {
  // Check if image sharing is enabled via environment variable
  static isImageSharingEnabled(): boolean {
    // Check if we're in a browser environment (client-side)
    if (typeof window !== 'undefined') {
      // For client-side, check window.ENV which is injected by env-inject.sh
      return (
        (window as unknown as { ENV?: { VITE_FEATURE_COLLAB_IMAGE?: string } })
          .ENV?.VITE_FEATURE_COLLAB_IMAGE === 'true'
      );
    }

    // For server-side or when process.env is available
    return process.env.VITE_FEATURE_COLLAB_IMAGE === 'true';
  }
}
