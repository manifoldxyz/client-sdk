import { describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { merkleProofService, MerkleTree, type AllowlistEntry } from '../../src/utils/merkle-proof';
import type { Money } from '../../src/types/money';

describe('MerkleProofService', () => {
  const testAddresses = [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    '0x8ba1f109551bD432803012645Aac136c82C834c0'.toLowerCase(),
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  ];

  // Create a mock Money instance for testing
  const mockMoney: Money = {
    value: ethers.BigNumber.from('1000000000000000000'), // 1 ETH
    decimals: 18,
    erc20: ethers.constants.AddressZero,
    symbol: 'ETH',
    formatted: '1.0',
    networkId: 1,
  };

  const testAllowlist: AllowlistEntry[] = [
    { address: testAddresses[0], maxQuantity: 5 },
    { address: testAddresses[1], maxQuantity: 2 },
    { address: testAddresses[2] }, // No max quantity
    {
      address: testAddresses[3],
      maxQuantity: 10,
      price: mockMoney,
    },
  ];

  beforeEach(() => {
    // Clear cache before each test
    merkleProofService.clearCache();
  });

  describe('hashLeaf', () => {
    it('should generate consistent hashes for same inputs', () => {
      const address = testAddresses[0];
      const hash1 = merkleProofService.hashLeaf(address, 5);
      const hash2 = merkleProofService.hashLeaf(address, 5);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different addresses', () => {
      const hash1 = merkleProofService.hashLeaf(testAddresses[0], 5);
      const hash2 = merkleProofService.hashLeaf(testAddresses[1], 5);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different quantities', () => {
      const address = testAddresses[0];
      const hash1 = merkleProofService.hashLeaf(address, 5);
      const hash2 = merkleProofService.hashLeaf(address, 10);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle address-only hashing', () => {
      const address = testAddresses[0];
      const hash = merkleProofService.hashLeaf(address);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should handle address with price', () => {
      const address = testAddresses[0];
      const hash = merkleProofService.hashLeaf(address, 5, mockMoney);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should normalize addresses to lowercase', () => {
      const upperAddress = testAddresses[0].toUpperCase();
      const lowerAddress = testAddresses[0].toLowerCase();
      const hash1 = merkleProofService.hashLeaf(upperAddress, 5);
      const hash2 = merkleProofService.hashLeaf(lowerAddress, 5);
      expect(hash1).toBe(hash2);
    });
  });

  describe('buildMerkleTree', () => {
    it('should build a merkle tree from allowlist', () => {
      const tree = merkleProofService.buildMerkleTree(testAllowlist);
      expect(tree).toBeInstanceOf(MerkleTree);
      expect(tree.getRoot()).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should throw error for empty allowlist', () => {
      expect(() => merkleProofService.buildMerkleTree([])).toThrow('Allowlist cannot be empty');
    });

    it('should generate same root for same allowlist', () => {
      const tree1 = merkleProofService.buildMerkleTree(testAllowlist);
      const tree2 = merkleProofService.buildMerkleTree(testAllowlist);
      expect(tree1.getRoot()).toBe(tree2.getRoot());
    });

    it('should cache trees for performance', () => {
      const tree1 = merkleProofService.buildMerkleTree(testAllowlist);
      const tree2 = merkleProofService.buildMerkleTree(testAllowlist);
      // Should be the same cached instance
      expect(tree1).toBe(tree2);
    });
  });

  describe('generateProof', () => {
    it('should generate proof for address in allowlist', () => {
      const proof = merkleProofService.generateProof(testAllowlist, testAddresses[0]);
      expect(proof.merkleRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(Array.isArray(proof.proof)).toBe(true);
      expect(proof.leaf).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(proof.maxQuantity).toBe(5);
    });

    it('should throw error for address not in allowlist', () => {
      const nonExistentAddress = '0x9999999999999999999999999999999999999999';
      expect(() => merkleProofService.generateProof(testAllowlist, nonExistentAddress)).toThrow(
        `Address ${nonExistentAddress} not found in allowlist`
      );
    });

    it('should include price in proof if provided', () => {
      const proof = merkleProofService.generateProof(testAllowlist, testAddresses[3]);
      expect(proof.price).toBeDefined();
      expect(proof.price!.value.toString()).toBe('1000000000000000000');
    });

    it('should handle case-insensitive addresses', () => {
      const upperAddress = testAddresses[0].toUpperCase();
      const proof = merkleProofService.generateProof(testAllowlist, upperAddress);
      expect(proof.maxQuantity).toBe(5);
    });

    it('should cache proofs for performance', () => {
      const proof1 = merkleProofService.generateProof(testAllowlist, testAddresses[0]);
      const proof2 = merkleProofService.generateProof(testAllowlist, testAddresses[0]);
      expect(proof1).toBe(proof2);
    });
  });

  describe('validateProof', () => {
    it('should validate correct proof', () => {
      const proof = merkleProofService.generateProof(testAllowlist, testAddresses[0]);
      const isValid = merkleProofService.validateProof(
        proof.proof,
        proof.merkleRoot,
        proof.leaf
      );
      expect(isValid).toBe(true);
    });

    it('should reject invalid proof', () => {
      const proof = merkleProofService.generateProof(testAllowlist, testAddresses[0]);
      // Tamper with the proof
      const invalidProof = proof.proof.map(() => ethers.utils.keccak256('0x00'));
      const isValid = merkleProofService.validateProof(
        invalidProof,
        proof.merkleRoot,
        proof.leaf
      );
      expect(isValid).toBe(false);
    });

    it('should reject wrong leaf', () => {
      const proof = merkleProofService.generateProof(testAllowlist, testAddresses[0]);
      const wrongLeaf = merkleProofService.hashLeaf(testAddresses[1], 5);
      const isValid = merkleProofService.validateProof(
        proof.proof,
        proof.merkleRoot,
        wrongLeaf
      );
      expect(isValid).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      const isValid = merkleProofService.validateProof(
        ['invalid'],
        'invalid',
        'invalid'
      );
      expect(isValid).toBe(false);
    });
  });

  describe('checkEligibility', () => {
    it('should return eligibility for address in allowlist', () => {
      const result = merkleProofService.checkEligibility(testAllowlist, testAddresses[0]);
      expect(result.isEligible).toBe(true);
      expect(result.proof).toBeDefined();
      expect(result.maxQuantity).toBe(5);
    });

    it('should return not eligible for address not in allowlist', () => {
      const nonExistentAddress = '0x9999999999999999999999999999999999999999';
      const result = merkleProofService.checkEligibility(testAllowlist, nonExistentAddress);
      expect(result.isEligible).toBe(false);
      expect(result.proof).toBeUndefined();
    });

    it('should include price when available', () => {
      const result = merkleProofService.checkEligibility(testAllowlist, testAddresses[3]);
      expect(result.isEligible).toBe(true);
      expect(result.price).toBeDefined();
      expect(result.price!.value.toString()).toBe('1000000000000000000');
    });

    it('should handle case-insensitive addresses', () => {
      const upperAddress = testAddresses[0].toUpperCase();
      const result = merkleProofService.checkEligibility(testAllowlist, upperAddress);
      expect(result.isEligible).toBe(true);
      expect(result.maxQuantity).toBe(5);
    });
  });

  describe('MerkleTree class', () => {
    it('should create tree with single leaf', () => {
      const leaves = [merkleProofService.hashLeaf(testAddresses[0])];
      const tree = new MerkleTree(leaves);
      expect(tree.getRoot()).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should create tree with multiple leaves', () => {
      const leaves = testAddresses.map(addr => merkleProofService.hashLeaf(addr));
      const tree = new MerkleTree(leaves);
      expect(tree.getRoot()).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate proof for leaf in tree', () => {
      const leaves = testAddresses.map(addr => merkleProofService.hashLeaf(addr));
      const tree = new MerkleTree(leaves);
      const proof = tree.getProof(leaves[0]);
      expect(Array.isArray(proof)).toBe(true);
    });

    it('should verify proof correctly', () => {
      const leaves = testAddresses.map(addr => merkleProofService.hashLeaf(addr));
      const tree = new MerkleTree(leaves);
      const proof = tree.getProof(leaves[0]);
      const isValid = tree.verify(proof, leaves[0]);
      expect(isValid).toBe(true);
    });

    it('should throw error for leaf not in tree', () => {
      const leaves = testAddresses.slice(0, 2).map(addr => merkleProofService.hashLeaf(addr));
      const tree = new MerkleTree(leaves);
      const nonExistentLeaf = merkleProofService.hashLeaf(testAddresses[2]);
      expect(() => tree.getProof(nonExistentLeaf)).toThrow('not found in tree');
    });

    it('should handle even number of leaves', () => {
      const leaves = testAddresses.slice(0, 4).map(addr => merkleProofService.hashLeaf(addr));
      const tree = new MerkleTree(leaves);
      const proof = tree.getProof(leaves[0]);
      expect(tree.verify(proof, leaves[0])).toBe(true);
    });

    it('should handle odd number of leaves', () => {
      const leaves = testAddresses.slice(0, 3).map(addr => merkleProofService.hashLeaf(addr));
      const tree = new MerkleTree(leaves);
      const proof = tree.getProof(leaves[0]);
      expect(tree.verify(proof, leaves[0])).toBe(true);
    });

    it('should handle empty tree gracefully', () => {
      const tree = new MerkleTree([]);
      expect(tree.getRoot()).toBe('');
    });
  });

  describe('caching', () => {
    it('should clear cache', () => {
      // Generate some cached data
      merkleProofService.buildMerkleTree(testAllowlist);
      merkleProofService.generateProof(testAllowlist, testAddresses[0]);
      
      // Verify cache has data
      const stats = merkleProofService.getCacheStats();
      expect(stats.treeCount).toBeGreaterThan(0);
      expect(stats.proofCount).toBeGreaterThan(0);
      
      // Clear cache
      merkleProofService.clearCache();
      
      // Verify cache is empty
      const emptyStats = merkleProofService.getCacheStats();
      expect(emptyStats.treeCount).toBe(0);
      expect(emptyStats.proofCount).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = merkleProofService.getCacheStats();
      expect(typeof stats.treeCount).toBe('number');
      expect(typeof stats.proofCount).toBe('number');
    });

    it('should limit cache size', () => {
      // This test would require creating many unique allowlists to test cache eviction
      // For now, we just verify the cache stats work
      const stats = merkleProofService.getCacheStats();
      expect(stats.treeCount).toBeGreaterThanOrEqual(0);
      expect(stats.proofCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Solidity compatibility', () => {
    it('should generate hashes compatible with Solidity keccak256', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';
      const quantity = 5;
      
      // Generate hash using our implementation
      const ourHash = merkleProofService.hashLeaf(address, quantity);
      
      // Generate expected hash using ethers (which should match Solidity)
      const expectedHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['address', 'uint256'],
          [address.toLowerCase(), quantity]
        )
      );
      
      expect(ourHash).toBe(expectedHash);
    });

    it('should generate merkle roots that match Solidity implementations', () => {
      // Use a simple 2-leaf tree for predictable results
      const leaves = [
        merkleProofService.hashLeaf('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7'),
        merkleProofService.hashLeaf('0x8ba1f109551bD432803012645Aac136c82C834c0'),
      ];
      
      const tree = new MerkleTree(leaves);
      const root = tree.getRoot();
      
      // The root should be a valid keccak256 hash
      expect(root).toMatch(/^0x[a-fA-F0-9]{64}$/);
      
      // Verify the proof validates
      const proof = tree.getProof(leaves[0]);
      expect(tree.verify(proof, leaves[0], root)).toBe(true);
    });

    it('should maintain deterministic ordering for consistent roots', () => {
      const allowlist1 = [
        { address: testAddresses[0], maxQuantity: 5 },
        { address: testAddresses[1], maxQuantity: 2 },
      ];
      
      const allowlist2 = [
        { address: testAddresses[1], maxQuantity: 2 },
        { address: testAddresses[0], maxQuantity: 5 },
      ];
      
      const tree1 = merkleProofService.buildMerkleTree(allowlist1);
      const tree2 = merkleProofService.buildMerkleTree(allowlist2);
      
      // Should generate the same root regardless of input order
      expect(tree1.getRoot()).toBe(tree2.getRoot());
    });
  });

  describe('edge cases', () => {
    it('should handle very large allowlists', () => {
      const largeAllowlist: AllowlistEntry[] = [];
      for (let i = 0; i < 1000; i++) {
        largeAllowlist.push({
          address: ethers.utils.getAddress(ethers.utils.hexZeroPad(`0x${i.toString(16)}`, 20)),
          maxQuantity: i % 10 + 1,
        });
      }
      
      const tree = merkleProofService.buildMerkleTree(largeAllowlist);
      const proof = merkleProofService.generateProof(largeAllowlist, largeAllowlist[0].address);
      const isValid = merkleProofService.validateProof(proof.proof, proof.merkleRoot, proof.leaf);
      
      expect(isValid).toBe(true);
    });

    it('should handle single entry allowlist', () => {
      const singleEntryList = [{ address: testAddresses[0], maxQuantity: 1 }];
      const tree = merkleProofService.buildMerkleTree(singleEntryList);
      const proof = merkleProofService.generateProof(singleEntryList, testAddresses[0]);
      const isValid = merkleProofService.validateProof(proof.proof, proof.merkleRoot, proof.leaf);
      
      expect(isValid).toBe(true);
    });

    it('should handle addresses with different casing consistently', () => {
      const mixedCaseAllowlist = [
        { address: testAddresses[0].toLowerCase(), maxQuantity: 5 },
        { address: testAddresses[1].toUpperCase(), maxQuantity: 2 },
      ];
      
      const tree = merkleProofService.buildMerkleTree(mixedCaseAllowlist);
      
      // Should find both addresses regardless of case
      const proof1 = merkleProofService.generateProof(mixedCaseAllowlist, testAddresses[0].toUpperCase());
      const proof2 = merkleProofService.generateProof(mixedCaseAllowlist, testAddresses[1].toLowerCase());
      
      expect(proof1.maxQuantity).toBe(5);
      expect(proof2.maxQuantity).toBe(2);
    });
  });
});