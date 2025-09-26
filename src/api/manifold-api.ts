import type { InstancePreview, PublicInstance } from '@manifoldxyz/studio-apps-client';
import { StudioAppsClientForPublic } from '@manifoldxyz/studio-apps-client';
import { ClientSDKError, ErrorCode } from '../types/errors';

/**
 * Manifold API client using @manifoldxyz/studio-apps-client package
 * as per CON-2729 feedback
 */
export class ManifoldApiClient {
  private studioClient: StudioAppsClientForPublic;

  constructor() {
    // Initialize Studio Apps Client for public access
    const baseUrl = 'https://apps.api.manifoldxyz.dev';
    this.studioClient = new StudioAppsClientForPublic({
      baseUrl,
    });
  }

  /**
   * Fetch both instance and preview data in parallel
   */
  async getCompleteInstanceData<T>(instanceId: string): Promise<{
    instanceData: PublicInstance<T>;
    previewData: InstancePreview;
  }> {
    // Fetch both in parallel for performance
    const [instanceData, previewDatas] = (await Promise.all([
      this.studioClient.public.getInstance({ instanceId: Number(instanceId) }),
      this.studioClient.public.getPreviews({
        instanceIds: [instanceId],
      }),
    ])) as [PublicInstance<T>, { instancePreviews: InstancePreview[] }];
    const previewData = previewDatas.instancePreviews[0];

    if (!instanceData) {
      throw new ClientSDKError(ErrorCode.NOT_FOUND, `Instance with ID ${instanceId} not found`);
    }
    if (!previewData) {
      throw new ClientSDKError(
        ErrorCode.NOT_FOUND,
        `Preview data for instance ID ${instanceId} not found`,
      );
    }

    return { instanceData, previewData } as {
      instanceData: PublicInstance<T>;
      previewData: InstancePreview;
    };
  }
}

/**
 * Factory function to create Manifold API client
 */
export function createManifoldApiClient(): ManifoldApiClient {
  return new ManifoldApiClient();
}
