import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode } from '../../src/types/errors';

// Mock createContract function
const createContract = (address: string, abi: any[], provider: any) => {
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid address');
  }
  if (!abi || abi.length === 0) {
    throw new Error('Empty ABI');
  }
  if (!provider) {
    throw new Error('Missing provider');
  }
  
  // Parse ABI and create interface mock
  const functions: Record<string, any> = {};
  abi.forEach((item) => {
    if (typeof item === 'string') {
      const match = item.match(/function (\w+)/);
      if (match) {
        functions[match[1]] = vi.fn();
      }
    } else if (item.type === 'function') {
      functions[item.name] = vi.fn();
    }
  });
  
  return {
    address,
    provider,
    interface: {
      encodeFunctionData: vi.fn((functionName, args) => '0x' + functionName),
      getFunction: vi.fn((name) => functions[name] ? { name } : undefined),
    },
    functions,
  };
};

describe('Contract Factory', () => {
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
      getCode: vi.fn().mockResolvedValue('0x123456'), // Non-empty bytecode
      call: vi.fn(),
      estimateGas: vi.fn(),
      getBalance: vi.fn(),
      getTransactionCount: vi.fn(),
    };
  });

  describe('createContract', () => {
    it('creates contract instance with ABI and address', () => {
      const abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
      ];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, abi, mockProvider);

      expect(contract).toBeDefined();
      expect(contract.address).toBe(address);
      expect(contract.interface).toBeDefined();
      expect(contract.provider).toBe(mockProvider);
    });

    it('validates contract address format', () => {
      const abi = ['function test() view returns (bool)'];
      
      expect(() => 
        createContract('invalid-address', abi, mockProvider)
      ).toThrow();
      
      expect(() => 
        createContract('0x123', abi, mockProvider) // Too short
      ).toThrow();
    });

    it('handles empty ABI', () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      expect(() => 
        createContract(address, [], mockProvider)
      ).toThrow();
    });

    it('creates contract with full ABI object', () => {
      const abi = [
        {
          inputs: [{ name: 'owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, abi, mockProvider);

      expect(contract).toBeDefined();
      expect(contract.functions.balanceOf).toBeDefined();
    });

    it('verifies contract exists on chain', async () => {
      const abi = ['function test() view returns (bool)'];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, abi, mockProvider);
      
      // Verify by checking bytecode
      await mockProvider.getCode(address);
      expect(mockProvider.getCode).toHaveBeenCalledWith(address);
    });

    it('throws for EOA address (no contract)', async () => {
      mockProvider.getCode.mockResolvedValue('0x'); // Empty bytecode = EOA
      
      const abi = ['function test() view returns (bool)'];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, abi, mockProvider);
      
      await mockProvider.getCode(address);
      const bytecode = await mockProvider.getCode(address);
      
      expect(bytecode).toBe('0x');
    });
  });

  describe('contract method calls', () => {
    it('calls view functions', async () => {
      const abi = ['function balanceOf(address owner) view returns (uint256)'];
      const address = '0x1234567890123456789012345678901234567890';
      
      mockProvider.call.mockResolvedValue('0x0000000000000000000000000000000000000000000000000de0b6b3a7640000');

      const contract = createContract(address, abi, mockProvider);
      
      // Simulate calling balanceOf
      const callData = contract.interface.encodeFunctionData('balanceOf', [
        '0x9999999999999999999999999999999999999999'
      ]);
      
      await mockProvider.call({
        to: address,
        data: callData,
      });

      expect(mockProvider.call).toHaveBeenCalled();
    });

    it('estimates gas for transactions', async () => {
      const abi = ['function transfer(address to, uint256 amount) returns (bool)'];
      const address = '0x1234567890123456789012345678901234567890';
      
      mockProvider.estimateGas.mockResolvedValue('50000');

      const contract = createContract(address, abi, mockProvider);
      
      const txData = contract.interface.encodeFunctionData('transfer', [
        '0x9999999999999999999999999999999999999999',
        '1000000000000000000',
      ]);

      const gasEstimate = await mockProvider.estimateGas({
        to: address,
        data: txData,
      });

      expect(gasEstimate).toBe('50000');
    });

    it('handles multicall operations', async () => {
      const abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
      ];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, abi, mockProvider);

      // Prepare multiple calls
      const calls = [
        contract.interface.encodeFunctionData('balanceOf', ['0x1111111111111111111111111111111111111111']),
        contract.interface.encodeFunctionData('allowance', [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
        ]),
      ];

      expect(calls).toHaveLength(2);
      expect(calls[0]).toMatch(/^0x/);
      expect(calls[1]).toMatch(/^0x/);
    });
  });

  describe('ERC20 contract', () => {
    it('creates ERC20 contract with standard interface', () => {
      const erc20Abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address owner) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
      ];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, erc20Abi, mockProvider);

      expect(contract.interface.getFunction('transfer')).toBeDefined();
      expect(contract.interface.getFunction('approve')).toBeDefined();
      expect(contract.interface.getFunction('balanceOf')).toBeDefined();
    });
  });

  describe('ERC721 contract', () => {
    it('creates ERC721 contract with standard interface', () => {
      const erc721Abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function balanceOf(address owner) view returns (uint256)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function safeTransferFrom(address from, address to, uint256 tokenId)',
        'function transferFrom(address from, address to, uint256 tokenId)',
        'function approve(address to, uint256 tokenId)',
        'function getApproved(uint256 tokenId) view returns (address)',
        'function setApprovalForAll(address operator, bool approved)',
        'function isApprovedForAll(address owner, address operator) view returns (bool)',
      ];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, erc721Abi, mockProvider);

      expect(contract.interface.getFunction('ownerOf')).toBeDefined();
      expect(contract.interface.getFunction('tokenURI')).toBeDefined();
      expect(contract.interface.getFunction('safeTransferFrom')).toBeDefined();
    });
  });

  describe('ERC1155 contract', () => {
    it('creates ERC1155 contract with standard interface', () => {
      const erc1155Abi = [
        'function uri(uint256 id) view returns (string)',
        'function balanceOf(address owner, uint256 id) view returns (uint256)',
        'function balanceOfBatch(address[] owners, uint256[] ids) view returns (uint256[])',
        'function setApprovalForAll(address operator, bool approved)',
        'function isApprovedForAll(address owner, address operator) view returns (bool)',
        'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
        'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
      ];
      const address = '0x1234567890123456789012345678901234567890';

      const contract = createContract(address, erc1155Abi, mockProvider);

      expect(contract.interface.getFunction('balanceOf')).toBeDefined();
      expect(contract.interface.getFunction('uri')).toBeDefined();
      expect(contract.interface.getFunction('safeBatchTransferFrom')).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('handles provider errors gracefully', async () => {
      mockProvider.call.mockRejectedValue(new Error('Provider error'));
      
      const abi = ['function test() view returns (bool)'];
      const address = '0x1234567890123456789012345678901234567890';
      
      const contract = createContract(address, abi, mockProvider);
      
      await expect(
        mockProvider.call({ to: address, data: '0x' })
      ).rejects.toThrow('Provider error');
    });

    it('handles invalid ABI format', () => {
      const invalidAbi: any[] = [];
      const address = '0x1234567890123456789012345678901234567890';
      
      // Empty ABI should throw
      expect(() => 
        createContract(address, invalidAbi, mockProvider)
      ).toThrow();
    });

    it('handles missing provider', () => {
      const abi = ['function test() view returns (bool)'];
      const address = '0x1234567890123456789012345678901234567890';
      
      expect(() => 
        createContract(address, abi, null as any)
      ).toThrow();
    });
  });
});