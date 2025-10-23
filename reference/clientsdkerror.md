# ClientSDKError

Base error class with typed error codes.

| Field    | Type   | Required |
| -------- | ------ | -------- |
| code     | number | ✅        |
| message  | string | ❌        |
| metadata | object | ❌        |

**Error Codes**

| Code                  | Description                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Network Errors**    |                                                                                                                     |
| UNSUPPORTED\_NETWORK  | Unsupported network                                                                                                 |
| **Data Errors**       |                                                                                                                     |
| NOT\_FOUND            | Resource not found                                                                                                  |
| INVALID\_INPUT        | Invalid parameters                                                                                                  |
| MISSING\_TOKENS       | Missing required tokens to purchase                                                                                 |
| UNSUPPORTED\_TYPE     | Unsupported product type (Only support the following types: AppType.Edition, AppType.BurnRedeem, AppType.BlindMInt) |
| **Blockchain Errors** |                                                                                                                     |
| ESTIMATION\_FAILED    | Can’t estimate gas                                                                                                  |
| TRANSACTION\_FAILED   | Transaction reverted                                                                                                |
| LEDGER\_ERROR         | Ledger wallet error                                                                                                 |
| TRANSACTION\_REVERTED | Transaction revert                                                                                                  |
| TRANSACTION\_REJECTED | User rejected                                                                                                       |
| INSUFFICIENT\_FUNDS   | Wallet does not have the required funds                                                                             |
| **Permission Errors** |                                                                                                                     |
| NOT\_ELIGIBLE         | Not eligible to purchase                                                                                            |
| SOLD\_OUT             | Product sold out                                                                                                    |
| LIMIT\_REACHED        | Limit reach for wallet                                                                                              |
| ENDED                 | Product not available anymore                                                                                       |
| NOT\_STARTED          | Not started, come back late                                                                                         |
