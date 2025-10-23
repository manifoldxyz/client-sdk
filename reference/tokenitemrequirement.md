# TokenItemRequirement

| Field           | Type      | Required | Description                     |
| --------------- | --------- | -------- | ------------------------------- |
| quantity        | number    | ✅        | Required quantity of tokens     |
| burnSpec        | enum      | ✅        | `manifold`                      |
| tokenSpec       | enum      | ✅        | `erc721`                        |
| tokenIds        | string\[] | ❌        | list of required tokenIds       |
| maxTokenId      | string    | ❌        | Max tokenId range               |
| minTokenId      | string    | ❌        | Min tokenId range               |
| contractAddress | string    | ✅        | The required contract address   |
| merkleRoot      | string    | ❌        | For allowlist token requirement |
| validationType  | enum      | ✅        | `contract`                      |
