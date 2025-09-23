import { describe, it, expect } from 'vitest';
import { createMockProduct } from '../products/mock';
import { AppType } from '../types/common';
import type { EditionProduct, BurnRedeemProduct, BlindMintProduct } from '../types/product';

describe('Mock Products', () => {
  describe('Edition Product', () => {
    it('should create edition product for ID ending in 0', () => {
      const product = createMockProduct('1000') as EditionProduct;

      expect(product.type).toBe(AppType.Edition);
      expect(product.id).toBe('1000');
      expect(product.name).toContain('Mock Edition');
      expect(typeof product.price).toBe('bigint');
      expect(product.totalSupply).toBeDefined();
      expect(product.maxPerWallet).toBeDefined();
    });

    it('should check allocation correctly', async () => {
      const product = createMockProduct('1000') as EditionProduct;
      const allocation = await product.getAllocations({
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(allocation.isEligible).toBe(true);
      expect(allocation.quantity).toBeGreaterThan(0);
    });

    it('should prepare purchase correctly', async () => {
      const product = createMockProduct('1000') as EditionProduct;
      const prepared = await product.preparePurchase({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        payload: { quantity: 2 },
      });

      expect(prepared.isEligible).toBe(true);
      expect(prepared.cost).toBeDefined();
      expect(prepared.cost.total).toBeDefined();
      expect(prepared.steps.length).toBeGreaterThan(0);
    });

    it('should execute purchase correctly', async () => {
      const product = createMockProduct('1000') as EditionProduct;
      const prepared = await product.preparePurchase({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        payload: { quantity: 1 },
      });

      const order = await product.purchase({
        account: {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        },
        preparedPurchase: prepared,
      });

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.status).toBe('completed');
      expect(order.receipts.length).toBeGreaterThan(0);
    });
  });

  describe('Burn/Redeem Product', () => {
    it('should create burn/redeem product for ID ending in 1', () => {
      const product = createMockProduct('1001') as BurnRedeemProduct;

      expect(product.type).toBe(AppType.BurnRedeem);
      expect(product.id).toBe('1001');
      expect(product.name).toContain('Mock Burn/Redeem');
      expect(product.burnTokens).toBeDefined();
      expect(product.redeemTokens).toBeDefined();
    });

    it('should have multiple transaction steps for burn/redeem', async () => {
      const product = createMockProduct('1001') as BurnRedeemProduct;
      const prepared = await product.preparePurchase({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(prepared.steps.length).toBeGreaterThan(1);
      expect(prepared.steps.some((step) => step.type === 'approve')).toBe(true);
      expect(prepared.steps.some((step) => step.type === 'burn')).toBe(true);
    });
  });

  describe('Blind Mint Product', () => {
    it('should create blind mint product for ID ending in 2', () => {
      const product = createMockProduct('1002') as BlindMintProduct;

      expect(product.type).toBe(AppType.BlindMint);
      expect(product.id).toBe('1002');
      expect(product.name).toContain('Mock Blind Mint');
      expect(product.revealTime).toBeDefined();
      expect(product.maxSupply).toBeDefined();
    });

    it('should return active status', async () => {
      const product = createMockProduct('1002') as BlindMintProduct;
      const status = await product.getStatus();

      expect(status).toBe('active');
    });
  });

  describe('Product Status', () => {
    it('should return correct status for active edition', async () => {
      const product = createMockProduct('1000');
      const status = await product.getStatus();

      expect(['active', 'upcoming', 'completed', 'paused']).toContain(status);
    });
  });
});
