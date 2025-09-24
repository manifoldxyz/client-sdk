/**
 * Stub implementation for @manifoldxyz/manifold-provider-client
 * This will be replaced with the actual package when available
 */

export interface ManifoldProviderConfig {
  apiKey?: string;
  baseUrl: string;
  timeout: number;
  retries: number;
}

export class ManifoldProvider {
  constructor(config: ManifoldProviderConfig) {
    // Stub implementation
  }

  async request(method: string, params: any[]): Promise<any> {
    throw new Error('ManifoldProvider: Actual implementation required');
  }
}

export default ManifoldProvider;