# Contract Interaction Patterns

This document analyzes the contract interaction patterns from the gachapon-widgets implementation that can be applied to the BlindMint SDK.

## Core Architecture

### Provider Management Pattern

The implementation uses a dual-provider approach with fallback strategies:

1. **Primary Provider**: `window.ManifoldEthereumProvider` (user's wallet)
2. **Fallback Provider**: `ManifoldBridgeProvider` (Manifold's infrastructure)

```typescript
// Provider instantiation pattern
protected _getContractInstance(withSigner = false, bridge = false, unchecked = false): Contract {
  if (bridge) {
    return new Contract(this.contractAddress, abi, this._getManifoldBridgeProvider());
  }
  const contract = window.ManifoldEthereumProvider.contractInstance(
    this.contractAddress,
    abi,
    withSigner,
    unchecked,
  );
  if (!contract) {
    throw new Error('No contract instance available, please refresh this page to try again');
  }
  return contract;
}
```

### Contract Class Structure

Both `ClaimExtensionContract` and `ERC20Contract` follow a consistent pattern:

```typescript
class ContractWrapper {
  private networkId: number;
  private contractAddress: string;
  private manifoldBridgeProvider: ManifoldBridgeProvider | undefined;

  constructor(networkId: number, contractAddress: string, ...otherParams) {
    this.networkId = networkId;
    this.contractAddress = contractAddress;
  }

  // Lazy initialization of bridge provider
  private _getManifoldBridgeProvider(): ManifoldBridgeProvider {
    if (!this.manifoldBridgeProvider) {
      this.manifoldBridgeProvider = markRaw(new ManifoldBridgeProvider(this.networkId));
    }
    return this.manifoldBridgeProvider;
  }
}
```

## Read Operations Pattern

### Resilient Read Calls with Timeout and Fallback

```typescript
async _callWeb3WithServerFallback(functionName: string, args: any[]): Promise<any> {
  const provider = window.ManifoldEthereumProvider.provider();
  if (!provider) {
    // No available provider failure scenario, use the server endpoint
    return this._getContractInstance(false, true)[functionName](...args);
  }
  try {
    // 1500ms timeout race condition
    const web3timeout = new Promise((resolve) => setTimeout(resolve, 1500));
    const web3result = new Promise(async (resolve) => {
      try {
        resolve(await this._getContractInstance(false)[functionName](...args));
      } catch {
        resolve(undefined);
      }
    });
    let result: any = await Promise.race([web3timeout, web3result]);
    if (result === undefined) {
      // Fallback provider failure scenario, use the server endpoint
      result = await this._getContractInstance(false, true)[functionName](...args);
    }
    return result;
  } catch (e) {
    // try getting from server instead
    return await this._getContractInstance(false, true)[functionName](...args);
  }
}
```

### Key Read Operations

**Claim Data Retrieval:**
```typescript
async getClaim(spec: ClaimType): Promise<Gachapon> {
  const claimArray = await this._callWeb3WithServerFallback('getClaim', [
    this.creatorContractAddress,
    this.claimIndex,
  ]);
  return this.processResult(claimArray, spec);
}
```

**ERC20 Operations:**
```typescript
async getAllowance(spender: string, owner: string): Promise<BigNumber> {
  return await this._callWeb3WithServerFallback('allowance', [owner, spender]);
}

async getERC20Symbol(): Promise<string> {
  return await this._callWeb3WithServerFallback('symbol', []);
}
```

## Write Operations Pattern

### Transaction Execution with Gas Estimation

```typescript
async mint(
  mintCount: number,
  paymentAmount: BigNumber = BigNumber.from(0),
  walletAddress: string,
): Promise<TransactionResponse> {
  let unchecked = false;
  try {
    // WalletConnect compatibility check
    unchecked = isWalletConnect();

    // Fee calculation
    const feeToUse = FEE_PER_MINT;
    paymentAmount = paymentAmount.add(feeToUse.mul(mintCount));
    
    // Gas estimation
    const gasLimit = await this.estimateGasMint(walletAddress, mintCount, paymentAmount);

    return await this._getContractInstance(true, false, unchecked).mintReserve(
      this.creatorContractAddress,
      this.claimIndex,
      mintCount,
      {
        value: paymentAmount,
        gasLimit,
      },
    );
  } catch (e: any) {
    return await this.errorHandling(e);
  }
}
```

### Gas Estimation Pattern

```typescript
async _estimateGas3WithServerFallback(
  functionSig: string,
  args: any[],
  skipChainCheck = false,
): Promise<BigNumber> {
  if (!skipChainCheck && this.networkId !== window.ManifoldEthereumProvider.chainId()) {
    throw new Error('Wrong Network');
  }
  let gasEstimate: BigNumber;
  try {
    // WalletConnect timeout handling
    if (isWalletConnect()) {
      gasEstimate = (await Promise.race([
        this._getContractInstance(true).estimateGas[functionSig](...args),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 1500);
        }),
      ])) as BigNumber;
    } else {
      gasEstimate = await this._getContractInstance(true).estimateGas[functionSig](...args);
    }
  } catch (e) {
    // get estimate from manifold bridge instead
    gasEstimate = await this._getContractInstance(true, true).estimateGas[functionSig](...args);
  }

  // 25% buffer for gas estimate accuracy
  gasEstimate = gasEstimate.mul((1 + 0.25) * 100).div(100);
  return gasEstimate;
}
```

## Error Handling Pattern

### Transaction Replacement Handling

```typescript
async errorHandling(error: ContractError) {
  if (error.code === 'TRANSACTION_REPLACED' && !error.cancelled && error.replacement) {
    const provider = window.ManifoldEthereumProvider.provider();
    if (!provider) {
      throw new Error('No web3 provider detected, please refresh the page and try again');
    }
    return await provider.getTransaction(error.replacement.hash);
  } else {
    throw error;
  }
}
```

## Data Transformation Pattern

### On-Chain to Client Data Mapping

```typescript
processResult(onChainData: OnChainGachaData, spec: ClaimType): Gachapon {
  if (spec.toLowerCase() === 'erc721') {
    throw new Error('TODO: implement ERC721');
  } else {
    // ERC1155 processing
    switch (this.lowerCaseExtensionAddress) {
      case GACHA_EXTENSION_1155_V1:
      case GACHA_EXTENSION_1155_V2:
        return {
          total: onChainData.total,
          totalMax: onChainData.totalMax === 0 ? null : onChainData.totalMax,
          walletMax: null,
          startDate: convertDateFromUnixSeconds(onChainData.startDate),
          endDate: convertDateFromUnixSeconds(onChainData.endDate),
          storageProtocol: onChainData.storageProtocol,
          merkleRoot: formatBytes32String(''),
          tokenVariations: onChainData.tokenVariations,
          startingTokenId: BigNumber.from(onChainData.startingTokenId),
          location: onChainData.location,
          tokenId: null,
          cost: onChainData.cost,
        };
      default:
        return DEFAULT_GACHAPON_STATE;
    }
  }
}
```

## Key Dependencies

- **ethers.js v5.7.0**: Primary blockchain interaction library
- **@manifoldxyz/manifold-provider-client**: Fallback provider infrastructure
- **BigNumber**: All numeric blockchain values use BigNumber for precision

## Applicable Patterns for BlindMint SDK

1. **Dual Provider Architecture**: Primary wallet + fallback Manifold provider
2. **Timeout-based Resilience**: 1500ms timeouts with fallback strategies
3. **Gas Estimation with Buffers**: 25% buffer on gas estimates
4. **WalletConnect Special Handling**: Different timeout and provider strategies
5. **Transaction Replacement Handling**: Handle replaced/cancelled transactions
6. **Lazy Provider Initialization**: Only create bridge providers when needed
7. **Network Validation**: Always validate network before operations
8. **Data Transformation Layer**: Clean separation between on-chain and client data structures