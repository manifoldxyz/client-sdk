import { ethers } from 'ethers';
import type { Money } from '../types/money';

/**
 * Allowlist entry for building merkle trees
 */
export interface AllowlistEntry {
  address: string;
  maxQuantity?: number;
  price?: Money;
}

/**
 * Generated merkle proof for allowlist validation
 */
export interface AllowlistProof {
  merkleRoot: string;
  proof: string[];
  leaf: string;
  maxQuantity?: number;
  price?: Money;
}

// Removed unused MerkleNode interface

/**
 * Merkle tree implementation for allowlist validation
 */
export class MerkleTree {
  private leaves: string[];
  private layers: string[][];
  private root: string;

  constructor(leaves: string[]) {
    this.leaves = [...leaves].sort(); // Sort for deterministic tree structure
    this.layers = this.buildLayers(this.leaves);
    this.root = this.layers[this.layers.length - 1]?.[0] || '';
  }

  /**
   * Get the merkle root hash
   */
  getRoot(): string {
    return this.root;
  }

  /**
   * Get the merkle proof for a specific leaf
   */
  getProof(leaf: string): string[] {
    const leafIndex = this.leaves.indexOf(leaf);
    if (leafIndex === -1) {
      throw new Error(`Leaf ${leaf} not found in tree`);
    }

    const proof: string[] = [];
    let currentIndex = leafIndex;

    // Traverse up the tree, collecting sibling hashes
    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      if (!layer) continue;

      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < layer.length) {
        const sibling = layer[siblingIndex];
        if (sibling) {
          proof.push(sibling);
        }
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verify a merkle proof against the tree root
   */
  verify(proof: string[], leaf: string, root?: string): boolean {
    const targetRoot = root || this.root;
    let computedHash = leaf;

    for (const proofElement of proof) {
      if (computedHash <= proofElement) {
        computedHash = this.hash(computedHash, proofElement);
      } else {
        computedHash = this.hash(proofElement, computedHash);
      }
    }

    return computedHash === targetRoot;
  }

  /**
   * Build layers of the merkle tree
   */
  private buildLayers(leaves: string[]): string[][] {
    if (leaves.length === 0) {
      return [['']];
    }

    const layers: string[][] = [leaves];

    while ((layers[layers.length - 1]?.length || 0) > 1) {
      const currentLayer = layers[layers.length - 1];
      if (!currentLayer) break;

      const nextLayer: string[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        if (i + 1 < currentLayer.length) {
          const right = currentLayer[i + 1];
          if (left && right) {
            nextLayer.push(this.hash(left, right));
          }
        } else {
          // Odd number of elements - promote the last element to next layer
          if (left) {
            nextLayer.push(left);
          }
        }
      }

      layers.push(nextLayer);
    }

    return layers;
  }

  /**
   * Hash two elements together using keccak256
   */
  private hash(left: string, right: string): string {
    // Sort the pair to ensure deterministic ordering
    const [first, second] = left <= right ? [left, right] : [right, left];
    return ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32', 'bytes32'], [first, second]),
    );
  }
}

/**
 * Cache for storing merkle trees and proofs to improve performance
 */
class MerkleProofCache {
  private treeCache = new Map<string, MerkleTree>();
  private proofCache = new Map<string, AllowlistProof>();
  private readonly maxCacheSize = 100;

  /**
   * Get cached merkle tree by cache key
   */
  getTree(cacheKey: string): MerkleTree | null {
    return this.treeCache.get(cacheKey) || null;
  }

  /**
   * Set merkle tree in cache
   */
  setTree(cacheKey: string, tree: MerkleTree): void {
    if (this.treeCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.treeCache.keys().next().value;
      if (firstKey) {
        this.treeCache.delete(firstKey);
      }
    }
    this.treeCache.set(cacheKey, tree);
  }

  /**
   * Get cached proof by cache key
   */
  getProof(cacheKey: string): AllowlistProof | null {
    return this.proofCache.get(cacheKey) || null;
  }

  /**
   * Set proof in cache
   */
  setProof(cacheKey: string, proof: AllowlistProof): void {
    if (this.proofCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.proofCache.keys().next().value;
      if (firstKey) {
        this.proofCache.delete(firstKey);
      }
    }
    this.proofCache.set(cacheKey, proof);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.treeCache.clear();
    this.proofCache.clear();
  }
}

/**
 * Merkle proof service for allowlist validation in Edition products
 *
 * Provides utilities for generating and validating merkle proofs for allowlist eligibility.
 * Compatible with Solidity merkle proof verification using keccak256 hashing.
 *
 * @example
 * ```typescript
 * const allowlist = [
 *   { address: '0x123...', maxQuantity: 5 },
 *   { address: '0x456...', maxQuantity: 2 }
 * ];
 *
 * const tree = merkleProofService.buildMerkleTree(allowlist);
 * const proof = merkleProofService.generateProof(allowlist, '0x123...');
 * const isValid = merkleProofService.validateProof(proof.proof, proof.merkleRoot, proof.leaf);
 * ```
 */
export const merkleProofService = {
  /**
   * Private cache instance
   */
  _cache: new MerkleProofCache(),

  /**
   * Generate a merkle leaf hash for an address with optional parameters
   *
   * @param address - Ethereum address to hash
   * @param maxQuantity - Optional maximum quantity for allowlist entry
   * @param price - Optional price override for allowlist entry
   * @returns Keccak256 hash of the leaf data
   *
   * @example
   * ```typescript
   * const leaf = merkleProofService.hashLeaf('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7', 5);
   * console.log(leaf); // '0x...'
   * ```
   */
  hashLeaf(address: string, maxQuantity?: number, price?: Money): string {
    // Normalize address to lowercase for consistent hashing
    const normalizedAddress = address.toLowerCase();

    if (maxQuantity !== undefined && price !== undefined) {
      // Hash: address + maxQuantity + price (wei)
      return ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['address', 'uint256', 'uint256'],
          [normalizedAddress, maxQuantity, price.value.toString()],
        ),
      );
    } else if (maxQuantity !== undefined) {
      // Hash: address + maxQuantity
      return ethers.utils.keccak256(
        ethers.utils.solidityPack(['address', 'uint256'], [normalizedAddress, maxQuantity]),
      );
    } else {
      // Hash: address only
      return ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [normalizedAddress]));
    }
  },

  /**
   * Build a merkle tree from an allowlist
   *
   * @param allowlist - Array of allowlist entries
   * @returns MerkleTree instance
   *
   * @example
   * ```typescript
   * const allowlist = [
   *   { address: '0x123...', maxQuantity: 5 },
   *   { address: '0x456...', maxQuantity: 2 }
   * ];
   * const tree = merkleProofService.buildMerkleTree(allowlist);
   * console.log(tree.getRoot()); // '0x...'
   * ```
   */
  buildMerkleTree(allowlist: AllowlistEntry[]): MerkleTree {
    if (allowlist.length === 0) {
      throw new Error('Allowlist cannot be empty');
    }

    // Generate cache key based on allowlist contents
    const cacheKey = this._generateAllowlistCacheKey(allowlist);

    // Check cache first
    const cachedTree = this._cache.getTree(cacheKey);
    if (cachedTree) {
      return cachedTree;
    }

    // Generate leaves by hashing each allowlist entry
    const leaves = allowlist.map((entry) =>
      this.hashLeaf(entry.address, entry.maxQuantity, entry.price),
    );

    const tree = new MerkleTree(leaves);

    // Cache the result
    this._cache.setTree(cacheKey, tree);

    return tree;
  },

  /**
   * Generate a merkle proof for a specific address in an allowlist
   *
   * @param allowlist - Array of allowlist entries
   * @param targetAddress - Address to generate proof for
   * @returns AllowlistProof object with merkle root, proof, and leaf
   *
   * @throws Error if the target address is not found in the allowlist
   *
   * @example
   * ```typescript
   * const allowlist = [{ address: '0x123...', maxQuantity: 5 }];
   * const proof = merkleProofService.generateProof(allowlist, '0x123...');
   * console.log(proof.merkleRoot); // '0x...'
   * console.log(proof.proof); // ['0x...', '0x...']
   * ```
   */
  generateProof(allowlist: AllowlistEntry[], targetAddress: string): AllowlistProof {
    const normalizedAddress = targetAddress.toLowerCase();

    // Find the target entry in the allowlist
    const targetEntry = allowlist.find(
      (entry) => entry.address.toLowerCase() === normalizedAddress,
    );

    if (!targetEntry) {
      throw new Error(`Address ${targetAddress} not found in allowlist`);
    }

    // Generate cache key for this specific proof
    const cacheKey = this._generateProofCacheKey(allowlist, normalizedAddress);

    // Check cache first
    const cachedProof = this._cache.getProof(cacheKey);
    if (cachedProof) {
      return cachedProof;
    }

    // Build the merkle tree
    const tree = this.buildMerkleTree(allowlist);

    // Generate the leaf hash for the target address
    const leaf = this.hashLeaf(targetEntry.address, targetEntry.maxQuantity, targetEntry.price);

    // Generate the proof
    const proof = tree.getProof(leaf);

    const allowlistProof: AllowlistProof = {
      merkleRoot: tree.getRoot(),
      proof,
      leaf,
      maxQuantity: targetEntry.maxQuantity,
      price: targetEntry.price,
    };

    // Cache the result
    this._cache.setProof(cacheKey, allowlistProof);

    return allowlistProof;
  },

  /**
   * Validate a merkle proof against a root hash
   *
   * @param proof - Array of proof hashes
   * @param root - Merkle root hash to validate against
   * @param leaf - Leaf hash to verify
   * @returns True if the proof is valid
   *
   * @example
   * ```typescript
   * const isValid = merkleProofService.validateProof(
   *   ['0x...', '0x...'],
   *   '0x...',
   *   '0x...'
   * );
   * console.log(isValid); // true or false
   * ```
   */
  validateProof(proof: string[], root: string, leaf: string): boolean {
    try {
      // Create a temporary tree to use the verify method
      const tempTree = new MerkleTree([leaf]);
      return tempTree.verify(proof, leaf, root);
    } catch (error) {
      console.warn('Merkle proof validation failed:', error);
      return false;
    }
  },

  /**
   * Check if an address is eligible for an allowlist
   *
   * @param allowlist - Array of allowlist entries
   * @param address - Address to check
   * @returns Object with eligibility status and proof if eligible
   *
   * @example
   * ```typescript
   * const allowlist = [{ address: '0x123...', maxQuantity: 5 }];
   * const result = merkleProofService.checkEligibility(allowlist, '0x123...');
   * console.log(result.isEligible); // true
   * console.log(result.proof); // AllowlistProof object
   * ```
   */
  checkEligibility(
    allowlist: AllowlistEntry[],
    address: string,
  ): { isEligible: boolean; proof?: AllowlistProof; maxQuantity?: number; price?: Money } {
    const normalizedAddress = address.toLowerCase();

    const entry = allowlist.find((entry) => entry.address.toLowerCase() === normalizedAddress);

    if (!entry) {
      return { isEligible: false };
    }

    try {
      const proof = this.generateProof(allowlist, address);
      return {
        isEligible: true,
        proof,
        maxQuantity: entry.maxQuantity,
        price: entry.price,
      };
    } catch (error) {
      console.warn('Failed to generate proof for eligible address:', error);
      return { isEligible: false };
    }
  },

  /**
   * Clear the internal cache
   * Useful for memory management in long-running applications
   */
  clearCache(): void {
    this._cache.clear();
  },

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { treeCount: number; proofCount: number } {
    return {
      treeCount: this._cache['treeCache'].size,
      proofCount: this._cache['proofCache'].size,
    };
  },

  /**
   * Generate a cache key for an allowlist
   */
  _generateAllowlistCacheKey(allowlist: AllowlistEntry[]): string {
    // Sort entries for consistent cache keys
    const sortedEntries = [...allowlist].sort((a, b) =>
      a.address.toLowerCase().localeCompare(b.address.toLowerCase()),
    );

    const key = sortedEntries
      .map(
        (entry) =>
          `${entry.address.toLowerCase()}:${entry.maxQuantity || 0}:${entry.price?.value.toString() || '0'}`,
      )
      .join('|');

    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(key));
  },

  /**
   * Generate a cache key for a specific proof
   */
  _generateProofCacheKey(allowlist: AllowlistEntry[], address: string): string {
    const allowlistKey = this._generateAllowlistCacheKey(allowlist);
    return ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32', 'address'], [allowlistKey, address.toLowerCase()]),
    );
  },
};

export default merkleProofService;
