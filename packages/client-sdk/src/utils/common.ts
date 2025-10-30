import { URLs } from '@manifoldxyz/js-ts-utils';
import type { Contract, ManifoldContract } from '../types';

export const convertManifoldContractToContract = (
  manifoldContract: ManifoldContract,
  workspaceSlug?: string,
): Contract => {
  return {
    ...manifoldContract,
    explorer: {
      manifoldUrl: workspaceSlug
        ? URLs.getManifoldContractURL({
            workspaceIdentifier: workspaceSlug,
            contractId: manifoldContract.id.toString(),
          })
        : undefined,
      etherscanUrl: URLs.getEtherscanURLForContract(
        manifoldContract.networkId,
        manifoldContract.contractAddress,
      ),
      openseaUrl: URLs.getOpenSeaCollectionURL(
        manifoldContract.networkId,
        manifoldContract.contractAddress,
      ),
    },
  };
};
