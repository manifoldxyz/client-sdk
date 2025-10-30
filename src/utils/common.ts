import type { Contract, ManifoldContract } from '../types';
import { URLs } from '@manifoldxyz/js-ts-utils';

export const convertManifoldContractToContract = (
  manifoldContract: ManifoldContract,
  workspaceSlug: string,
): Contract => {
  return {
    ...manifoldContract,
    explorer: {
      manifoldUrl: URLs.getManifoldContractURL({
        workspaceIdentifier: workspaceSlug || '',
        contractId: manifoldContract.id.toString(),
      }),
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
