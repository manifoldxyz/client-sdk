# Money

| Field        | Type   | Required | Description                                                                  |
| ------------ | ------ | -------- | ---------------------------------------------------------------------------- |
| value        | BigInt | ✅        | The raw amount                                                               |
| decimals     | number | ✅        | Number of decimal places for the currency                                    |
| currency     | string | ✅        | `ETH`                                                                        |
| erc20        | string | ✅        | “0x0000000000000000000000000000000000000000” for native ETH or ERC20 address |
| symbol       | string | ✅        | `ETH`                                                                        |
| name         | string | ✅        | Name of the currency                                                         |
| formatted    | string | ✅        | The formatted amount (Ex: “0.1 ETH” )                                        |
| formattedUSD | string | ✅        | The formatted amount in USD                                                  |
