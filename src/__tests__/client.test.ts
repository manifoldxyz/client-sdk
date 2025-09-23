import { describe, it, expect } from 'vitest';
import { createClient } from '../client';
import { AppType } from '../types/common';
import { ClientSDKError, ErrorCode } from '../types/errors';

describe('createClient', () => {
  it('should create a client with default config', () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(typeof client.getProduct).toBe('function');
    expect(typeof client.getProductsByWorkspace).toBe('function');
  });

  it('should create a client with custom config', () => {
    const client = createClient({
      debug: true,
      httpRPCs: {
        1: 'https://mainnet.infura.io/v3/test',
      },
    });
    expect(client).toBeDefined();
  });

  describe('getProduct', () => {
    it('should return a product for valid instance ID', async () => {
      const client = createClient();
      const product = await client.getProduct('4150231280');

      expect(product).toBeDefined();
      expect(product.id).toBe('4150231280');
      expect(Object.values(AppType)).toContain(product.type);
      expect(typeof product.name).toBe('string');
      expect(typeof product.contractAddress).toBe('string');
    });

    it('should parse Manifold URL and return product', async () => {
      const client = createClient();
      const url = 'https://manifold.xyz/@meta8eth/id/4150231280';
      const product = await client.getProduct(url);

      expect(product).toBeDefined();
      expect(product.id).toBe('4150231280');
    });

    it('should throw error for invalid URL', async () => {
      const client = createClient();
      const invalidUrl = 'https://invalid-url.com/test';

      await expect(client.getProduct(invalidUrl)).rejects.toThrow(ClientSDKError);
      await expect(client.getProduct(invalidUrl)).rejects.toMatchObject({
        code: ErrorCode.INVALID_INPUT,
      });
    });

    it('should throw error for invalid instance ID', async () => {
      const client = createClient();
      const invalidId = 'invalid-id';

      await expect(client.getProduct(invalidId)).rejects.toThrow(ClientSDKError);
      await expect(client.getProduct(invalidId)).rejects.toMatchObject({
        code: ErrorCode.INVALID_INPUT,
      });
    });
  });

  describe('getProductsByWorkspace', () => {
    it('should return array of products for valid workspace', async () => {
      const client = createClient();
      const products = await client.getProductsByWorkspace('test-workspace');

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);

      products.forEach((product) => {
        expect(product).toBeDefined();
        expect(typeof product.id).toBe('string');
        expect(Object.values(AppType)).toContain(product.type);
      });
    });

    it('should respect limit option', async () => {
      const client = createClient();
      const products = await client.getProductsByWorkspace('test-workspace', { limit: 5 });

      expect(products.length).toBe(5);
    });

    it('should throw error for invalid limit', async () => {
      const client = createClient();

      await expect(client.getProductsByWorkspace('test-workspace', { limit: 0 })).rejects.toThrow(
        ClientSDKError,
      );

      await expect(client.getProductsByWorkspace('test-workspace', { limit: 101 })).rejects.toThrow(
        ClientSDKError,
      );
    });
  });
});
