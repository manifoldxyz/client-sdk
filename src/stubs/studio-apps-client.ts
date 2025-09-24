/**
 * Stub implementation for @manifoldxyz/studio-apps-client
 * This will be replaced with the actual package when available
 */

export interface StudioAppsConfig {
  apiKey?: string;
  baseUrl: string;
  timeout: number;
}

export class StudioAppsClient {
  constructor(config: StudioAppsConfig) {
    // Stub implementation
  }

  async getBlindMintData(instanceId: string): Promise<any> {
    throw new Error('StudioAppsClient: Actual implementation required');
  }

  async getPreviewData(instanceId: string): Promise<any> {
    throw new Error('StudioAppsClient: Actual implementation required');
  }
}

export default StudioAppsClient;