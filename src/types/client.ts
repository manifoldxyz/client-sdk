import type { HttpRPCs } from './common';
import type { Product } from './product';

export interface ClientConfig {
  httpRPCs?: HttpRPCs;
  debug?: boolean;
  environment?: string;
}

export interface ManifoldClient {
  getProduct(instanceIdOrUrl: string): Promise<Product>;
  getProductsByWorkspace(
    workspaceId: string,
    options?: WorkspaceProductsOptions,
  ): Promise<Product[]>;
}

export interface WorkspaceProductsOptions {
  limit?: number;
  offset?: number;
  sort?: 'latest' | 'oldest';
  networkId?: number;
  type?: 'edition' | 'burn-redeem' | 'blind-mint';
}
