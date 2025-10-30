# Account

| Field             | Type     | Required | Description                                        |
| ----------------- | -------- | -------- | -------------------------------------------------- |
| address           | string   | ✅        | The Ethereum Address                               |
| sendTransaction() | function | ✅        | Send the given transaction to the blockchain       |
| signMessage()     | function | ✅        | Sign the given message and return the signature    |
| signTypedData()   | function | ✅        | Sign the given typed data and return the signature |
| getNetworkId      | number   | ✅        | Currently connected networkId                      |
| switchNetwork     | function | ✅        | Switch to target network                           |
